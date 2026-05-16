/**
 * 단계 4 분석 파이프라인 — v1.7 pipeline.py 의 run() 함수 TS 포팅.
 *
 * 입력: uploads(status='pending') row N개 (현재 로그인한 admin이 올린 것)
 * 출력: properties / customers / gongbu_documents / extractions INSERT
 *
 * 흐름:
 *   1. 인증 + admin 검증
 *   2. uploads(pending) 조회 — 등기·토지·건축 PDF + image (image는 분석 대상 아님)
 *   3. 3종 PDF 모두 있는지 검증 (없으면 400)
 *   4. Storage에서 PDF 다운로드 → pdf-parse → PII 마스킹
 *   5. Claude로 JSON 추출 3건
 *   6. ASR 코드 채번
 *   7. 트랜잭션-like 순서로 INSERT:
 *        a. customers (소유자)
 *        b. properties (asr_code)
 *        c. gongbu_documents (PDF 메타)
 *        d. extractions (Raw text + JSON)
 *        e. uploads → status='done', asr_code 채움
 *        f. uploads(image)의 storage_path를 properties.image_paths에 추가
 *   8. 실패 시 error_logs INSERT
 */
import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient, createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { extractFromPdf, type GongbuKind } from "@/lib/llm/extract";
import { generateAsrCode } from "@/lib/asr";
import { buildOwnerInsert, buildPropertyInsert } from "@/lib/property/mapper";

export const runtime = "nodejs";
export const maxDuration = 300; // Vercel: 5분 (Hobby plan은 60s, Pro는 300s)

type GongbuPdfTypes = "deungki" | "toji" | "geonchuk";

const GONGBU_DB_NAME: Record<GongbuPdfTypes, string> = {
  deungki: "등기부등본",
  toji: "토지대장",
  geonchuk: "건축물대장",
};

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();

  // 1) 인증 + admin
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 2) pending uploads 조회 (본인 업로드만)
  const { data: uploads, error: upErr } = await supabase
    .from("uploads")
    .select("id, file_type, storage_path, original_name, size_bytes, mime_type")
    .eq("uploader_id", user.id)
    .eq("status", "pending")
    .is("asr_code", null)
    .order("created_at", { ascending: true });

  if (upErr) {
    return NextResponse.json(
      { error: "uploads 조회 실패: " + upErr.message },
      { status: 500 },
    );
  }
  if (!uploads || uploads.length === 0) {
    return NextResponse.json(
      { error: "분석할 pending 업로드가 없습니다." },
      { status: 400 },
    );
  }

  // 3) 3종 PDF 검증
  const byType: Partial<Record<GongbuPdfTypes, (typeof uploads)[number]>> = {};
  const images: typeof uploads = [];
  for (const u of uploads) {
    if (u.file_type === "image") {
      images.push(u);
    } else if (u.file_type === "deungki" || u.file_type === "toji" || u.file_type === "geonchuk") {
      // 가장 최근 업로드 1건만 (사용자가 중복 업로드한 경우)
      byType[u.file_type] = u;
    }
  }
  const missing = (["deungki", "toji", "geonchuk"] as GongbuPdfTypes[]).filter(
    (t) => !byType[t],
  );
  if (missing.length > 0) {
    return NextResponse.json(
      {
        error:
          "필수 공부 누락: " +
          missing.map((t) => GONGBU_DB_NAME[t]).join(", "),
      },
      { status: 400 },
    );
  }

  // service_role 클라이언트 (Storage 다운로드 + 안전한 INSERT)
  const svc = createSupabaseServiceRoleClient();

  type StepLog = { step: string; ok: boolean; detail?: string; ms?: number };
  const steps: StepLog[] = [];
  const t0 = Date.now();

  async function logError(stage: string, message: string, payload?: unknown) {
    try {
      await svc.from("error_logs").insert({
        stage,
        severity: "ERROR",
        message,
        payload: (payload ?? null) as never,
        user_id: user!.id,
      });
    } catch {
      // 로그 실패는 무시
    }
  }

  try {
    // 4) Storage 다운로드 (PDF Buffer 만 확보, 텍스트 추출은 Claude가 직접)
    const pdfBuffers: Record<GongbuPdfTypes, Buffer> = {} as never;
    for (const t of ["deungki", "toji", "geonchuk"] as GongbuPdfTypes[]) {
      const upload = byType[t]!;
      const ts = Date.now();
      const { data: blob, error: dlErr } = await svc.storage
        .from("gongbu")
        .download(upload.storage_path);
      if (dlErr || !blob) {
        throw new Error(`Storage 다운로드 실패 (${t}): ${dlErr?.message}`);
      }
      const ab = await blob.arrayBuffer();
      pdfBuffers[t] = Buffer.from(ab);
      steps.push({
        step: `Storage 다운로드 ${t}`,
        ok: true,
        detail: `${(pdfBuffers[t].length / 1024).toFixed(1)} KB`,
        ms: Date.now() - ts,
      });
    }

    // 5) Claude PDF 추출 3건 (병렬). Claude가 직접 OCR + 구조화 + PII 마스킹.
    const tllm = Date.now();
    const [deungki, toji, geonchuk] = (await Promise.all(
      (["deungki", "toji", "geonchuk"] as GongbuKind[]).map((k) =>
        extractFromPdf(pdfBuffers[k], k),
      ),
    )) as [
      Record<string, unknown>,
      Record<string, unknown>,
      Record<string, unknown>,
    ];
    steps.push({
      step: "Claude PDF 추출 (3종 병렬, OCR+구조화)",
      ok: true,
      ms: Date.now() - tllm,
    });

    // 6) ASR 코드 채번
    const { asrCode, pnu } = await generateAsrCode(svc, toji);
    steps.push({ step: "ASR 코드 채번", ok: true, detail: asrCode });

    // 7) DB INSERT
    // 7-a) customer (소유자)
    const owner = buildOwnerInsert({
      deungki,
      geonchuk,
      asrCode,
      createdBy: user.id,
    });
    const { data: customerRow, error: cuErr } = await svc
      .from("customers")
      .insert(owner.payload)
      .select("id")
      .single();
    if (cuErr) throw new Error(`customers INSERT 실패: ${cuErr.message}`);
    steps.push({ step: "customers INSERT (소유자)", ok: true, detail: owner.name });

    // 7-b) properties
    const propInsert = buildPropertyInsert({
      deungki,
      toji,
      geonchuk,
      asrCode,
      pnu,
      ownerId: customerRow.id,
      agentId: user.id,
    });
    // image_paths 추가 (단계 1에서 업로드한 이미지)
    propInsert.image_paths = images.map((i) => i.storage_path);
    const { error: prErr } = await svc.from("properties").insert(propInsert);
    if (prErr) throw new Error(`properties INSERT 실패: ${prErr.message}`);
    steps.push({ step: "properties INSERT", ok: true, detail: asrCode });

    // 7-c) gongbu_documents 3건
    for (const t of ["deungki", "toji", "geonchuk"] as GongbuPdfTypes[]) {
      const upload = byType[t]!;
      const { error: gdErr } = await svc.from("gongbu_documents").insert({
        asr_code: asrCode,
        doc_type: t,
        storage_path: upload.storage_path,
        cost: t === "deungki" ? 700 : 0,
        attempts: 1,
        success: true,
        uploaded_by: user.id,
      });
      if (gdErr) throw new Error(`gongbu_documents INSERT 실패 (${t}): ${gdErr.message}`);
    }
    steps.push({ step: "gongbu_documents INSERT (3종)", ok: true });

    // 7-d) extractions 3건 (Raw text는 length만 저장 — DB 부피 줄이기)
    const extractedJsonMap: Record<GongbuPdfTypes, Record<string, unknown>> = {
      deungki,
      toji,
      geonchuk,
    };
    for (const t of ["deungki", "toji", "geonchuk"] as GongbuPdfTypes[]) {
      const upload = byType[t]!;
      // gongbu_documents.id 다시 조회
      const { data: gongbu } = await svc
        .from("gongbu_documents")
        .select("id")
        .eq("asr_code", asrCode)
        .eq("doc_type", t)
        .single();
      if (!gongbu) continue;

      const { error: exErr } = await svc.from("extractions").insert({
        gongbu_id: gongbu.id,
        asr_code: asrCode,
        doc_type: t,
        ocr_text: null, // PDF 직접 처리 모드: raw OCR 텍스트 미저장
        extracted_json: extractedJsonMap[t] as never,
        confidence: 92,
        llm_model: "claude-opus-4-7",
        prompt_version: "v2-pdf-direct",
      });
      if (exErr) throw new Error(`extractions INSERT 실패 (${t}): ${exErr.message}`);
    }
    steps.push({ step: "extractions INSERT (3종)", ok: true });

    // 7-e) uploads 상태 업데이트
    const allUploadIds = [
      ...(["deungki", "toji", "geonchuk"] as GongbuPdfTypes[]).map(
        (t) => byType[t]!.id,
      ),
      ...images.map((i) => i.id),
    ];
    const { error: uuErr } = await svc
      .from("uploads")
      .update({
        status: "done",
        asr_code: asrCode,
        processed_at: new Date().toISOString(),
      })
      .in("id", allUploadIds);
    if (uuErr) throw new Error(`uploads UPDATE 실패: ${uuErr.message}`);
    steps.push({ step: "uploads → done", ok: true });

    return NextResponse.json({
      ok: true,
      asrCode,
      pnu,
      totalMs: Date.now() - t0,
      steps,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    steps.push({ step: "FATAL", ok: false, detail: msg });
    await logError("04_발췌", msg, { steps });
    return NextResponse.json(
      { ok: false, error: msg, steps },
      { status: 500 },
    );
  }
}

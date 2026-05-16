/**
 * 단계 7 분석보고서 생성 endpoint (M6).
 *
 * POST /api/pipeline/report?asr=ASR-11710-000001&version=investor
 *
 * 흐름:
 *   1) 인증 + admin 검증
 *   2) 매물 row + 소유자 + 최신 합의시세 조회
 *   3) ReportPayload 빌드
 *   4) 전문가 종합의견 생성 (Claude API or template)
 *   5) DOCX 빌드 (Buffer)
 *   6) Supabase Storage `reports` 버킷 업로드
 *      경로: {YYYY-MM}/{ASR}/{version}_{timestamp}.docx
 *      (RLS: 'investor_' prefix면 회원 SELECT 허용)
 *   7) properties.attachment_paths 배열에 path append (중복 회피)
 *   8) workflow_stage 전이 (06_시세조사 → 07_분석보고서, 07_분석보고서/완료 유지)
 *   9) internal_note 한 줄 append
 *  10) 결과 반환 (signed URL 포함)
 */
import { NextResponse, type NextRequest } from "next/server";
import {
  createSupabaseServerClient,
  createSupabaseServiceRoleClient,
} from "@/lib/supabase/server";
import { buildReportPayload, type ReportVersion } from "@/lib/report/build";
import { buildReportDocx } from "@/lib/report/docx";
import { generateExpertOpinion } from "@/lib/report/opinion";
import { loadReportImages } from "@/lib/report/images";
import type { TablesUpdate } from "@/lib/supabase/types";

export const runtime = "nodejs";
export const maxDuration = 300;

type StepLog = { step: string; ok: boolean; detail?: string; ms?: number };

const SIGNED_URL_TTL_SEC = 60 * 60; // 1시간

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();

  // 1) 인증
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const asrCode = req.nextUrl.searchParams.get("asr");
  const versionRaw = (req.nextUrl.searchParams.get("version") ?? "investor").toLowerCase();
  const version: ReportVersion =
    versionRaw === "full" ? "full" : "investor";

  if (!asrCode) {
    return NextResponse.json(
      { error: "asr 파라미터가 필요합니다." },
      { status: 400 },
    );
  }

  const svc = createSupabaseServiceRoleClient();
  const steps: StepLog[] = [];
  const t0 = Date.now();

  try {
    // 2) 매물 + owner 조회
    const tProp = Date.now();
    const { data: prop, error: propErr } = await svc
      .from("properties")
      .select("*")
      .eq("asr_code", asrCode)
      .single();
    if (propErr || !prop) {
      return NextResponse.json(
        { error: "매물을 찾을 수 없습니다: " + asrCode },
        { status: 404 },
      );
    }

    let ownerName: string | null = null;
    if (prop.owner_id) {
      const { data: owner } = await svc
        .from("customers")
        .select("name")
        .eq("id", prop.owner_id)
        .maybeSingle();
      ownerName = owner?.name ?? null;
    }
    steps.push({
      step: "매물 + 소유자 조회",
      ok: true,
      detail: `${prop.property_type ?? "?"} ${prop.address_road ?? ""}`,
      ms: Date.now() - tProp,
    });

    // 3) 최신 합의시세
    const { data: latestConsensus } = await svc
      .from("price_history")
      .select("price, consensus_meta, unit_price_m2, recorded_at")
      .eq("asr_code", asrCode)
      .eq("is_consensus", true)
      .order("recorded_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    steps.push({
      step: "최신 합의시세 조회",
      ok: true,
      detail: latestConsensus
        ? `합의시세 ${(Number(latestConsensus.price) / 1e8).toFixed(2)}억`
        : "합의시세 row 없음 (sale_price 사용)",
    });

    // 4) ReportPayload 빌드
    const payload = buildReportPayload({
      property: prop,
      latestConsensus,
      ownerName,
      version,
    });
    steps.push({
      step: "ReportPayload 빌드",
      ok: true,
      detail: `${version} 버전, 합의시세 ${(payload.consensus_price / 1e8).toFixed(2)}억, 세금합계 ${payload.tax.total.toLocaleString()}원`,
    });

    // 4-b) 매물 사진 Storage 다운로드 (대상부동산/위치도1/위치도2 = image_paths[0..2])
    const tImg = Date.now();
    const imageSlots = await loadReportImages(svc, prop.image_paths ?? []);
    payload.images = imageSlots;
    const filledImgCount = imageSlots.filter((s) => s !== null).length;
    steps.push({
      step: "사진 다운로드 (3장 슬롯)",
      ok: true,
      detail:
        filledImgCount > 0
          ? `${filledImgCount}/3장 임베드 (나머지 슬롯 공란)`
          : "사진 없음 → 3슬롯 모두 공란 유지",
      ms: Date.now() - tImg,
    });

    // 5) 전문가 종합의견
    const tOp = Date.now();
    const opinion = await generateExpertOpinion({
      address: payload.address,
      property_type: payload.property_type,
      exclusive_m2: payload.exclusive_m2,
      floor_no: payload.floor_no,
      total_floors: payload.total_floors,
      built_year: payload.built_year,
      consensus_price: payload.consensus_price,
      risk_grade: payload.risk_grade,
      risk_summary: payload.risk_summary,
      building_name: payload.building_name,
      is_distressed: payload.is_distressed,
    });
    payload.expert_opinion = opinion;
    steps.push({
      step: "전문가 종합의견",
      ok: true,
      detail: `${opinion.source} (${opinion.text.length}자)`,
      ms: Date.now() - tOp,
    });

    // 6) DOCX 빌드
    const tDocx = Date.now();
    const docxBuf = await buildReportDocx(payload);
    steps.push({
      step: "DOCX 빌드",
      ok: true,
      detail: `${(docxBuf.byteLength / 1024).toFixed(1)} KB`,
      ms: Date.now() - tDocx,
    });

    // 7) Storage 업로드
    //    경로: {YYYY-MM}/{ASR}/{version}_{timestamp}.docx
    //    RLS: 'investor_' prefix면 회원도 SELECT 가능
    const yyyymm = new Date().toISOString().slice(0, 7); // 2026-05
    const stamp = new Date()
      .toISOString()
      .replace(/[-:T.Z]/g, "")
      .slice(0, 14); // 20260516223030
    const objectPath = `${yyyymm}/${asrCode}/${version}_${stamp}.docx`;
    const tUp = Date.now();
    const { error: upErr } = await svc.storage
      .from("reports")
      .upload(objectPath, docxBuf, {
        contentType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        upsert: false,
      });
    if (upErr) {
      throw new Error("Storage 업로드 실패: " + upErr.message);
    }
    steps.push({
      step: "Storage 업로드 (reports)",
      ok: true,
      detail: objectPath,
      ms: Date.now() - tUp,
    });

    // 8) 같은 버전 기존 보고서 자동 삭제 (정책: 재생성 시 같은 version 만 정리, 다른 version 은 보존)
    //    경로 컨벤션: {YYYY-MM}/{ASR}/{version}_{stamp}.docx
    //    → 마지막 파일명이 `${version}_` 로 시작하면 같은 버전.
    //    새로 업로드한 objectPath 자체는 보존.
    const existingPaths = prop.attachment_paths ?? [];
    const sameVersionStaleList = existingPaths.filter((p) => {
      if (p === objectPath) return false; // 방금 업로드한 새 파일은 보존
      const filename = p.split("/").pop() ?? "";
      return filename.startsWith(`${version}_`);
    });
    let staleRemoveOk = 0;
    let staleRemoveFail = 0;
    if (sameVersionStaleList.length > 0) {
      const { data: removed, error: rmErr } = await svc.storage
        .from("reports")
        .remove(sameVersionStaleList);
      if (rmErr) {
        // 일부 실패는 non-fatal — attachment_paths 에서는 정리하지 않고 남겨 사용자가 수동 삭제 가능
        staleRemoveFail = sameVersionStaleList.length;
      } else {
        staleRemoveOk = removed?.length ?? sameVersionStaleList.length;
      }
    }
    steps.push({
      step: "기존 동일 버전 보고서 정리",
      ok: staleRemoveFail === 0,
      detail:
        sameVersionStaleList.length === 0
          ? "기존 파일 없음"
          : `삭제 ${staleRemoveOk}/${sameVersionStaleList.length}건 (${version} 버전)`,
    });

    // 9) attachment_paths 갱신:
    //    - 같은 버전 stale 경로는 제거 (Storage 삭제 성공한 경우에만)
    //    - 새 경로 append (중복 회피)
    const removedSet = new Set(staleRemoveOk > 0 ? sameVersionStaleList : []);
    const filtered = existingPaths.filter((p) => !removedSet.has(p));
    const newPaths = filtered.includes(objectPath)
      ? filtered
      : [...filtered, objectPath];
    const propUpdate: TablesUpdate<"properties"> = {
      attachment_paths: newPaths,
    };
    // 워크플로우 전이: 05/06/07/완료 어느 단계든 → 완료 로 진행 (07 보고서 산출이 완료 조건)
    //    cf. 사용자가 다시 시세 갱신할 수도 있으므로 05·06에 있으면 07_분석보고서 거쳐 완료
    if (
      prop.workflow_stage === "05_입력" ||
      prop.workflow_stage === "06_시세조사" ||
      prop.workflow_stage === "07_분석보고서"
    ) {
      propUpdate.workflow_stage = "완료";
    }
    const { error: updateErr } = await svc
      .from("properties")
      .update(propUpdate)
      .eq("asr_code", asrCode);
    if (updateErr) {
      throw new Error(
        "properties UPDATE 실패 (attachment_paths): " + updateErr.message,
      );
    }
    steps.push({
      step: "properties UPDATE",
      ok: true,
      detail: `attachment_paths 총 ${newPaths.length}개 (−${removedSet.size} +1) / workflow ${propUpdate.workflow_stage ?? prop.workflow_stage}`,
    });

    // 9) internal_note append
    const today = new Date().toISOString().slice(0, 10);
    const note =
      `[07분석보고서|${today}] ${version} 버전 생성 ` +
      `(합의시세 ${(payload.consensus_price / 1e8).toFixed(2)}억, ` +
      `세금합계 ${payload.tax.total.toLocaleString()}원). ` +
      `storage: ${objectPath}`;
    await svc.rpc("append_internal_note", {
      p_asr_code: asrCode,
      p_note: note,
    });
    steps.push({ step: "internal_note append", ok: true, detail: note });

    // 10) signed URL (1시간)
    const { data: signed } = await svc.storage
      .from("reports")
      .createSignedUrl(objectPath, SIGNED_URL_TTL_SEC);
    const signedUrl = signed?.signedUrl ?? null;

    return NextResponse.json({
      ok: true,
      asrCode,
      version,
      storage_path: objectPath,
      signed_url: signedUrl,
      signed_url_expires_in_sec: SIGNED_URL_TTL_SEC,
      size_bytes: docxBuf.byteLength,
      attachment_paths: newPaths,
      consensus_price: payload.consensus_price,
      tax_total: payload.tax.total,
      opinion_source: opinion.source,
      totalMs: Date.now() - t0,
      steps,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    steps.push({ step: "FATAL", ok: false, detail: msg });
    try {
      await svc.from("error_logs").insert({
        asr_code: asrCode,
        stage: "07_분석보고서",
        severity: "ERROR",
        message: msg,
        payload: { steps } as never,
        user_id: user.id,
      });
    } catch {
      // ignore
    }
    return NextResponse.json(
      { ok: false, error: msg, steps },
      { status: 500 },
    );
  }
}

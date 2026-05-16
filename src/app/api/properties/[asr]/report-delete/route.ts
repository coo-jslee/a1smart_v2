/**
 * 분석보고서 수동 삭제 endpoint (M6 보조).
 *
 * POST /api/properties/{asr}/report-delete?path={storage_path}
 *
 * 흐름:
 *   1) 인증 + admin 검증
 *   2) path 가 매물의 attachment_paths 에 포함되는지 검증 (path traversal 방지)
 *   3) Storage `reports` 버킷에서 파일 삭제
 *   4) properties.attachment_paths 배열에서 해당 경로 제거 (UPDATE)
 *   5) internal_note 한 줄 append (감사 추적)
 *
 * 정책:
 *   - Storage 삭제 실패는 fatal 처리 (DB와 Storage 불일치 방지)
 *   - 단, Storage에 파일이 이미 없는 경우(remove API가 빈 배열 반환) 는 OK로 처리 — DB만 정리
 */
import { NextResponse, type NextRequest } from "next/server";
import {
  createSupabaseServerClient,
  createSupabaseServiceRoleClient,
} from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ asr: string }> },
) {
  const { asr } = await params;
  const path = req.nextUrl.searchParams.get("path");
  if (!asr || !path) {
    return NextResponse.json(
      { error: "asr 또는 path 누락" },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();
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

  const svc = createSupabaseServiceRoleClient();

  // path traversal 방지: 이 매물의 attachment_paths 안에 있는 경로만 허용
  const { data: prop, error: propErr } = await svc
    .from("properties")
    .select("attachment_paths")
    .eq("asr_code", asr)
    .single();
  if (propErr || !prop) {
    return NextResponse.json(
      { error: "매물을 찾을 수 없습니다: " + asr },
      { status: 404 },
    );
  }
  const existingPaths = prop.attachment_paths ?? [];
  if (!existingPaths.includes(path)) {
    return NextResponse.json(
      { error: "이 매물의 첨부 목록에 없는 경로입니다." },
      { status: 403 },
    );
  }

  // Storage 삭제
  const { error: rmErr } = await svc.storage
    .from("reports")
    .remove([path]);
  if (rmErr) {
    return NextResponse.json(
      { error: "Storage 파일 삭제 실패: " + rmErr.message },
      { status: 500 },
    );
  }

  // attachment_paths 갱신
  const remaining = existingPaths.filter((p) => p !== path);
  const { error: upErr } = await svc
    .from("properties")
    .update({ attachment_paths: remaining })
    .eq("asr_code", asr);
  if (upErr) {
    return NextResponse.json(
      {
        error:
          "Storage 삭제는 성공했지만 properties UPDATE 실패: " + upErr.message,
      },
      { status: 500 },
    );
  }

  // 감사 로그용 internal_note append
  const today = new Date().toISOString().slice(0, 10);
  const filename = path.split("/").pop() ?? path;
  try {
    await svc.rpc("append_internal_note", {
      p_asr_code: asr,
      p_note: `[07분석보고서삭제|${today}] 수동 삭제: ${filename}`,
    });
  } catch {
    // 메모 실패는 non-fatal
  }

  return NextResponse.json({
    ok: true,
    deleted_path: path,
    attachment_paths: remaining,
  });
}

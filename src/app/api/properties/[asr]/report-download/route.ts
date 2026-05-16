/**
 * 분석보고서 다운로드용 signed URL 발급 (M6 보조 endpoint).
 *
 * POST /api/properties/{asr}/report-download?path={storage_path}
 *
 * 흐름:
 *   1) 인증 + admin 검증
 *   2) path가 매물의 attachment_paths에 포함되는지 검증 (다른 매물 접근 차단)
 *   3) reports 버킷에서 1시간 signed URL 발급
 */
import { NextResponse, type NextRequest } from "next/server";
import {
  createSupabaseServerClient,
  createSupabaseServiceRoleClient,
} from "@/lib/supabase/server";

export const runtime = "nodejs";

const SIGNED_URL_TTL_SEC = 60 * 60; // 1시간

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

  // 본인 매물의 첨부인지 확인 (path traversal 방지)
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
  if (!(prop.attachment_paths ?? []).includes(path)) {
    return NextResponse.json(
      { error: "이 매물에 첨부되지 않은 경로입니다." },
      { status: 403 },
    );
  }

  const { data: signed, error: sErr } = await svc.storage
    .from("reports")
    .createSignedUrl(path, SIGNED_URL_TTL_SEC);
  if (sErr || !signed?.signedUrl) {
    return NextResponse.json(
      { error: "Signed URL 발급 실패: " + (sErr?.message ?? "unknown") },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    signed_url: signed.signedUrl,
    expires_in_sec: SIGNED_URL_TTL_SEC,
  });
}

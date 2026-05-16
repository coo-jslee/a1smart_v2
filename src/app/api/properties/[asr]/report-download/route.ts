/**
 * 분석보고서 다운로드용 signed URL 발급 (M6 + M7).
 *
 * POST /api/properties/{asr}/report-download?path={storage_path}
 *
 * 권한 정책 (M7 공개 페이지 확장):
 *   - 관리자 (role=admin)        : 모든 보고서 다운로드 가능 (investor + full)
 *   - 일반 회원 (role=member)    : 매물이 is_public=true 이고 path 가 investor_ prefix 인 경우만
 *   - 비로그인                    : 401
 *
 * 추가 검증 (공통):
 *   - path 가 매물의 attachment_paths 안에 있어야 함 (path traversal 차단)
 *
 * Storage RLS (0003_storage_buckets.sql) 와 일치:
 *   - investor_* → 회원 SELECT 가능
 *   - 그 외       → admin 전용
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
  const isAdmin = profile?.role === "admin";

  const svc = createSupabaseServiceRoleClient();

  // 본인 매물의 첨부인지 확인 (path traversal 방지) + is_public 정책 검증
  const { data: prop, error: propErr } = await svc
    .from("properties")
    .select("attachment_paths, is_public")
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

  // 회원(non-admin) 추가 제약:
  //   - 매물이 is_public=true
  //   - path 파일명이 investor_ 로 시작 (외부용)
  if (!isAdmin) {
    const filename = path.split("/").pop() ?? "";
    const isInvestorReport = filename.startsWith("investor_");
    if (!prop.is_public || !isInvestorReport) {
      return NextResponse.json(
        { error: "이 보고서는 관리자만 다운로드할 수 있습니다." },
        { status: 403 },
      );
    }
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

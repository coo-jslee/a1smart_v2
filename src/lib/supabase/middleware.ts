import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./types";

/**
 * Supabase 인증 세션 미들웨어 헬퍼.
 * Next.js 미들웨어에서 호출돼서 쿠키 동기화·세션 갱신을 수행한다.
 * 또한 admin 전용 경로 가드도 여기서 처리.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // 세션 새로고침 (필수)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAuthPath = path.startsWith("/login") || path.startsWith("/signup");
  const isAdminPath = path.startsWith("/admin");
  const isMemberPath = path.startsWith("/member");

  // (1) 비로그인 사용자가 보호된 경로에 접근하면 /login으로
  if (!user && (isAdminPath || isMemberPath)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectedFrom", path);
    return NextResponse.redirect(url);
  }

  // (2) 로그인 사용자가 로그인/회원가입 페이지 접근하면 적절한 대시보드로
  if (user && isAuthPath) {
    const url = request.nextUrl.clone();
    // role 조회 (profiles 테이블)
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    url.pathname = profile?.role === "admin" ? "/admin/dashboard" : "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // (3) /admin 경로는 role='admin' 만 허용
  if (user && isAdminPath) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.searchParams.set("forbidden", "1");
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

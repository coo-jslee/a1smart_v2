/**
 * 공개 페이지 공용 네비게이션 바 (홈/매물 리스트/매물 상세 공유).
 *
 * Server Component 로 동작 — 사용자 세션 상태를 직접 읽어
 * 로그인 / 회원가입 / 로그아웃 / 관리자 대시보드 링크를 결정한다.
 */
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logoutAction } from "@/app/(auth)/actions";

export async function PublicNavbar() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let role: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    role = profile?.role ?? "member";
  }

  return (
    <header className="border-b bg-white sticky top-0 z-30 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/logo_v1.png"
            alt="A1Smart"
            width={32}
            height={32}
            priority
            className="rounded"
          />
          <span className="font-bold text-base sm:text-lg tracking-tight">
            A1Smart
            <span className="hidden sm:inline text-neutral-400 font-normal ml-2 text-sm">
              에이원스마트부동산중개법인
            </span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm">
          <Link
            href="/"
            className="text-neutral-700 hover:text-neutral-900 transition-colors"
          >
            홈
          </Link>
          <Link
            href="/properties"
            className="text-neutral-700 hover:text-neutral-900 transition-colors"
          >
            매물 보기
          </Link>
          <Link
            href="/intake"
            className="text-neutral-700 hover:text-neutral-900 transition-colors"
          >
            매도 의뢰
          </Link>
          <Link
            href="/about"
            className="text-neutral-700 hover:text-neutral-900 transition-colors"
          >
            회사 소개
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              {role === "admin" && (
                <Link href="/admin/dashboard" className="hidden sm:inline">
                  <Button size="sm" variant="secondary">
                    관리자
                  </Button>
                </Link>
              )}
              <span className="text-xs text-neutral-500 hidden md:inline">
                {user.email}
              </span>
              <form action={logoutAction}>
                <Button variant="outline" size="sm" type="submit">
                  로그아웃
                </Button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  로그인
                </Button>
              </Link>
              <Link href="/signup">
                <Button size="sm">회원가입</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

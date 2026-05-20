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
    <header className="border-b border-white/10 bg-[#050F2C]/95 sticky top-0 z-30 backdrop-blur-md">
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
          <span className="font-bold text-base sm:text-lg tracking-tight text-white">
            A1Smart
            <span className="hidden sm:inline text-blue-200/60 font-normal ml-2 text-sm">
              에이원스마트부동산중개법인
            </span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm">
          <Link
            href="/"
            className="text-blue-100/80 hover:text-yellow-300 transition-colors"
          >
            홈
          </Link>
          <Link
            href="/properties"
            className="text-blue-100/80 hover:text-yellow-300 transition-colors"
          >
            매물 보기
          </Link>
          <Link
            href="/buy-request"
            className="text-blue-100/80 hover:text-yellow-300 transition-colors"
          >
            매수 의뢰
          </Link>
          <Link
            href="/intake"
            className="text-blue-100/80 hover:text-yellow-300 transition-colors"
          >
            매도 의뢰
          </Link>
          <Link
            href="/experts"
            className="text-blue-100/80 hover:text-yellow-300 transition-colors"
          >
            전문가 소개
          </Link>
          <Link
            href="/about"
            className="text-blue-100/80 hover:text-yellow-300 transition-colors"
          >
            회사 소개
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              {role === "admin" && (
                <Link href="/admin/dashboard" className="hidden sm:inline">
                  <Button
                    size="sm"
                    className="bg-yellow-400 text-blue-950 hover:bg-yellow-300"
                  >
                    관리자
                  </Button>
                </Link>
              )}
              <span className="text-xs text-blue-200/60 hidden md:inline">
                {user.email}
              </span>
              <form action={logoutAction}>
                <Button
                  variant="outline"
                  size="sm"
                  type="submit"
                  className="border-white/20 text-white hover:bg-white/10 hover:text-white bg-transparent"
                >
                  로그아웃
                </Button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-blue-100 hover:bg-white/10 hover:text-white"
                >
                  로그인
                </Button>
              </Link>
              <Link href="/signup">
                <Button
                  size="sm"
                  className="bg-cyan-400 text-blue-950 hover:bg-cyan-300 font-semibold"
                >
                  회원가입
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

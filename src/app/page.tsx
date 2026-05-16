import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logoutAction } from "./(auth)/actions";

export const dynamic = "force-dynamic";

export default async function Home() {
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
    <div className="flex flex-col flex-1 bg-gradient-to-b from-neutral-50 to-white">
      {/* 헤더 */}
      <header className="border-b bg-white">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo_v1.png"
              alt="A1Smart"
              width={36}
              height={36}
              priority
              className="rounded"
            />
            <span className="font-bold text-lg">A1Smart</span>
          </Link>
          <nav className="flex items-center gap-3">
            {user ? (
              <>
                {role === "admin" && (
                  <Link href="/admin/dashboard">
                    <Button size="sm">관리자 대시보드</Button>
                  </Link>
                )}
                <span className="text-sm text-neutral-500 hidden sm:inline">
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
          </nav>
        </div>
      </header>

      {/* 히어로 */}
      <section className="flex-1 flex items-center">
        <div className="max-w-6xl mx-auto px-6 py-16 grid md:grid-cols-2 gap-10 items-center">
          <div className="flex justify-center md:justify-start">
            <Image
              src="/logo_v1.png"
              alt="A1Smart"
              width={260}
              height={260}
              className="rounded"
              priority
            />
          </div>
          <div>
            <h1 className="text-4xl font-bold leading-tight">
              에이원스마트부동산
              <br />
              <span className="text-blue-700">AI가 분석한 정확한 시세</span>
            </h1>
            <p className="mt-4 text-neutral-600">
              공부(등기·토지·건축) 자동 분석, 국토부 실거래가 기반 합의시세,
              권리하자 진단까지. 30년 경력의 부동산·금융 전문가가 설계한
              AI 자동화 플랫폼.
            </p>
            <div className="mt-6 flex gap-3">
              <Link href="/properties">
                <Button size="lg">공개 매물 보기</Button>
              </Link>
              {!user && (
                <Link href="/signup">
                  <Button variant="outline" size="lg">
                    회원가입
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 강점 3분할 */}
      <section className="bg-white border-t">
        <div className="max-w-6xl mx-auto px-6 py-14 grid md:grid-cols-3 gap-6">
          {[
            {
              title: "7단계 자동 분석",
              desc: "공부 PDF 업로드 → OCR + Claude LLM → 매물DB 자동 입력까지 1분.",
            },
            {
              title: "합의 시세",
              desc: "국토부 실거래가 기반 6개 평가방법 + 권리하자 디스카운트로 정확한 가격 산출.",
            },
            {
              title: "권리하자 진단",
              desc: "근저당·가압류·압류·경매 정보를 자동 분석해 위험등급(안전·주의·위험) 분류.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="p-6 border rounded-lg bg-neutral-50"
            >
              <h3 className="font-bold text-lg">{f.title}</h3>
              <p className="mt-2 text-sm text-neutral-600">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 푸터 */}
      <footer className="border-t bg-white">
        <div className="max-w-6xl mx-auto px-6 py-6 text-xs text-neutral-500 flex flex-wrap items-center justify-between gap-2">
          <div>
            © {new Date().getFullYear()} 에이원스마트부동산중개법인. All rights reserved.
          </div>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:underline">
              개인정보처리방침
            </Link>
            <Link href="/terms" className="hover:underline">
              이용약관
            </Link>
            <Link href="/contact" className="hover:underline">
              문의
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

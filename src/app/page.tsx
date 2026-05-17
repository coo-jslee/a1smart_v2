/**
 * 홈 페이지 (공개) — M7 1차.
 *
 *  - 헤더: PublicNavbar (로그인 상태 자동 표시)
 *  - Hero: 회사 소개 + 핵심 가치제안 + CTA
 *  - 최신 공개 매물 6건 카드 그리드
 *  - 3가지 강점 박스
 *  - 푸터: PublicFooter
 */
import Link from "next/link";
import { ArrowRight, FileText, Shield, Sparkles, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PublicNavbar } from "@/components/public/public-navbar";
import { PublicFooter } from "@/components/public/public-footer";
import { HeroAiBg } from "@/components/public/hero-ai-bg";
import { SkylineBanner } from "@/components/public/skyline-banner";
import {
  PropertyCard,
  type PropertyCardData,
} from "@/components/public/property-card";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createSupabaseServerClient();

  // 최신 공개 매물 6건
  const { data: properties } = await supabase
    .from("properties")
    .select(
      "asr_code, address_road, address_jibun, property_type, building_name, exclusive_m2, floor_no, total_floors, built_year, sale_price, unit_price_m2, risk_grade, is_distressed, image_paths",
    )
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(6);

  const list: PropertyCardData[] = (properties ?? []).map((p) => ({
    asr_code: p.asr_code,
    address_road: p.address_road,
    address_jibun: p.address_jibun,
    property_type: p.property_type,
    building_name: p.building_name,
    exclusive_m2: p.exclusive_m2 ? Number(p.exclusive_m2) : null,
    floor_no: p.floor_no,
    total_floors: p.total_floors,
    built_year: p.built_year,
    sale_price: p.sale_price,
    unit_price_m2: p.unit_price_m2,
    risk_grade: p.risk_grade,
    is_distressed: p.is_distressed,
    image_paths: p.image_paths ?? [],
  }));

  return (
    <div className="flex flex-col flex-1 min-h-screen bg-white">
      <PublicNavbar />

      {/* Hero — 노션 톤 (AI 회로 + 집 배너 이미지) */}
      <section className="relative overflow-hidden border-b border-blue-950/40 bg-[#0B1F4D]">
        {/* 1) 메인 배경 이미지 (사용자가 public/hero-ai.png 저장 시 자동 적용) */}
        <div
          className="absolute inset-0 bg-no-repeat bg-cover bg-center"
          style={{ backgroundImage: "url(/hero-ai.png)" }}
        />
        {/* 2) 폴백 그라데이션 — 이미지 없으면 보임. 이미지 있으면 좌측 페이드 오버레이 역할 */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#050F2C] via-[#0B1F4D]/90 to-[#0B1F4D]/0" />
        {/* 3) 좌측 텍스트 가독성 강화 — 좌측 60% 어둡게 */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#050F2C]/85 via-[#0B1F4D]/40 to-transparent" />
        {/* 4) 코너 글로우 */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_90%,rgba(26,61,122,0.6),transparent_50%)]" />

        {/* 5) 폴백 SVG — public/hero-ai.png 없을 때만 보이도록 우측에 배치 (이미지 있으면 배경 이미지에 가려짐) */}
        <div className="absolute right-0 top-0 bottom-0 w-full md:w-1/2 opacity-30 md:opacity-70 pointer-events-none mix-blend-screen">
          <HeroAiBg />
        </div>

        {/* 콘텐츠 */}
        <div className="relative max-w-6xl mx-auto px-6 py-24 md:py-32">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-400/10 border border-cyan-400/30 text-cyan-300 text-xs font-medium mb-6 backdrop-blur-sm">
              <Brain className="h-3.5 w-3.5" />
              AI 활용 더 똑똑한 부동산중개법인
            </div>
            <h1 className="text-4xl md:text-6xl font-bold leading-[1.15] tracking-tight text-white">
              30년 경력 전문가가 설계한
              <br />
              <span className="bg-gradient-to-r from-cyan-300 via-cyan-200 to-white bg-clip-text text-transparent">
                정확한 부동산 분석
              </span>
            </h1>
            <p className="mt-7 text-lg text-blue-100/90 leading-relaxed">
              공부(등기·토지·건축) 자동 분석, 국토부 실거래가 기반 합의시세,
              <br />
              권리하자 진단까지 — 한 곳에서 완결되는 부동산 AI 자동화.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/properties">
                <Button
                  size="lg"
                  className="bg-cyan-400 text-blue-950 hover:bg-cyan-300 font-semibold shadow-lg shadow-cyan-500/20"
                >
                  공개 매물 보기
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
              <Link href="/signup">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10 hover:text-white bg-transparent"
                >
                  회원가입
                </Button>
              </Link>
            </div>
            <p className="mt-4 text-xs text-blue-200/60">
              ※ 매물 상세·분석보고서 다운로드는 회원 전용입니다
            </p>
          </div>
        </div>

        {/* 하단 페이드 (다음 섹션과 자연스럽게 연결) */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-b from-transparent to-white pointer-events-none" />
      </section>

      {/* 강점 3분할 — 다크 Hero 다음에 와도 자연스러운 톤 */}
      <section className="border-b bg-white relative">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-50 text-blue-900 text-xs font-medium mb-3">
              핵심 가치
            </div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-neutral-900">
              사람이 빠뜨리는 정보까지
              <span className="text-blue-900"> AI가 정확히</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Sparkles,
                title: "7단계 자동 분석",
                desc: "공부 PDF 업로드 → OCR + Claude LLM → 매물 자동 등록까지 1분.",
              },
              {
                icon: FileText,
                title: "합의 시세 산출",
                desc: "국토부 실거래 + 6개 평가방법 + 권리하자 디스카운트로 정확한 가격.",
              },
              {
                icon: Shield,
                title: "권리하자 진단",
                desc: "근저당·가압류·압류·경매 자동 분석 → 위험등급(안전·주의·위험) 분류.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="group p-6 bg-white border border-neutral-200 rounded-xl hover:border-blue-300 hover:shadow-lg hover:shadow-blue-900/5 transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-900 to-cyan-600 text-white flex items-center justify-center mb-4 shadow-md shadow-blue-900/20 group-hover:scale-105 transition-transform">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-lg text-neutral-900">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm text-neutral-600 leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 도시 스카이라인 배너 (서울 부동산 ribbon) */}
      <SkylineBanner />

      {/* 최신 공개 매물 */}
      <section>
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-neutral-900">
                최신 공개 매물
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                AI 합의시세 + 권리분석이 완료된 매물입니다
              </p>
            </div>
            <Link
              href="/properties"
              className="text-sm font-medium text-blue-900 hover:underline flex items-center gap-1"
            >
              전체 보기
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {list.length === 0 ? (
            <div className="text-center py-16 text-neutral-400">
              아직 공개 매물이 없습니다.
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {list.map((p) => (
                <PropertyCard key={p.asr_code} property={p} />
              ))}
            </div>
          )}
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}

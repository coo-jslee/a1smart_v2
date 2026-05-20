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
import { ArrowRight, Scale, BrainCircuit, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PublicNavbar } from "@/components/public/public-navbar";
import { PublicFooter } from "@/components/public/public-footer";
import { SkylineBanner } from "@/components/public/skyline-banner";
import { HeroStarfield } from "@/components/public/hero-starfield";
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
    <div className="dark flex flex-col flex-1 min-h-screen bg-[#0B1F4D] text-white">
      <PublicNavbar />

      {/* Hero — 우주 배경 + 한글 거대 타이포 + AI 회로 배너 (센터 정렬) */}
      <section className="relative overflow-hidden bg-[#13316B]">
        {/* 배경 — 중간 코발트 블루 그라데이션 (밝게) */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#13316B] via-[#1A4490] to-[#1C4B9E]" />
        {/* 우주 — 별·은하수·성운 */}
        <HeroStarfield />
        {/* 하단 비네팅 (다음 섹션과 자연 연결) */}
        <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-b from-transparent to-[#0B1F4D] pointer-events-none" />

        {/* 콘텐츠 — 가운데 정렬, 네비 바로 아래부터 */}
        <div className="relative w-full max-w-3xl mx-auto px-6 pt-8 pb-10 md:pt-10 md:pb-12 flex flex-col items-center text-center">
          {/* AI 회로 배너 — 맨 위 */}
          <div className="relative w-full aspect-[2368/448] max-h-[170px] md:max-h-[200px] rounded-xl overflow-hidden ring-1 ring-cyan-300/20 shadow-2xl shadow-blue-950/60">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/hero-ai.png"
              alt="AI 활용 더 똑똑한 부동산중개법인 — 에이원스마트부동산중개법인"
              className="w-full h-full object-cover"
            />
          </div>

          {/* 작은 라벨 */}
          <div className="flex items-center gap-2.5 mt-8 mb-5">
            <span className="h-px w-8 bg-cyan-300/80" />
            <span className="text-cyan-200 text-xs md:text-sm font-semibold tracking-[0.22em] uppercase">
              Smart Real Estate
            </span>
            <span className="h-px w-8 bg-cyan-300/80" />
          </div>

          {/* 한글 거대 타이포 */}
          <h1 className="font-bold text-white leading-[1.15] tracking-tight">
            <span className="block text-3xl sm:text-5xl md:text-6xl">
              중개를 넘어
            </span>
            <span className="block text-3xl sm:text-5xl md:text-6xl mt-1.5 bg-gradient-to-r from-cyan-200 via-sky-100 to-white bg-clip-text text-transparent">
              부동산 의사결정 솔루션 제공
            </span>
          </h1>

          {/* 한글 본문 */}
          <p className="mt-8 text-cyan-200 text-xs md:text-sm font-semibold tracking-[0.15em] uppercase">
            부동산 의사결정 파트너
          </p>
          <p className="mt-2.5 max-w-2xl text-base md:text-lg text-blue-50/90 leading-relaxed">
            매물 찾기는 시작일 뿐입니다. 공인회계사·세무사·변호사 전문가
            집단과 AI가 — 매물 발굴부터 취득·절세·승계 전략까지 한 곳에서
            설계합니다.
          </p>

          {/* CTA */}
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <Link href="/properties">
              <Button
                size="lg"
                className="bg-cyan-400 text-blue-950 hover:bg-cyan-300 font-semibold shadow-lg shadow-cyan-500/30"
              >
                공개 매물 보기
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
            <Link href="/signup">
              <Button
                size="lg"
                variant="outline"
                className="border-white/40 text-white hover:bg-white/10 hover:text-white bg-transparent"
              >
                무료 회원가입
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-xs text-blue-100/60">
            회원가입 시 전문가 분석보고서(시세·권리·세무)를 무료로 받아보실 수 있습니다
          </p>
        </div>
      </section>

      {/* 강점 3분할 — 다크 톤 (다크 Hero 다음에 자연스럽게) */}
      <section className="border-b border-white/10 relative">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Scale,
                title: "전문가 집단",
                desc: "공인회계사·세무사·변호사가 직접 분석합니다. 단순 중개사가 아닌 전문가 그룹의 종합 자문.",
              },
              {
                icon: BrainCircuit,
                title: "AI 매물 매칭",
                desc: "최신 인공지능이 조건에 맞는 매물을 서칭·추천·매핑. 사람이 놓치는 기회까지 정밀 발굴.",
              },
              {
                icon: Landmark,
                title: "취득·절세 설계",
                desc: "법인세·소득세·상속세·법인전환까지 — 부동산 취득의 모든 세무·법률 이슈를 다각도로 분석.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="group p-6 bg-blue-950/40 border border-white/10 rounded-xl hover:border-cyan-400/40 hover:bg-blue-900/40 hover:shadow-lg hover:shadow-cyan-500/10 transition-all backdrop-blur-sm"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-600 text-blue-950 flex items-center justify-center mb-4 shadow-lg shadow-cyan-500/30 group-hover:scale-105 transition-transform">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-lg text-white">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm text-blue-100/80 leading-relaxed">
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
              <h2 className="text-2xl font-bold tracking-tight text-white">
                최신 공개 매물
              </h2>
              <p className="mt-1 text-sm text-blue-200/70">
                AI 합의시세 + 권리분석 + 세무 검토까지 완료된 매물입니다
              </p>
            </div>
            <Link
              href="/properties"
              className="text-sm font-medium text-yellow-300 hover:text-yellow-200 hover:underline flex items-center gap-1"
            >
              전체 보기
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {list.length === 0 ? (
            <div className="text-center py-16 text-blue-300/50">
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

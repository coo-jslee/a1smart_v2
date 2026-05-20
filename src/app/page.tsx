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

      {/* Hero — 고급 번트 오렌지 톤 */}
      <section className="relative overflow-hidden border-b border-orange-950/50 bg-[#1A0A02]">
        {/* 배경 — 깊은 번트 오렌지 그라데이션 */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#2A1006] via-[#7C2D12] to-[#9A3412]" />
        {/* 코너 글로우 — 따뜻한 앰버 */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(251,191,36,0.20),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(120,53,18,0.6),transparent_55%)]" />

        {/* 콘텐츠 영역 — AI 회로 배너를 풀폭으로 표시 (원본 비율 유지) */}
        <div className="relative max-w-6xl mx-auto px-6 pt-16 pb-12 md:pt-20 md:pb-16">
          {/* AI 회로 배너 — 둥근 카드 프레임으로 감싸 주황 배경과 자연스럽게 분리 */}
          <div className="relative w-full aspect-[2368/448] max-h-[280px] md:max-h-[340px] mx-auto rounded-2xl overflow-hidden ring-1 ring-amber-200/25 shadow-2xl shadow-black/50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/hero-ai.png"
              alt="AI 활용 더 똑똑한 부동산중개법인 — 에이원스마트부동산중개법인"
              className="w-full h-full object-cover"
            />
          </div>

          {/* 텍스트 + CTA — 배너 아래 */}
          <div className="relative mt-8 md:mt-10 text-center max-w-3xl mx-auto">
            <h1 className="text-3xl md:text-5xl font-bold leading-[1.25] tracking-tight text-white">
              매물 찾기는 시작일 뿐
              <br />
              <span className="bg-gradient-to-r from-amber-200 via-amber-100 to-white bg-clip-text text-transparent">
                취득·절세·승계까지 설계합니다
              </span>
            </h1>
            <p className="mt-5 text-base md:text-lg text-orange-50/90 leading-relaxed">
              공인회계사·세무사·변호사 전문가 집단이 AI 매물 분석과 함께 —
              부동산 취득의 세금·법률 전략까지 한 곳에서 책임집니다.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 justify-center">
              <Link href="/properties">
                <Button
                  size="lg"
                  className="bg-amber-300 text-orange-950 hover:bg-amber-200 font-semibold shadow-lg shadow-amber-900/40"
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
            <p className="mt-4 text-xs text-orange-100/60">
              회원가입 시 전문가 분석보고서(시세·권리·세무)를 무료로 받아보실 수 있습니다
            </p>
          </div>
        </div>

        {/* 하단 페이드 (주황 → 네이비 강점 섹션으로 자연스럽게 전환) */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-b from-transparent to-[#0B1F4D] pointer-events-none" />
      </section>

      {/* 강점 3분할 — 다크 톤 (다크 Hero 다음에 자연스럽게) */}
      <section className="border-b border-white/10 relative">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-cyan-400/10 border border-cyan-400/30 text-cyan-300 text-xs font-medium mb-3">
              에이원스마트가 다른 이유
            </div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
              중개를 넘어,
              <span className="text-yellow-300"> 부동산 의사결정의 모든 답</span>
            </h2>
          </div>
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

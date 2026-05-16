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
import { ArrowRight, FileText, Shield, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PublicNavbar } from "@/components/public/public-navbar";
import { PublicFooter } from "@/components/public/public-footer";
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

      {/* Hero */}
      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-neutral-50" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(26,61,122,0.08),transparent_50%)]" />
        <div className="relative max-w-6xl mx-auto px-6 py-20 md:py-28">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100/60 text-blue-900 text-xs font-medium mb-6">
              <Sparkles className="h-3 w-3" />
              AI 분석 부동산 플랫폼
            </div>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight tracking-tight text-neutral-900">
              30년 경력 전문가가 설계한
              <br />
              <span className="text-blue-900">정확한 부동산 분석</span>
            </h1>
            <p className="mt-6 text-lg text-neutral-600 leading-relaxed">
              공부(등기·토지·건축) 자동 분석, 국토부 실거래가 기반 합의시세,
              <br />
              권리하자 진단까지 — 한 곳에서 완결되는 부동산 AI 자동화.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/properties">
                <Button size="lg" className="bg-blue-900 hover:bg-blue-800">
                  공개 매물 보기
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
              <Link href="/signup">
                <Button size="lg" variant="outline">
                  회원가입
                </Button>
              </Link>
            </div>
            <p className="mt-4 text-xs text-neutral-500">
              ※ 매물 상세·분석보고서 다운로드는 회원 전용입니다
            </p>
          </div>
        </div>
      </section>

      {/* 강점 3분할 */}
      <section className="border-b bg-neutral-50/40">
        <div className="max-w-6xl mx-auto px-6 py-16 grid md:grid-cols-3 gap-6">
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
              className="p-6 bg-white border rounded-lg hover:shadow-sm transition-shadow"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-900 flex items-center justify-center mb-4">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-lg text-neutral-900">{f.title}</h3>
              <p className="mt-2 text-sm text-neutral-600 leading-relaxed">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

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

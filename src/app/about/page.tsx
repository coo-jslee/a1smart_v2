/**
 * 회사 소개 페이지 `/about` — 다크 톤.
 */
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Scale,
  BrainCircuit,
  Landmark,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicNavbar } from "@/components/public/public-navbar";
import { PublicFooter } from "@/components/public/public-footer";

export default function AboutPage() {
  return (
    <div className="dark flex flex-col flex-1 min-h-screen bg-[#0B1F4D] text-white">
      <PublicNavbar />

      {/* Hero */}
      <section className="relative border-b border-white/10 bg-[#050F2C]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(34,211,238,0.12),transparent_55%)]" />
        <div className="relative max-w-5xl mx-auto px-6 py-16 md:py-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-400/10 border border-cyan-400/30 text-cyan-300 text-xs font-medium mb-6">
            <Sparkles className="h-3 w-3" />
            회사 소개
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
            부동산 거래를 넘어,
            <br />
            <span className="text-yellow-300">자산 전략 파트너로</span>
          </h1>
          <p className="mt-6 text-lg text-blue-100/90 leading-relaxed max-w-3xl">
            에이원스마트부동산중개법인 주식회사는 공인회계사·세무사·변호사
            전문가 집단과 AI가 함께 — 매물 발굴부터 권리분석, 그리고 취득세·
            법인세·상속세·법인전환 전략까지 한 곳에서 설계합니다.
            <br />
            <span className="text-blue-200/70 text-base">
              개인투자자·법인·NPL 트랙·경공매 매수인까지 — 단순 중개가 아닌
              종합 의사결정이 필요한 모두를 위한 신뢰의 파트너.
            </span>
          </p>
        </div>
      </section>

      {/* 미션·비전 */}
      <section className="border-b border-white/10">
        <div className="max-w-5xl mx-auto px-6 py-14">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-xl font-bold text-yellow-300 mb-3">
                우리의 미션
              </h2>
              <p className="text-blue-100/85 leading-relaxed">
                부동산 거래의 정보 비대칭을 해소하고, 누구나 공인회계사·
                세무사·변호사 수준의 취득·세무·법률 분석을 받을 수 있도록
                합니다. 사고파는 중개에 머무르지 않고, 부동산 의사결정의
                모든 답을 제공합니다.
              </p>
            </div>
            <div>
              <h2 className="text-xl font-bold text-yellow-300 mb-3">
                우리의 비전
              </h2>
              <p className="text-blue-100/85 leading-relaxed">
                단순 중개를 넘어 — 부동산 자산의 취득부터 보유·승계까지
                전(全) 생애주기를 설계하는, 대한민국 대표 부동산 의사결정
                파트너로 자리매김합니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 핵심 서비스 3가지 */}
      <section className="border-b border-white/10">
        <div className="max-w-5xl mx-auto px-6 py-14">
          <h2 className="text-xl font-bold text-white mb-8">핵심 서비스</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Scale,
                title: "전문가 종합 자문",
                desc: "공인회계사·세무사·변호사가 함께하는 전문가 집단. 단순 중개사가 아닌 자격 보유 전문가가 매물의 권리·세무·법률 이슈를 직접 검토하고 종합 자문합니다.",
              },
              {
                icon: BrainCircuit,
                title: "AI 매물 발굴·시세 분석",
                desc: "최신 인공지능이 조건에 맞는 매물을 서칭·추천·매핑. 국토부 실거래 + 6개 평가방법 가중평균으로 합의시세를 산출하고 권리하자까지 자동 진단합니다.",
              },
              {
                icon: Landmark,
                title: "세무·승계 전략",
                desc: "부동산 취득은 세금에서 시작됩니다. 취득세·법인세·소득세·상속세, 그리고 법인전환까지 — 다각적 세무 시뮬레이션으로 최적 의사결정을 설계합니다.",
              },
            ].map((s) => (
              <div
                key={s.title}
                className="p-6 border border-white/15 rounded-lg bg-blue-950/40 hover:bg-blue-900/40 hover:border-cyan-400/40 transition-colors backdrop-blur-sm"
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-400 to-cyan-600 text-blue-950 flex items-center justify-center mb-4 shadow-lg shadow-cyan-500/30">
                  <s.icon className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-white">{s.title}</h3>
                <p className="mt-2 text-sm text-blue-100/80 leading-relaxed">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7단계 워크플로우 */}
      <section className="border-b border-white/10">
        <div className="max-w-5xl mx-auto px-6 py-14">
          <h2 className="text-xl font-bold text-white mb-8">
            7단계 자동화 워크플로우
          </h2>
          <ol className="space-y-3">
            {[
              "01 입수 — 매물 의뢰 접수 + ASR 코드 부여",
              "02 발급 — 공부 PDF (등기·토지·건축) 발급",
              "03 저장 — Supabase Storage 자동 저장",
              "04 발췌 — OCR + Claude LLM 핵심 정보 추출",
              "05 입력 — 매물 DB 자동 입력 (54속성)",
              "06 시세조사 — 6개 평가방법 + 합의시세 산출",
              "07 분석보고서 — DOCX 자동 발행 (외부용·내부용)",
            ].map((step, i) => (
              <li
                key={i}
                className="flex items-start gap-3 p-3 bg-blue-950/40 border border-white/10 rounded backdrop-blur-sm"
              >
                <CheckCircle2 className="h-5 w-5 text-cyan-300 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-100">{step}</div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 사업자 정보 */}
      <section className="border-b border-white/10">
        <div className="max-w-5xl mx-auto px-6 py-14">
          <h2 className="text-xl font-bold text-white mb-6">사업자 정보</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="border border-white/15 rounded-lg p-6 bg-blue-950/40 backdrop-blur-sm">
              <dl className="text-sm divide-y divide-white/10">
                <Row k="법인명" v="에이원스마트부동산중개법인 주식회사" />
                <Row k="대표자" v="강창구" />
                <Row k="사업자등록번호" v="845-86-00635" />
                <Row k="법인등록번호" v="110111-3670290" />
                <Row k="개업일" v="2017년 03월 09일" />
                <Row k="업태 / 종목" v="부동산업 / 부동산관리, 부동산 중개" />
                <Row
                  k="본점 소재지"
                  v="서울특별시 강서구 강서로56길 44, 201호 (등촌동, 엘크루 발산)"
                />
                <Row k="대표 전화" v="(추후 안내)" />
                <Row k="중개사무소 등록번호" v="(추후 안내)" />
              </dl>
              <p className="mt-4 text-xs text-blue-300/60 italic">
                ※ 대표 전화 및 중개사무소 등록번호는 추후 안내 예정입니다.
              </p>
            </div>

            <div className="border border-white/15 rounded-lg p-6 bg-blue-950/40 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-3">
                <Image
                  src="/logo_v1.png"
                  alt="A1Smart"
                  width={48}
                  height={48}
                  className="rounded"
                />
                <div>
                  <div className="font-bold text-white">A1Smart</div>
                  <div className="text-xs text-blue-200/70">
                    AI 부동산 분석 플랫폼
                  </div>
                </div>
              </div>
              <p className="text-sm text-blue-100/85 leading-relaxed mb-4">
                매물 문의·매도 의뢰·분석보고서 등 모든 서비스는 상단의 매물
                페이지에서 확인하거나
                <br />
                담당자에게 직접 문의하실 수 있습니다.
              </p>
              <div className="flex flex-wrap gap-2">
                <Link href="/contact">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-white/20 text-blue-100 hover:bg-white/10 hover:text-white bg-transparent"
                  >
                    <Mail className="h-3 w-3 mr-1" />
                    문의하기
                  </Button>
                </Link>
                <Link href="/buy-request">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-white/20 text-blue-100 hover:bg-white/10 hover:text-white bg-transparent"
                  >
                    매수 의뢰
                  </Button>
                </Link>
                <Link href="/intake">
                  <Button
                    size="sm"
                    className="bg-yellow-400 text-blue-950 hover:bg-yellow-300 font-semibold"
                  >
                    매도 의뢰
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex py-2.5">
      <dt className="w-36 text-blue-200/70 flex-shrink-0">{k}</dt>
      <dd className="flex-1 text-white">{v}</dd>
    </div>
  );
}

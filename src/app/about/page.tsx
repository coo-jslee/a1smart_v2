/**
 * 회사 소개 페이지 `/about` — M7 후속.
 *
 *  - 회사 비전 + 핵심 서비스 3가지
 *  - 30년 경력 컨셉
 *  - 사업자 정보 (사업자등록 PDF는 branding/business_registration.pdf 보유)
 *  - 위치·연락처 (간단)
 */
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  CheckCircle2,
  Sparkles,
  FileText,
  Shield,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicNavbar } from "@/components/public/public-navbar";
import { PublicFooter } from "@/components/public/public-footer";

export default function AboutPage() {
  return (
    <div className="flex flex-col flex-1 min-h-screen bg-white">
      <PublicNavbar />

      {/* Hero */}
      <section className="border-b">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/60 to-white -z-10" />
        <div className="max-w-5xl mx-auto px-6 py-16 md:py-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100/60 text-blue-900 text-xs font-medium mb-6">
            <Sparkles className="h-3 w-3" />
            회사 소개
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-neutral-900">
            30년 경력 부동산·금융 전문가가 설계한
            <br />
            <span className="text-blue-900">AI 부동산 분석 플랫폼</span>
          </h1>
          <p className="mt-6 text-lg text-neutral-600 leading-relaxed max-w-3xl">
            에이원스마트부동산중개법인 주식회사는 등기·토지·건축 공부 자동
            분석, 국토부 실거래가 기반 합의시세 산출, 권리하자 자동 진단을
            한 곳에서 제공합니다.
            <br />
            <span className="text-neutral-500 text-base">
              개인투자자·법인·NPL 트랙·경공매 매수인까지 — 정확한 부동산 정보가
              필요한 모두를 위한 신뢰의 플랫폼.
            </span>
          </p>
        </div>
      </section>

      {/* 미션·비전 */}
      <section className="border-b bg-neutral-50/40">
        <div className="max-w-5xl mx-auto px-6 py-14">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-xl font-bold text-neutral-900 mb-3">
                우리의 미션
              </h2>
              <p className="text-neutral-600 leading-relaxed">
                정보 비대칭을 줄이고, 누구나 전문가 수준의 부동산 분석을
                받을 수 있도록 — 공인된 데이터(국토부 실거래·등기부등본·공시지가)와
                AI 합의시세 모델을 결합한 종합 분석을 제공합니다.
              </p>
            </div>
            <div>
              <h2 className="text-xl font-bold text-neutral-900 mb-3">
                우리의 비전
              </h2>
              <p className="text-neutral-600 leading-relaxed">
                현장 경험 30년의 부동산 전문가가 설계한 자동화 파이프라인.
                매물 의뢰부터 분석보고서 발행까지 7단계를 1분 안에 완결하는,
                한국에서 가장 빠르고 정확한 부동산 분석 솔루션을 만듭니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 핵심 서비스 3가지 */}
      <section className="border-b">
        <div className="max-w-5xl mx-auto px-6 py-14">
          <h2 className="text-xl font-bold text-neutral-900 mb-8">
            핵심 서비스
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Sparkles,
                title: "AI 공부 자동 분석",
                desc: "등기부·토지·건축 PDF를 업로드하면 OCR과 Claude LLM이 핵심 정보를 추출 → 매물DB 자동 등록까지 1분 이내. 사람이 빠뜨리는 권리 정보까지 정확히 캐치합니다.",
              },
              {
                icon: FileText,
                title: "합의 시세 산정",
                desc: "국토부 RTMS 실거래 + 단지 단가 환산 + 외부 평가값(감정·KB·집품) + 권리하자 디스카운트를 결합한 6개 평가방법 가중평균. 단일 매칭의 오류를 다중 검증으로 보정.",
              },
              {
                icon: Shield,
                title: "권리하자 진단",
                desc: "근저당·가압류·압류·임의경매를 자동 분석해 위험등급(안전·주의·위험)을 부여. 임의경매 매물에는 디스카운트를 자동 적용해 매수 검토 가격을 산출합니다.",
              },
            ].map((s) => (
              <div
                key={s.title}
                className="p-6 border rounded-lg bg-white hover:shadow-sm transition-shadow"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-900 flex items-center justify-center mb-4">
                  <s.icon className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-neutral-900">{s.title}</h3>
                <p className="mt-2 text-sm text-neutral-600 leading-relaxed">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7단계 워크플로우 */}
      <section className="border-b bg-neutral-50/40">
        <div className="max-w-5xl mx-auto px-6 py-14">
          <h2 className="text-xl font-bold text-neutral-900 mb-8">
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
                className="flex items-start gap-3 p-3 bg-white border rounded"
              >
                <CheckCircle2 className="h-5 w-5 text-blue-900 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-neutral-700">{step}</div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 사업자 정보 */}
      <section className="border-b">
        <div className="max-w-5xl mx-auto px-6 py-14">
          <h2 className="text-xl font-bold text-neutral-900 mb-6">
            사업자 정보
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="border rounded-lg p-6 bg-white">
              <dl className="text-sm divide-y">
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
              <p className="mt-4 text-xs text-neutral-400 italic">
                ※ 대표 전화 및 중개사무소 등록번호는 추후 안내 예정입니다.
              </p>
            </div>

            <div className="border rounded-lg p-6 bg-white">
              <div className="flex items-center gap-3 mb-3">
                <Image
                  src="/logo_v1.png"
                  alt="A1Smart"
                  width={48}
                  height={48}
                  className="rounded"
                />
                <div>
                  <div className="font-bold">A1Smart</div>
                  <div className="text-xs text-neutral-500">
                    AI 부동산 분석 플랫폼
                  </div>
                </div>
              </div>
              <p className="text-sm text-neutral-600 leading-relaxed mb-4">
                매물 문의·매도 의뢰·분석보고서 등 모든 서비스는
                상단의 매물 페이지에서 확인하거나
                <br />
                담당자에게 직접 문의하실 수 있습니다.
              </p>
              <div className="flex flex-wrap gap-2">
                <Link href="/contact">
                  <Button size="sm" variant="outline">
                    <Mail className="h-3 w-3 mr-1" />
                    문의하기
                  </Button>
                </Link>
                <Link href="/buy-request">
                  <Button size="sm" variant="outline">
                    매수 의뢰
                  </Button>
                </Link>
                <Link href="/intake">
                  <Button size="sm">
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
      <dt className="w-36 text-neutral-500 flex-shrink-0">{k}</dt>
      <dd className="flex-1 text-neutral-800">{v}</dd>
    </div>
  );
}

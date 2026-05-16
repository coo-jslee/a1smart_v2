/**
 * 매수 의뢰 페이지 `/buy-request` — M7 후속2.
 *
 *  - 거래 형태(매매/전세/월세) 선택
 *  - 의뢰인 정보 + 희망 매물 조건 + 예산
 *  - 제출 → inquiries 테이블 (inquiry_type='buy', transaction_type=...)
 */
import {
  CheckCircle2,
  Sparkles,
  Search,
  TrendingUp,
  HandshakeIcon,
} from "lucide-react";
import { PublicNavbar } from "@/components/public/public-navbar";
import { PublicFooter } from "@/components/public/public-footer";
import { BuyRequestForm } from "./buy-form";

export const dynamic = "force-dynamic";

export default function BuyRequestPage() {
  return (
    <div className="flex flex-col flex-1 min-h-screen bg-neutral-50/40">
      <PublicNavbar />

      <section className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100/60 text-blue-900 text-xs font-medium mb-4">
            <Sparkles className="h-3 w-3" />
            매수 의뢰
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
            매수 의뢰 — 매매 · 전세 · 월세
          </h1>
          <p className="mt-3 text-sm text-neutral-600 leading-relaxed max-w-3xl">
            희망하시는 매물 조건과 예산을 알려주시면 담당자가 적합한 매물을
            큐레이션해서 분석보고서와 함께 안내드립니다. 영업일 1~3일 이내
            연락드립니다.
          </p>
        </div>
      </section>

      <section className="flex-1">
        <div className="max-w-5xl mx-auto px-6 py-10 grid lg:grid-cols-3 gap-8">
          {/* 진행 흐름 */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white border rounded-lg p-5">
              <h2 className="text-base font-bold text-neutral-900 mb-4">
                진행 흐름
              </h2>
              <ol className="space-y-3 text-sm">
                {[
                  {
                    t: "의뢰 접수",
                    d: "이 폼 제출 → 담당자가 조건 검토",
                    icon: HandshakeIcon,
                  },
                  {
                    t: "매물 큐레이션",
                    d: "조건 매칭 매물 3~5건 1차 추천",
                    icon: Search,
                  },
                  {
                    t: "AI 분석 보고서",
                    d: "추천 매물별 합의시세·권리분석 제공",
                    icon: TrendingUp,
                  },
                  {
                    t: "현장 안내·계약",
                    d: "관심 매물 현장 안내 후 계약 진행",
                    icon: CheckCircle2,
                  },
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-900 flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-neutral-900">
                        {step.t}
                      </div>
                      <div className="text-xs text-neutral-500 mt-0.5">
                        {step.d}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div className="bg-blue-50/40 border border-blue-100 rounded-lg p-4 text-xs text-blue-900 leading-relaxed space-y-2">
              <div>
                <strong>매매</strong> — 예산 상·하한, 희망 면적·층·준공 조건
              </div>
              <div>
                <strong>전세</strong> — 보증금 상한 (전세가율 고려해 자동 매칭)
              </div>
              <div>
                <strong>월세</strong> — 보증금 + 월세 한도
              </div>
              <div className="pt-2 border-t border-blue-200/60 text-blue-800/80">
                ※ 매물 정보는 회원 가입 후 상세 페이지에서 더 풍부하게 확인하실
                수 있습니다.
              </div>
            </div>
          </div>

          {/* 폼 */}
          <div className="lg:col-span-2">
            <div className="bg-white border rounded-lg p-6">
              <h2 className="text-base font-bold text-neutral-900 mb-1">
                매수 의뢰 폼
              </h2>
              <p className="text-xs text-neutral-500 mb-5">
                거래 형태에 따라 입력 항목이 달라집니다. 조건이 구체적일수록
                더 정확한 매물 추천이 가능합니다.
              </p>
              <BuyRequestForm />
            </div>

            <div className="mt-4 text-xs text-neutral-400 flex items-start gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
              <span>
                의뢰자 정보 및 매수 조건은 매물 매칭 목적으로만 사용되며 외부
                공유되지 않습니다.
              </span>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}

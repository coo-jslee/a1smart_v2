/**
 * 매도 의뢰 페이지 `/intake` — M7 후속.
 *
 *  - 의뢰인 정보 (이름·연락처)
 *  - 매물 정보 (소재지·종류·면적·희망 가격)
 *  - 매도위임 동의·개인정보 동의
 *  - 제출 → inquiries 테이블 (inquiry_type='sell')
 */
import { CheckCircle2, FileText, Sparkles, Shield } from "lucide-react";
import { PublicNavbar } from "@/components/public/public-navbar";
import { PublicFooter } from "@/components/public/public-footer";
import { IntakeForm } from "./intake-form";

export const dynamic = "force-dynamic";

export default function IntakePage() {
  return (
    <div className="flex flex-col flex-1 min-h-screen bg-neutral-50/40">
      <PublicNavbar />

      <section className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100/60 text-blue-900 text-xs font-medium mb-4">
            <Sparkles className="h-3 w-3" />
            매도 의뢰
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
            매물 등록 의뢰
          </h1>
          <p className="mt-3 text-sm text-neutral-600 leading-relaxed max-w-3xl">
            소유하신 부동산을 매도 의뢰하시면 AI 자동 분석 + 합의시세 산출 +
            분석보고서 발행까지 진행합니다. 의뢰 접수 후 영업일 1일 이내
            담당자가 연락드립니다.
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
                  { t: "의뢰 접수", d: "이 폼 제출 후 담당자 1일 이내 연락" },
                  { t: "공부 발급", d: "등기·토지·건축 PDF 발급 협의" },
                  { t: "AI 자동 분석", d: "1분 내 매물 정보 자동 추출" },
                  { t: "합의시세 산출", d: "6개 평가방법 + 외부 평가 가중평균" },
                  { t: "분석보고서 발행", d: "DOCX 자동 생성 → 다운로드 제공" },
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-900 flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {i + 1}
                    </div>
                    <div>
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

            <div className="bg-blue-50/40 border border-blue-100 rounded-lg p-4 space-y-2 text-xs text-blue-900 leading-relaxed">
              <div className="flex items-start gap-2">
                <Shield className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                <span>
                  의뢰자 정보 및 매물 정보는 매도 검토 목적으로만 사용되며
                  외부 공유되지 않습니다.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <FileText className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                <span>
                  등기부등본 자동 발급은 매도위임 동의 후에만 진행됩니다 (관련
                  법규 준수).
                </span>
              </div>
            </div>
          </div>

          {/* 폼 */}
          <div className="lg:col-span-2">
            <div className="bg-white border rounded-lg p-6">
              <h2 className="text-base font-bold text-neutral-900 mb-1">
                매도 의뢰 폼
              </h2>
              <p className="text-xs text-neutral-500 mb-5">
                필수 항목을 입력 후 제출해 주세요. 항목이 명확할수록 더 정확한
                시세 분석이 가능합니다.
              </p>
              <IntakeForm />
            </div>

            <div className="mt-4 text-xs text-neutral-400 flex items-start gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
              <span>
                의뢰 접수 후 담당자가 연락드리며, 시세 산출 결과를 회원 페이지
                또는 별도 안내로 제공해 드립니다.
              </span>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}

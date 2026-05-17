/**
 * 이용약관 placeholder.
 * 정식 약관 텍스트는 별도 검토 후 교체 예정.
 */
import Link from "next/link";
import { PublicNavbar } from "@/components/public/public-navbar";
import { PublicFooter } from "@/components/public/public-footer";

export const metadata = {
  title: "이용약관 — A1Smart",
};

export default function TermsPage() {
  return (
    <div className="dark flex flex-col flex-1 min-h-screen bg-[#0B1F4D] text-white">
      <PublicNavbar />

      <section className="flex-1">
        <div className="max-w-3xl mx-auto px-6 py-14">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            이용<span className="text-yellow-300">약관</span>
          </h1>
          <p className="mt-2 text-sm text-blue-200/70">
            최종 갱신: 2026-05-17 (초안)
          </p>

          <div className="mt-8 space-y-6 text-sm text-blue-100/90 leading-relaxed">
            <section>
              <h2 className="text-base font-bold text-white mb-2">
                제1조 (목적)
              </h2>
              <p>
                본 약관은 에이원스마트부동산중개법인 주식회사(이하 “회사”,
                사업자등록번호{" "}
                <span className="text-yellow-300">845-86-00635</span>)가 제공하는
                AI 부동산 분석 플랫폼 “A1Smart”(이하 “서비스”)의 이용 조건 및
                절차, 회사와 회원의 권리·의무·책임을 규정함을 목적으로 합니다.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-white mb-2">
                제2조 (서비스 내용)
              </h2>
              <ul className="list-disc list-inside space-y-1 text-blue-100/80">
                <li>공부(등기·토지·건축) AI 자동 분석</li>
                <li>국토부 실거래가 기반 합의시세 산출</li>
                <li>권리하자 위험등급 진단</li>
                <li>분석보고서 자동 발행(DOCX)</li>
                <li>매물 등록·문의 중개 서비스</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-bold text-white mb-2">
                제3조 (분석 결과의 한계)
              </h2>
              <p>
                본 서비스에서 제공하는 합의시세·세무 추정·권리분석 결과는 AI
                자동화에 의한{" "}
                <strong className="text-yellow-300">참고용 정보</strong>입니다.
                실제 투자·매수 결정 전 반드시 변호사·세무사·법무사 등 전문가의
                검토를 받으시기 바랍니다.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-white mb-2">
                제4조 (회원의 의무)
              </h2>
              <ul className="list-disc list-inside space-y-1 text-blue-100/80">
                <li>본인 정보를 사실대로 등록할 것</li>
                <li>제3자의 개인정보·매물 정보를 무단 등록하지 않을 것</li>
                <li>
                  서비스 이용 중 알게 된 타인의 정보를 외부 유출하지 않을 것
                </li>
                <li>
                  분석보고서를 회사 동의 없이 영리 목적으로 재배포하지 않을 것
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-bold text-white mb-2">
                제5조 (책임의 제한)
              </h2>
              <p>
                회사는 AI 분석 결과의 정확성을 보장하기 위해 노력하나, 결과
                활용으로 인해 발생한 직·간접적 손해에 대해서는 책임을 지지
                않습니다. 단, 회사의 고의·중과실로 인한 경우는 예외로 합니다.
              </p>
            </section>

            <section className="border-t border-white/10 pt-6">
              <p className="text-xs text-blue-300/60 italic">
                ※ 본 약관은 초안입니다. 정식 시행 전 변호사 검토를 거친 최종본으로
                교체됩니다. 문의는{" "}
                <Link
                  href="/contact"
                  className="text-yellow-300 hover:text-yellow-200 hover:underline"
                >
                  문의 페이지
                </Link>
                를 이용해 주세요.
              </p>
            </section>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}

/**
 * 개인정보처리방침 placeholder.
 * 정식 약관 텍스트는 별도 검토 후 교체 예정.
 */
import Link from "next/link";
import { PublicNavbar } from "@/components/public/public-navbar";
import { PublicFooter } from "@/components/public/public-footer";

export const metadata = {
  title: "개인정보처리방침 — A1Smart",
};

export default function PrivacyPage() {
  return (
    <div className="flex flex-col flex-1 min-h-screen bg-white">
      <PublicNavbar />

      <section className="flex-1">
        <div className="max-w-3xl mx-auto px-6 py-14">
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
            개인정보처리방침
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            최종 갱신: 2026-05-17 (초안)
          </p>

          <div className="mt-8 space-y-6 text-sm text-neutral-700 leading-relaxed">
            <section>
              <h2 className="text-base font-bold text-neutral-900 mb-2">
                1. 개인정보의 수집 항목 및 목적
              </h2>
              <p>
                에이원스마트부동산중개법인은 다음의 개인정보를 수집·이용합니다.
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-neutral-600">
                <li>
                  <strong className="text-neutral-800">회원가입·로그인</strong>:
                  이메일, 비밀번호 (해시), 이름 — 회원 식별 및 분석보고서
                  다운로드 권한 부여
                </li>
                <li>
                  <strong className="text-neutral-800">문의·매도 의뢰</strong>:
                  이름, 전화번호, 이메일, 매물 정보, 문의 내용 — 답변 및 의뢰
                  진행
                </li>
                <li>
                  <strong className="text-neutral-800">매물 분석</strong>:
                  공부(등기·토지·건축) 문서의 개인정보(소유자명·주민번호 등)
                  — 단, 주민번호 뒷자리는 자동 마스킹(******) 처리
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-bold text-neutral-900 mb-2">
                2. 개인정보의 보유 및 이용 기간
              </h2>
              <p>
                회원 정보는 회원 탈퇴 시까지, 문의 정보는 접수 후 1년간 보관 후
                자동 파기합니다. 관련 법령에 따라 보존이 필요한 경우 해당
                법령에서 정한 기간 동안 보관합니다.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-neutral-900 mb-2">
                3. 개인정보의 제3자 제공
              </h2>
              <p>
                원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다. 단,
                법령에 의거하거나 수사기관의 요청이 있는 경우 예외로 합니다.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-neutral-900 mb-2">
                4. 개인정보의 안전성 확보 조치
              </h2>
              <p>
                Supabase(인프라 제공자)의 PostgreSQL 행 단위 보안(RLS),
                암호화된 통신(HTTPS), 비밀번호 해시 저장, 접근 권한 분리(role
                기반) 등 기술적·관리적 조치를 시행합니다.
              </p>
            </section>

            <section className="border-t pt-6">
              <p className="text-xs text-neutral-400 italic">
                ※ 본 처리방침은 초안입니다. 정식 시행 전 변호사 검토를 거친
                최종본으로 교체됩니다. 문의는{" "}
                <Link href="/contact" className="text-blue-900 hover:underline">
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

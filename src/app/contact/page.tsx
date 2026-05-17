/**
 * 일반 문의 페이지 `/contact` — M7 후속.
 *
 *  - 연락처 정보 (전화·이메일·주소·영업시간 — placeholder)
 *  - 문의 폼: 이름·연락처·문의 유형·내용
 *  - 제출 → submitInquiry Server Action → inquiries 테이블 저장
 */
import { Mail, Phone, MapPin, Clock } from "lucide-react";
import { PublicNavbar } from "@/components/public/public-navbar";
import { PublicFooter } from "@/components/public/public-footer";
import { ContactForm } from "./contact-form";

export const dynamic = "force-dynamic";

export default function ContactPage() {
  return (
    <div className="flex flex-col flex-1 min-h-screen bg-neutral-50/40">
      <PublicNavbar />

      <section className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
            문의하기
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            매물 문의·일반 문의는 폼으로, 매도 의뢰는{" "}
            <a href="/intake" className="text-blue-900 hover:underline">
              매도 의뢰 페이지
            </a>{" "}
            를 이용해 주세요.
          </p>
        </div>
      </section>

      <section className="flex-1">
        <div className="max-w-5xl mx-auto px-6 py-10 grid md:grid-cols-3 gap-8">
          {/* 연락처 정보 */}
          <div className="md:col-span-1 space-y-4">
            <div className="bg-white border rounded-lg p-5">
              <h2 className="text-base font-bold text-neutral-900 mb-4">
                연락처
              </h2>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-3">
                  <Phone className="h-4 w-4 text-blue-900 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-xs text-neutral-500">전화</div>
                    <div className="text-neutral-800">(추후 안내)</div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Mail className="h-4 w-4 text-blue-900 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-xs text-neutral-500">이메일</div>
                    <a
                      href="mailto:coo@aonesmart.biz"
                      className="text-neutral-800 hover:text-blue-900 hover:underline"
                    >
                      coo@aonesmart.biz
                    </a>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-blue-900 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-xs text-neutral-500">본점 소재지</div>
                    <div className="text-neutral-800 leading-relaxed">
                      서울특별시 강서구
                      <br />
                      강서로56길 44, 201호
                      <br />
                      (등촌동, 엘크루 발산)
                    </div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Clock className="h-4 w-4 text-blue-900 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-xs text-neutral-500">영업시간</div>
                    <div className="text-neutral-800">평일 09:00 ~ 18:00</div>
                    <div className="text-xs text-neutral-500 mt-0.5">
                      주말·공휴일 휴무
                    </div>
                  </div>
                </li>
              </ul>
            </div>

            <div className="bg-blue-50/40 border border-blue-100 rounded-lg p-4 text-xs text-blue-900 leading-relaxed">
              회원가입 후 매물 상세 페이지에서 외부용 분석보고서를 직접
              다운로드하실 수 있습니다. 가입은 1분이면 충분합니다.
            </div>
          </div>

          {/* 문의 폼 */}
          <div className="md:col-span-2">
            <div className="bg-white border rounded-lg p-6">
              <h2 className="text-base font-bold text-neutral-900 mb-1">
                온라인 문의
              </h2>
              <p className="text-xs text-neutral-500 mb-5">
                담당자가 영업일 24시간 이내 답변 드립니다.
              </p>
              <ContactForm />
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}

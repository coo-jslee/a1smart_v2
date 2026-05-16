/**
 * 공개 페이지 공용 푸터 (홈/매물 리스트/매물 상세 공유).
 */
import Link from "next/link";

export function PublicFooter() {
  return (
    <footer className="border-t bg-white mt-16">
      <div className="max-w-6xl mx-auto px-6 py-10 grid gap-8 md:grid-cols-3 text-sm">
        <div>
          <div className="font-bold text-neutral-900">에이원스마트부동산중개법인</div>
          <p className="mt-2 text-xs text-neutral-500 leading-relaxed">
            30년 경력 부동산·금융 전문가가 설계한 AI 자동화 플랫폼.
            <br />
            공부 자동분석, 합의시세 산정, 권리하자 진단을 한 곳에서.
          </p>
        </div>
        <div>
          <div className="font-bold text-neutral-900">바로가기</div>
          <ul className="mt-2 space-y-1 text-xs text-neutral-500">
            <li>
              <Link href="/" className="hover:text-neutral-900">
                홈
              </Link>
            </li>
            <li>
              <Link href="/properties" className="hover:text-neutral-900">
                매물 보기
              </Link>
            </li>
            <li>
              <Link href="/signup" className="hover:text-neutral-900">
                회원가입 (보고서 다운로드)
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <div className="font-bold text-neutral-900">법적 고지</div>
          <ul className="mt-2 space-y-1 text-xs text-neutral-500">
            <li>
              <Link href="/privacy" className="hover:text-neutral-900">
                개인정보처리방침
              </Link>
            </li>
            <li>
              <Link href="/terms" className="hover:text-neutral-900">
                이용약관
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-neutral-900">
                문의
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t">
        <div className="max-w-6xl mx-auto px-6 py-4 text-xs text-neutral-400 flex flex-wrap items-center justify-between gap-2">
          <div>
            © {new Date().getFullYear()} 에이원스마트부동산중개법인. All rights reserved.
          </div>
          <div className="text-neutral-400">
            본 사이트의 분석 결과는 참고용입니다. 투자 결정 전 전문가 검토를 권장합니다.
          </div>
        </div>
      </div>
    </footer>
  );
}

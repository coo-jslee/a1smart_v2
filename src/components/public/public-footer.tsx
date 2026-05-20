/**
 * 공개 페이지 공용 푸터 (다크 네이비 톤).
 */
import Link from "next/link";

export function PublicFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#030B22] mt-16">
      <div className="max-w-6xl mx-auto px-6 py-10 grid gap-8 md:grid-cols-3 text-sm">
        <div>
          <div className="font-bold text-white">
            에이원스마트부동산중개법인 주식회사
          </div>
          <p className="mt-2 text-xs text-blue-200/70 leading-relaxed">
            공인회계사·세무사·변호사 전문가 집단과 AI가 함께하는
            <br />
            부동산 의사결정 파트너. 매물 발굴·권리분석·세무 전략을 한 곳에서.
          </p>
          <dl className="mt-4 text-xs text-blue-200/70 space-y-1">
            <div className="flex gap-2">
              <dt className="text-blue-300/60 w-16 flex-shrink-0">대표자</dt>
              <dd className="text-blue-100">강창구</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-blue-300/60 w-16 flex-shrink-0">사업자번호</dt>
              <dd className="text-blue-100">845-86-00635</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-blue-300/60 w-16 flex-shrink-0">법인번호</dt>
              <dd className="text-blue-100">110111-3670290</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-blue-300/60 w-16 flex-shrink-0">소재지</dt>
              <dd className="text-blue-100">
                서울특별시 강서구 강서로56길 44, 201호
                <br />
                (등촌동, 엘크루 발산)
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-blue-300/60 w-16 flex-shrink-0">이메일</dt>
              <dd>
                <a
                  href="mailto:coo@aonesmart.biz"
                  className="text-yellow-300 hover:text-yellow-200 hover:underline"
                >
                  coo@aonesmart.biz
                </a>
              </dd>
            </div>
          </dl>
        </div>
        <div>
          <div className="font-bold text-white">바로가기</div>
          <ul className="mt-2 space-y-1 text-xs text-blue-200/70">
            <li>
              <Link href="/" className="hover:text-yellow-300">
                홈
              </Link>
            </li>
            <li>
              <Link href="/properties" className="hover:text-yellow-300">
                매물 보기
              </Link>
            </li>
            <li>
              <Link href="/buy-request" className="hover:text-yellow-300">
                매수 의뢰 (매매·전세·월세)
              </Link>
            </li>
            <li>
              <Link href="/intake" className="hover:text-yellow-300">
                매도 의뢰
              </Link>
            </li>
            <li>
              <Link href="/experts" className="hover:text-yellow-300">
                전문가 소개
              </Link>
            </li>
            <li>
              <Link href="/about" className="hover:text-yellow-300">
                회사 소개
              </Link>
            </li>
            <li>
              <Link href="/signup" className="hover:text-yellow-300">
                회원가입 (보고서 다운로드)
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <div className="font-bold text-white">법적 고지</div>
          <ul className="mt-2 space-y-1 text-xs text-blue-200/70">
            <li>
              <Link href="/privacy" className="hover:text-yellow-300">
                개인정보처리방침
              </Link>
            </li>
            <li>
              <Link href="/terms" className="hover:text-yellow-300">
                이용약관
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-yellow-300">
                문의
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-4 text-xs text-blue-300/50 flex flex-wrap items-center justify-between gap-2">
          <div>
            © {new Date().getFullYear()} 에이원스마트부동산중개법인 주식회사. All rights reserved.
          </div>
          <div>
            본 사이트의 분석 결과는 참고용입니다. 투자 결정 전 전문가 검토를 권장합니다.
          </div>
        </div>
      </div>
    </footer>
  );
}

/**
 * 도시 스카이라인 배너 섹션.
 *
 *  - 노션 메인 페이지(에이원스마트 _Homepage)의 서울 스카이라인(롯데타워·남산타워, 석양)
 *    분위기를 SVG 실루엣 + 그라데이션으로 재현.
 *  - 사용자가 public/skyline.jpg 를 추가하면 자동으로 사진 배경으로 교체됨 (CSS background-image).
 *
 *  내용:
 *    "서울 부동산을 가장 정확하게 — AI 와 30년 경력의 만남"
 */

const SKYLINE_IMAGE = "/skyline.jpg"; // 사용자가 public/skyline.jpg 저장 시 자동 사용

export function SkylineBanner() {
  return (
    <section className="relative overflow-hidden border-y border-blue-950/30 min-h-[420px] md:min-h-[520px]">
      {/* 배경: 사진 풀폭 cover (석양·롯데타워·남산타워 원본 살리기) */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${SKYLINE_IMAGE})` }}
      />
      {/* 옅은 그라데이션 오버레이 — 사진 자연스럽게 + 좌측 텍스트 가독성 */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40" />

      {/* 콘텐츠 — 좌측 정렬 (이미지 우측 석양·롯데타워 시선 우선) */}
      <div className="relative max-w-6xl mx-auto px-6 py-20 md:py-28">
        <div className="max-w-xl">
          <p className="text-cyan-300 text-xs font-semibold tracking-wider uppercase mb-3 drop-shadow-md">
            A1Smart × 부동산 의사결정 파트너
          </p>
          <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight drop-shadow-lg">
            중개는 시작일 뿐입니다.
            <br />
            <span className="text-cyan-200">취득·보유·승계의 절세까지.</span>
          </h2>
          <p className="mt-5 text-sm md:text-base text-white/95 leading-relaxed drop-shadow-md">
            매물 발굴부터 권리분석·합의시세, 그리고 법인세·상속세·법인전환
            전략까지 — 전문가 집단과 AI가 한 곳에서 설계합니다.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 text-xs text-cyan-100/90">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-pulse" />
            공인회계사·세무사·변호사 + AI
          </div>
        </div>
      </div>
    </section>
  );
}

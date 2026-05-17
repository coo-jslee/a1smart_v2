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
    <section className="relative overflow-hidden border-y border-blue-950/30">
      {/* 배경: 사진 (있으면) + 짙은 네이비 → 황금빛 폴백 그라데이션 */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-[#1A3D7A] via-[#4A3A6B] to-[#C97B4A] bg-cover bg-center"
        style={{ backgroundImage: `url(${SKYLINE_IMAGE})` }}
      />
      {/* 어두운 오버레이 (텍스트 가독성) */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/30" />

      {/* 스카이라인 SVG (사진 없을 때 폴백) — 사진 있으면 mix-blend 로 살짝 강조 */}
      <svg
        viewBox="0 0 1200 200"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMax slice"
        className="absolute bottom-0 left-0 right-0 w-full h-3/5 opacity-50 mix-blend-multiply pointer-events-none"
        aria-hidden="true"
      >
        {/* 도시 실루엣 — 건물 그룹 */}
        <g fill="#0B1F4D">
          {/* 좌측 저층 빌딩 */}
          <rect x="0" y="120" width="40" height="80" />
          <rect x="40" y="100" width="30" height="100" />
          <rect x="70" y="110" width="50" height="90" />
          <rect x="120" y="130" width="35" height="70" />
          <rect x="155" y="115" width="45" height="85" />
          <rect x="200" y="95" width="55" height="105" />
          <rect x="255" y="125" width="30" height="75" />
          {/* 롯데타워 흉내 (좌측 1/3 위치) */}
          <polygon points="290,50 320,20 350,50 350,200 290,200" />
          <rect x="285" y="55" width="70" height="145" />
          {/* 중층 빌딩 클러스터 */}
          <rect x="370" y="100" width="40" height="100" />
          <rect x="410" y="80" width="50" height="120" />
          <rect x="460" y="120" width="35" height="80" />
          <rect x="495" y="90" width="55" height="110" />
          <rect x="550" y="110" width="40" height="90" />
          {/* 남산타워 흉내 (가운데 우측) */}
          <rect x="610" y="60" width="6" height="140" />
          <polygon points="600,60 613,30 626,60" />
          <rect x="595" y="70" width="36" height="14" />
          {/* 중층 빌딩 */}
          <rect x="650" y="105" width="45" height="95" />
          <rect x="695" y="85" width="40" height="115" />
          <rect x="735" y="120" width="35" height="80" />
          <rect x="770" y="95" width="55" height="105" />
          <rect x="825" y="115" width="40" height="85" />
          <rect x="865" y="100" width="50" height="100" />
          <rect x="915" y="125" width="35" height="75" />
          <rect x="950" y="105" width="45" height="95" />
          <rect x="995" y="115" width="40" height="85" />
          <rect x="1035" y="95" width="55" height="105" />
          <rect x="1090" y="120" width="40" height="80" />
          <rect x="1130" y="110" width="40" height="90" />
          <rect x="1170" y="125" width="30" height="75" />
        </g>
        {/* 빌딩 창문 빛 — 작은 점들 */}
        <g fill="#FCD34D" opacity="0.7">
          {[
            [50, 150],
            [85, 140],
            [220, 130],
            [310, 90],
            [320, 110],
            [310, 130],
            [320, 160],
            [420, 130],
            [510, 130],
            [560, 140],
            [710, 130],
            [790, 130],
            [870, 130],
            [970, 140],
            [1050, 130],
            [1100, 150],
          ].map(([x, y], i) => (
            <rect key={i} x={x} y={y} width="2" height="3" />
          ))}
        </g>
      </svg>

      {/* 콘텐츠 */}
      <div className="relative max-w-6xl mx-auto px-6 py-20 text-center">
        <p className="text-cyan-300 text-xs font-semibold tracking-wider uppercase mb-3">
          A1Smart × 서울 부동산
        </p>
        <h2 className="text-2xl md:text-4xl font-bold text-white leading-tight">
          서울 부동산을 가장 정확하게
          <br />
          <span className="text-cyan-200">AI와 30년 경력의 만남</span>
        </h2>
        <p className="mt-4 text-sm md:text-base text-blue-100/90 max-w-xl mx-auto">
          매물 발굴부터 권리분석·합의시세·분석보고서 발행까지
          <br className="hidden md:inline" />
          한 곳에서 완결되는 부동산 AI 자동화 플랫폼
        </p>
      </div>
    </section>
  );
}

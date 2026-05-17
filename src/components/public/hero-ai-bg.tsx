/**
 * Hero 배경 SVG — AI 회로 + 집 + 노드 네트워크 모티프.
 *
 *  - 노션 메인 페이지(에이원스마트 _Homepage)의 "AI 활용 더 똑똑한 부동산중개법인"
 *    배너 톤(짙은 네이비 + 청록 네온)에 맞춰 직접 작성.
 *  - 절대 위치로 Hero 영역 우측에 배치. 모바일에서는 opacity 낮춰 텍스트 가독성 우선.
 *  - 외부 이미지 의존 0 — 로딩 즉시 표시.
 *
 *  추후 사용자가 public/hero-ai.png (노션 배너 원본) 을 추가하면
 *  page.tsx 에서 이 컴포넌트 대신 <img>/<Image> 사용 가능.
 */

export function HeroAiBg() {
  return (
    <svg
      viewBox="0 0 600 600"
      xmlns="http://www.w3.org/2000/svg"
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden="true"
    >
      <defs>
        {/* 청록 네온 그라데이션 */}
        <linearGradient id="cyan-glow" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.6" />
        </linearGradient>
        <radialGradient id="center-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.35" />
          <stop offset="60%" stopColor="#1A3D7A" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#0B1F4D" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="line-fade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#22D3EE" stopOpacity="0" />
          <stop offset="50%" stopColor="#22D3EE" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#22D3EE" stopOpacity="0" />
        </linearGradient>

        {/* 그리드 패턴 (배경 톤) */}
        <pattern
          id="grid"
          width="40"
          height="40"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 40 0 L 0 0 0 40"
            fill="none"
            stroke="#1A3D7A"
            strokeOpacity="0.25"
            strokeWidth="0.5"
          />
        </pattern>

        {/* 글로우 필터 */}
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* 1) 배경 그리드 */}
      <rect width="600" height="600" fill="url(#grid)" />

      {/* 2) 중앙 글로우 */}
      <circle cx="300" cy="300" r="280" fill="url(#center-glow)" />

      {/* 3) 노드 네트워크 (배경 점들) */}
      {[
        [80, 90],
        [520, 110],
        [60, 280],
        [540, 290],
        [100, 470],
        [510, 480],
        [200, 70],
        [400, 75],
        [180, 530],
        [420, 525],
      ].map(([x, y], i) => (
        <g key={i}>
          <circle
            cx={x}
            cy={y}
            r="3"
            fill="#22D3EE"
            opacity="0.6"
            filter="url(#glow)"
          />
          <circle cx={x} cy={y} r="1.5" fill="#67E8F9" />
        </g>
      ))}

      {/* 4) 연결선 (노드 간) */}
      <g
        stroke="url(#line-fade)"
        strokeWidth="1"
        fill="none"
        opacity="0.7"
      >
        <line x1="80" y1="90" x2="200" y2="70" />
        <line x1="200" y1="70" x2="400" y2="75" />
        <line x1="400" y1="75" x2="520" y2="110" />
        <line x1="60" y1="280" x2="180" y2="530" />
        <line x1="540" y1="290" x2="420" y2="525" />
        <line x1="180" y1="530" x2="420" y2="525" />
        <line x1="80" y1="90" x2="60" y2="280" />
        <line x1="520" y1="110" x2="540" y2="290" />
      </g>

      {/* 5) 회로 트레이스 (모서리에서 중앙으로) */}
      <g
        stroke="#22D3EE"
        strokeWidth="1.2"
        fill="none"
        opacity="0.55"
        strokeLinecap="round"
      >
        <path d="M 0 150 L 100 150 L 130 180 L 200 180" />
        <path d="M 600 200 L 500 200 L 470 230 L 400 230" />
        <path d="M 0 450 L 100 450 L 130 420 L 200 420" />
        <path d="M 600 400 L 500 400 L 470 370 L 400 370" />
      </g>

      {/* 6) 중앙 집(home) + 회로 (메인 모티프) */}
      <g transform="translate(300, 300)" filter="url(#glow)">
        {/* 집 외곽 */}
        <path
          d="M -90 30 L -90 90 L 90 90 L 90 30 L 0 -60 Z"
          fill="none"
          stroke="url(#cyan-glow)"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {/* 집 입구 */}
        <rect
          x="-20"
          y="40"
          width="40"
          height="50"
          fill="none"
          stroke="#22D3EE"
          strokeWidth="1.5"
          opacity="0.7"
        />
        {/* 집 안쪽 회로 패턴 (두뇌 흉내) */}
        <g stroke="#67E8F9" strokeWidth="1" fill="none" opacity="0.85">
          <circle cx="0" cy="0" r="22" />
          <circle cx="-30" cy="-10" r="3" fill="#67E8F9" />
          <circle cx="30" cy="-10" r="3" fill="#67E8F9" />
          <circle cx="0" cy="-30" r="3" fill="#67E8F9" />
          <circle cx="-15" cy="20" r="2" fill="#22D3EE" />
          <circle cx="15" cy="20" r="2" fill="#22D3EE" />
          <line x1="-30" y1="-10" x2="-22" y2="-4" />
          <line x1="30" y1="-10" x2="22" y2="-4" />
          <line x1="0" y1="-30" x2="0" y2="-22" />
          <line x1="-15" y1="20" x2="-8" y2="14" />
          <line x1="15" y1="20" x2="8" y2="14" />
        </g>
        {/* 굴뚝 라인 */}
        <line
          x1="0"
          y1="-60"
          x2="0"
          y2="-95"
          stroke="#22D3EE"
          strokeWidth="1.5"
          opacity="0.6"
        />
        <circle
          cx="0"
          cy="-100"
          r="4"
          fill="#22D3EE"
          opacity="0.9"
        />
      </g>

      {/* 7) 데이터 라인 — 좌하 → 우상 흐름 */}
      <g
        stroke="#22D3EE"
        strokeWidth="0.8"
        fill="none"
        opacity="0.35"
        strokeDasharray="3 3"
      >
        <path d="M 0 600 Q 200 500, 300 300 T 600 0" />
        <path d="M 0 500 Q 200 400, 300 300 T 600 100" />
      </g>
    </svg>
  );
}

/**
 * Hero 우주 배경 — 별·은하수·유성 SVG.
 *
 *  - mateplus.net 벤치마킹: 짙은 네이비 밤하늘 톤
 *  - 좌표는 고정 배열 (Server Component hydration mismatch 방지 — random 미사용)
 *  - 절대 위치로 Hero 섹션 전체를 채움
 */

// 별 좌표 — [x%, y%, r, opacity]
const STARS: [number, number, number, number][] = [
  [6, 12, 1.2, 0.9], [14, 28, 0.8, 0.5], [22, 8, 1.5, 0.85], [31, 19, 0.7, 0.4],
  [38, 34, 1.0, 0.7], [44, 11, 1.3, 0.85], [52, 24, 0.6, 0.4], [58, 40, 1.1, 0.6],
  [64, 7, 0.9, 0.55], [71, 30, 1.4, 0.9], [77, 16, 0.7, 0.45], [83, 37, 1.0, 0.65],
  [88, 9, 1.2, 0.8], [93, 26, 0.8, 0.5], [9, 46, 1.0, 0.6], [17, 58, 0.7, 0.4],
  [26, 68, 1.3, 0.75], [34, 52, 0.9, 0.5], [41, 64, 0.6, 0.35], [49, 74, 1.1, 0.7],
  [56, 56, 0.8, 0.45], [63, 70, 1.4, 0.85], [69, 60, 0.7, 0.4], [76, 76, 1.0, 0.6],
  [82, 54, 1.2, 0.7], [89, 66, 0.8, 0.5], [95, 48, 1.0, 0.6], [3, 78, 0.9, 0.55],
  [12, 88, 1.1, 0.65], [29, 84, 0.7, 0.4], [46, 90, 1.0, 0.6], [67, 86, 0.8, 0.45],
  [85, 82, 1.3, 0.75], [97, 90, 0.9, 0.5], [20, 40, 0.6, 0.35], [50, 5, 0.9, 0.6],
  // 추가 별 — 밀도 보강
  [10, 6, 0.7, 0.5], [35, 4, 0.6, 0.4], [55, 14, 0.9, 0.6], [73, 44, 0.7, 0.4],
  [91, 18, 0.6, 0.45], [4, 34, 0.8, 0.5], [27, 30, 0.6, 0.35], [42, 46, 0.7, 0.4],
  [60, 9, 0.6, 0.4], [78, 60, 0.9, 0.55], [86, 28, 0.7, 0.4], [15, 70, 0.6, 0.35],
  [38, 80, 0.8, 0.5], [54, 82, 0.6, 0.4], [72, 92, 0.7, 0.45], [99, 70, 0.8, 0.5],
];

export function HeroStarfield() {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      preserveAspectRatio="xMidYMid slice"
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        {/* 은하수 — 대각선으로 흐르는 옅은 빛 띠 */}
        <linearGradient id="milkyway" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#1A3D7A" stopOpacity="0" />
          <stop offset="45%" stopColor="#2E5A9E" stopOpacity="0.22" />
          <stop offset="60%" stopColor="#3B6FB5" stopOpacity="0.14" />
          <stop offset="100%" stopColor="#1A3D7A" stopOpacity="0" />
        </linearGradient>
        {/* 좌상단 푸른 성운 글로우 */}
        <radialGradient id="nebula-a" cx="22%" cy="18%" r="40%">
          <stop offset="0%" stopColor="#3B6FB5" stopOpacity="0.30" />
          <stop offset="100%" stopColor="#0B1F4D" stopOpacity="0" />
        </radialGradient>
        {/* 우하단 청록 성운 글로우 */}
        <radialGradient id="nebula-b" cx="82%" cy="80%" r="44%">
          <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#0B1F4D" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* 성운 글로우 */}
      <rect width="100" height="100" fill="url(#nebula-a)" />
      <rect width="100" height="100" fill="url(#nebula-b)" />
      {/* 은하수 띠 (대각선 회전) */}
      <rect
        x="-30"
        y="20"
        width="160"
        height="34"
        fill="url(#milkyway)"
        transform="rotate(-22 50 50)"
      />

      {/* 별 */}
      {STARS.map(([x, y, r, o], i) => (
        <circle key={i} cx={x} cy={y} r={r * 0.18} fill="#FFFFFF" opacity={o} />
      ))}

      {/* 유성 2개 — 가는 대각선 */}
      <line
        x1="68" y1="6" x2="84" y2="20"
        stroke="#BAE6FD" strokeWidth="0.25" strokeLinecap="round" opacity="0.7"
      />
      <line
        x1="10" y1="34" x2="20" y2="42"
        stroke="#E0F2FE" strokeWidth="0.18" strokeLinecap="round" opacity="0.5"
      />
    </svg>
  );
}

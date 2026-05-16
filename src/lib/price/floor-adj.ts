/**
 * 층 보정 계수 (v1.7 price_estimator.FLOOR_ADJUSTMENT).
 *
 * 서울 빌라·도시형생활주택 경험치:
 *   1F: -8%, 2F: -3%, 3~4F: 0%, 5F: +2%, 6F: +5% (펜트), 7F+: +3%
 *   최상층(top floor)이면 펜트 보너스 자동 추가.
 */

export const FLOOR_ADJUSTMENT: Record<number, number> = {
  1: -0.08,
  2: -0.03,
  3: 0.0,
  4: 0.0,
  5: 0.02,
  6: 0.05,
};
export const DEFAULT_TOP_BONUS = 0.03;        // 7층 이상 기본
export const DEFAULT_JEONSE_RATIO = 0.78;     // 서울 빌라 평균 전세가율
export const NEW_BUILDING_BONUS = 0.03;       // 준공 5년 이내 +3%
export const APPRAISAL_DISCOUNT = 0.85;       // 감정가 → 시세 환산 계수
export const AUCTION_TO_NORMAL_PREMIUM = 1.15; // 경매낙찰가 → 정상가 환산 계수

/**
 * 층 보정 계수 반환. 총 층수가 있으면 최상층 펜트 보너스 자동 적용.
 */
export function floorFactor(
  floor: number | null | undefined,
  totalFloors?: number | null,
): number {
  if (floor === null || floor === undefined) return 1.0;

  // 최상층 (5층 이상) 펜트 보너스
  if (
    totalFloors !== null &&
    totalFloors !== undefined &&
    floor === totalFloors &&
    floor >= 5
  ) {
    return 1.0 + Math.max(FLOOR_ADJUSTMENT[floor] ?? 0.0, 0.05);
  }

  if (floor in FLOOR_ADJUSTMENT) {
    return 1.0 + FLOOR_ADJUSTMENT[floor];
  }
  if (floor >= 7) {
    return 1.0 + DEFAULT_TOP_BONUS;
  }
  return 1.0;
}

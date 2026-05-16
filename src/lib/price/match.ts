/**
 * 단지명 정규화 + 거래 매칭 (v1.7 price_collector._normalize_complex / _match_item 포팅).
 */
import type { TradeRecord } from "./types";

/**
 * 단지명 정규화: 공백·괄호·특수문자 제거 + 소문자 + 한글 변형 통일.
 * 예: "삼익 EOE" / "삼익이오이" / "삼익(이오이)" → "삼익eoe" 또는 "삼익이오이"
 */
export function normalizeComplexName(name: string | null | undefined): string {
  if (!name) return "";
  let s = name;
  s = s.replace(/[()()\[\]{}<>「」『』]/g, ""); // 괄호류 제거
  s = s.replace(/\s+/g, "");                     // 공백 제거
  s = s.replace(/[·•・\-_/]/g, "");              // 구분자 제거
  return s.toLowerCase();
}

/**
 * 두 단지명의 유사도 매칭.
 * 정규화 후 한쪽이 다른 쪽을 포함하면 true (양방향).
 */
export function matchComplexName(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const na = normalizeComplexName(a);
  const nb = normalizeComplexName(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  return false;
}

/**
 * 거래 record 가 본건 매물과 같은 단지/유사 거래인지 판단.
 */
export function isComplexMatch(
  record: TradeRecord,
  targetComplexName: string | null | undefined,
): boolean {
  if (!record.단지명) return false;
  return matchComplexName(record.단지명, targetComplexName);
}

/**
 * 행정동 평균 ㎡당 단가 산출 (v1.7 _calc_neighborhood_unit_price 포팅).
 * 전체 매매 거래 중 면적이 본건의 ±tol_area㎡ 범위인 것들의 평균.
 */
export function calcNeighborhoodUnitPrice(
  records: TradeRecord[],
  targetArea: number,
  tolArea = 10.0,
): number | null {
  const candidates = records.filter(
    (r) =>
      r.거래유형 === "매매" &&
      r.거래가 > 0 &&
      r.전용면적_m2 > 0 &&
      Math.abs(r.전용면적_m2 - targetArea) <= tolArea,
  );
  if (candidates.length === 0) return null;

  const unitPrices = candidates.map((r) => r.거래가 / r.전용면적_m2);
  // median
  const sorted = [...unitPrices].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/**
 * 배열의 중위값 (median).
 */
export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

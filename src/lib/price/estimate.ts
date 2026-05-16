/**
 * 6개 평가방법 (v1.7 price_estimator.py 100% 포팅).
 *
 *  1) 동일단지 직접매칭     w=1.00  면적 ±5㎡, 층 ±2층 거래 중위값
 *  2A) 동일단지 단가환산(매매)  w=0.85  단지 ㎡단가 × 본건 면적 × 층보정
 *  2B) 동일단지 단가환산(전세)  w=0.50  전세 ㎡단가 ÷ 전세가율
 *  3)  인근단지 단가환산     w=0.50  행정동 평균 × 신축보정 × 층보정
 *  4)  전세가율 역산         w=0.55  전세 중위 ÷ 전세가율(0.78)
 *  5)  외부 추정·감정가      w=0.40~0.70  집품·KB·감정가 × 0.85
 *  6)  경매낙찰 정상가환산   w=0.80(동단지) / 0.40(인근)  낙찰가 × 1.15
 */
import type {
  EstimateResult,
  ExternalValue,
  TradeRecord,
} from "./types";
import { median } from "./match";
import {
  APPRAISAL_DISCOUNT,
  AUCTION_TO_NORMAL_PREMIUM,
  DEFAULT_JEONSE_RATIO,
  NEW_BUILDING_BONUS,
  floorFactor,
} from "./floor-adj";

// ─── 1) 동일단지 직접매칭 ─────────────────────────────────────────────
export function estimateDirectMatch(
  records: TradeRecord[],
  targetArea: number,
  targetFloor: number | null,
  tolArea = 5.0,
  tolFloor = 2,
): EstimateResult | null {
  const cands = records.filter(
    (r) =>
      r.거래유형 === "매매" &&
      r.거래가 > 0 &&
      Math.abs(r.전용면적_m2 - targetArea) <= tolArea &&
      (targetFloor === null ||
        r.층 === null ||
        r.층 === undefined ||
        Math.abs(r.층 - targetFloor) <= tolFloor),
  );
  if (cands.length === 0) return null;

  const m = Math.round(median(cands.map((r) => r.거래가)));
  return {
    method: "동일단지 직접매칭",
    추정가: m,
    가중치: 1.0,
    신뢰도: 100,
    근거: `단지 내 ${cands.length}건 매매 매칭 (면적 ±${tolArea}㎡, 층 ±${tolFloor}) 중위값`,
    raw: { count: cands.length },
  };
}

// ─── 2) 동일단지 단가환산 ─────────────────────────────────────────────
export function estimateUnitPriceWithinComplex(
  records: TradeRecord[],
  targetArea: number,
  targetFloor: number | null,
  totalFloors: number | null,
  options: {
    transactionType?: "매매" | "전세" | "월세";
    convertJeonse?: boolean;
    jeonseRatio?: number;
  } = {},
): EstimateResult | null {
  const transactionType = options.transactionType ?? "매매";
  const convertJeonse = options.convertJeonse ?? false;
  const jeonseRatio = options.jeonseRatio ?? DEFAULT_JEONSE_RATIO;

  let cands: TradeRecord[];
  let methodName: string;
  let weight: number;
  let confidence: number;

  if (convertJeonse) {
    cands = records.filter(
      (r) => r.거래유형 === "전세" && r.거래가 > 0 && r.전용면적_m2 > 0,
    );
    methodName = "동일단지 단가환산(전세역산)";
    weight = 0.5;
    confidence = 60;
  } else {
    cands = records.filter(
      (r) =>
        r.거래유형 === transactionType && r.거래가 > 0 && r.전용면적_m2 > 0,
    );
    methodName = `동일단지 단가환산(${transactionType})`;
    weight = 0.85;
    confidence = 85;
  }

  if (cands.length === 0) return null;

  const unitPrices: number[] = cands.map((r) => {
    let unit = r.거래가 / r.전용면적_m2;
    if (convertJeonse) unit = unit / jeonseRatio;
    if (r.층 !== null && r.층 !== undefined && targetFloor !== null) {
      const adjDiff =
        floorFactor(targetFloor, totalFloors) /
        floorFactor(r.층, totalFloors);
      unit *= adjDiff;
    }
    return unit;
  });

  const medianUnit = median(unitPrices);
  const estimated = Math.round(medianUnit * targetArea);

  const 근거 =
    `단지 ${cands.length}건 ${transactionType} 거래 ㎡당 ${Math.round(medianUnit).toLocaleString()}원` +
    (convertJeonse ? ` × 전세역산(/${jeonseRatio.toFixed(2)})` : "") +
    ` × 본건 ${targetArea}㎡ × 층보정(${targetFloor ?? "-"}F)`;

  return {
    method: methodName,
    추정가: estimated,
    가중치: weight,
    신뢰도: confidence,
    근거,
    raw: { unit_price: medianUnit, count: cands.length },
  };
}

// ─── 3) 인근단지 단가환산 ─────────────────────────────────────────────
export function estimateUnitPriceNeighborhood(
  avgUnitPrice: number,
  targetArea: number,
  targetFloor: number | null,
  totalFloors: number | null,
  options: { newBuilding?: boolean; regionName?: string } = {},
): EstimateResult | null {
  if (avgUnitPrice <= 0) return null;
  const newBuilding = options.newBuilding ?? false;
  const regionName = options.regionName ?? "행정동";

  const fFactor = floorFactor(targetFloor, totalFloors);
  const nFactor = 1.0 + (newBuilding ? NEW_BUILDING_BONUS : 0.0);
  const estimated = Math.round(avgUnitPrice * targetArea * fFactor * nFactor);

  return {
    method: `인근단지 단가환산(${regionName})`,
    추정가: estimated,
    가중치: 0.5,
    신뢰도: 60,
    근거: `${regionName} 평균 ㎡당 ${Math.round(avgUnitPrice).toLocaleString()}원 × ${targetArea}㎡ × 층보정 ${fFactor.toFixed(2)} × 신축보정 ${nFactor.toFixed(2)}`,
    raw: { unit_price: avgUnitPrice },
  };
}

// ─── 4) 전세가율 역산 ─────────────────────────────────────────────────
export function estimateFromJeonseRatio(
  records: TradeRecord[],
  jeonseRatio = DEFAULT_JEONSE_RATIO,
): EstimateResult | null {
  const cands = records.filter((r) => r.거래유형 === "전세" && r.거래가 > 0);
  if (cands.length === 0) return null;

  const medianJeonse = median(cands.map((r) => r.거래가));
  const estimated = Math.round(medianJeonse / jeonseRatio);

  return {
    method: "전세가율 역산",
    추정가: estimated,
    가중치: 0.55,
    신뢰도: 55,
    근거: `단지 전세 ${cands.length}건 중위 ${Math.round(medianJeonse).toLocaleString()}원 ÷ 전세가율 ${jeonseRatio.toFixed(2)}`,
    raw: { jeonse_median: medianJeonse, ratio: jeonseRatio },
  };
}

// ─── 5) 외부 추정·감정가 ──────────────────────────────────────────────
export function estimateFromExternal(
  ev: ExternalValue,
): EstimateResult | null {
  if (!ev || ev.value <= 0) return null;
  const isAppraisal = ev.is_appraisal ?? false;
  const estimated = isAppraisal
    ? Math.round(ev.value * APPRAISAL_DISCOUNT)
    : ev.value;

  return {
    method: `외부추정(${ev.source})`,
    추정가: estimated,
    가중치: ev.weight ?? 0.5,
    신뢰도: ev.confidence ?? 60,
    근거:
      `${ev.source} ${ev.value.toLocaleString()}원` +
      (isAppraisal ? ` × ${APPRAISAL_DISCOUNT}(감정가→시세)` : ""),
    raw: { ...ev },
  };
}

// ─── 6) 경매낙찰 정상가환산 ───────────────────────────────────────────
export function estimateFromAuctionSale(args: {
  auctionPrice: number;
  auctionArea: number;
  auctionFloor: number | null;
  targetArea: number;
  targetFloor: number | null;
  totalFloors: number | null;
  isSameComplex?: boolean;
}): EstimateResult | null {
  const {
    auctionPrice,
    auctionArea,
    auctionFloor,
    targetArea,
    targetFloor,
    totalFloors,
    isSameComplex = true,
  } = args;
  if (auctionPrice <= 0 || auctionArea <= 0) return null;

  const unit = auctionPrice / auctionArea;
  const fDiff =
    floorFactor(targetFloor, totalFloors) / floorFactor(auctionFloor, totalFloors);
  const estimated = Math.round(
    unit * targetArea * fDiff * AUCTION_TO_NORMAL_PREMIUM,
  );

  return {
    method: "경매낙찰 정상가환산",
    추정가: estimated,
    가중치: isSameComplex ? 0.8 : 0.4,
    신뢰도: isSameComplex ? 80 : 50,
    근거: `${isSameComplex ? "동단지" : "인근"} 경매낙찰 ${auctionPrice.toLocaleString()}원 / ${auctionArea}㎡ × 층보정 ${fDiff.toFixed(2)} × 정상가환산 ${AUCTION_TO_NORMAL_PREMIUM}`,
    raw: { auction_price: auctionPrice, auction_area: auctionArea },
  };
}

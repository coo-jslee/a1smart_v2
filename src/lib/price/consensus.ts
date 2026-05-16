/**
 * 합의시세 산출 (v1.7 price_estimator.consensus_estimate + estimate_property_price 포팅).
 *
 *  - 가중평균으로 정상가(normal_price) 산출
 *  - 권리하자 디스카운트 적용 → 최종가(final_price)
 *  - distress_severity: 0.0(정상) / 0.10(가압류·근저당 다수) / 0.20(임의경매+잉여없음) / 0.30(압류·강제경매+다수하자)
 */
import type {
  ConsensusResult,
  EstimateResult,
  EstimatePropertyInput,
} from "./types";
import {
  estimateDirectMatch,
  estimateFromAuctionSale,
  estimateFromExternal,
  estimateFromJeonseRatio,
  estimateUnitPriceNeighborhood,
  estimateUnitPriceWithinComplex,
} from "./estimate";

/**
 * 평가 결과 list → 가중평균 + 디스카운트 적용
 */
export function consensusEstimate(
  estimates: Array<EstimateResult | null | undefined>,
  distressDiscount = 0.0,
): ConsensusResult {
  const valid = estimates.filter(
    (e): e is EstimateResult => e !== null && e !== undefined && e.추정가 > 0,
  );

  if (valid.length === 0) {
    return {
      normal_price: 0,
      final_price: 0,
      distress_discount: distressDiscount,
      weight_sum: 0,
      components: [],
    };
  }

  const weightedSum = valid.reduce((acc, e) => acc + e.추정가 * e.가중치, 0);
  const weightSum = valid.reduce((acc, e) => acc + e.가중치, 0);
  const normal = Math.round(weightedSum / weightSum);
  const final = Math.round(normal * (1.0 - distressDiscount));

  return {
    normal_price: normal,
    final_price: final,
    distress_discount: distressDiscount,
    weight_sum: weightSum,
    components: valid.map((e) => ({
      method: e.method,
      value: e.추정가,
      weight: e.가중치,
      근거: e.근거,
    })),
  };
}

/**
 * 매물 1건 시세 종합 추정 (통합 진입점).
 * v1.7 estimate_property_price() 와 동일 시그니처.
 */
export function estimatePropertyPrice(input: EstimatePropertyInput): ConsensusResult {
  const {
    target_area,
    target_floor,
    total_floors,
    is_new,
    is_distressed,
    distress_severity = 0.2,
    molit_trades = [],
    auction_sales = [],
    external_values = [],
    neighborhood_unit_price,
    neighborhood_name = "행정동",
  } = input;

  const estimates: Array<EstimateResult | null> = [
    // 1) 직접매칭
    estimateDirectMatch(molit_trades, target_area, target_floor),
    // 2A) 매매 단가환산
    estimateUnitPriceWithinComplex(
      molit_trades,
      target_area,
      target_floor,
      total_floors,
      { transactionType: "매매" },
    ),
    // 2B) 전세 단가환산
    estimateUnitPriceWithinComplex(
      molit_trades,
      target_area,
      target_floor,
      total_floors,
      { convertJeonse: true },
    ),
    // 4) 전세가율 역산
    estimateFromJeonseRatio(molit_trades),
  ];

  // 3) 인근단지 단가환산
  if (neighborhood_unit_price && neighborhood_unit_price > 0) {
    estimates.push(
      estimateUnitPriceNeighborhood(
        neighborhood_unit_price,
        target_area,
        target_floor,
        total_floors,
        { newBuilding: is_new, regionName: neighborhood_name },
      ),
    );
  }

  // 6) 경매낙찰 환산
  for (const a of auction_sales) {
    estimates.push(
      estimateFromAuctionSale({
        auctionPrice: a.price,
        auctionArea: a.area,
        auctionFloor: a.floor ?? null,
        targetArea: target_area,
        targetFloor: target_floor,
        totalFloors: total_floors,
        isSameComplex: a.is_same_complex ?? true,
      }),
    );
  }

  // 5) 외부 추정값
  for (const ev of external_values) {
    estimates.push(estimateFromExternal(ev));
  }

  // 합의값
  const discount = is_distressed ? distress_severity : 0.0;
  return consensusEstimate(estimates, discount);
}

/**
 * 위험등급/리스크 요약에서 distress_severity 추정 (v1.7 _decide_distress_discount 포팅).
 *
 * 룰:
 *   강제경매·압류 다수 → 0.30
 *   임의경매 + 잉여 없음 → 0.20
 *   가압류 3건+ 또는 근저당 단지 시세 60%+ → 0.10
 *   그 외 정상 → 0.0
 */
export function decideDistressSeverity(args: {
  isDistressed: boolean;
  riskGrade: string | null;
  riskSummary: string | null;
  mortgageTotal: number;
  attachmentCount: number;
  hasAuction: boolean;
}): number {
  if (!args.isDistressed) return 0.0;

  const summary = (args.riskSummary ?? "").toLowerCase();

  if (summary.includes("강제경매") || summary.includes("압류")) return 0.3;
  if (summary.includes("임의경매") || args.hasAuction) return 0.2;
  if (args.attachmentCount >= 3) return 0.15;
  if (args.attachmentCount >= 1 || args.mortgageTotal > 0) return 0.1;

  return 0.0;
}

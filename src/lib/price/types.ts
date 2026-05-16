/**
 * 시세 평가 공용 타입 (v1.7 price_collector.TradeRecord 등 포팅).
 */

export type TradeType = "매매" | "전세" | "월세";

export type TradeRecord = {
  거래유형: TradeType;
  거래가: number;            // 매매가 / 전세보증금 / 월세보증금 (원 단위)
  월세?: number;             // 월세만 해당 (원/월)
  전용면적_m2: number;
  층?: number | null;
  계약일?: string;           // YYYY-MM-DD
  단지명?: string;
  출처: string;              // 국토부실거래 / 경매(법원) / KB / 집품AI 등
  신뢰도: number;            // 0~100
};

export type AuctionRecord = {
  사건번호: string;
  감정가?: number;
  최저매각가?: number;
  매각가?: number;           // 낙찰가
  유찰회차?: number;
  매각일?: string;
  단지명?: string;
  전용면적_m2?: number;
  층?: number | null;
};

export type ExternalValue = {
  value: number;
  source: string;            // "집품 AI" / "KB시세" / "법원감정가" 등
  weight?: number;           // 0.40~0.70 (기본 0.50)
  confidence?: number;       // 0~100
  is_appraisal?: boolean;    // true면 × 0.85 적용 (감정가 환산)
};

/** 단일 평가 결과 */
export type EstimateResult = {
  method: string;            // 한글 방법명
  추정가: number;            // 원 단위
  가중치: number;            // 0.0~1.0
  신뢰도: number;            // 0~100
  근거: string;
  raw?: Record<string, unknown>;
};

/** 합의시세 (가중평균 + 권리하자 디스카운트 적용) */
export type ConsensusResult = {
  normal_price: number;      // 정상가 (가중평균)
  final_price: number;       // 권리하자 디스카운트 적용 최종
  distress_discount: number; // 적용된 디스카운트 (0.0~0.30)
  weight_sum: number;
  components: Array<{
    method: string;
    value: number;
    weight: number;
    근거: string;
  }>;
};

/** estimate_property_price 통합 진입점 입력 */
export type EstimatePropertyInput = {
  target_area: number;
  target_floor: number | null;
  total_floors: number | null;
  is_new: boolean;
  is_distressed: boolean;
  distress_severity?: number;       // 0.0/0.10/0.20/0.30 (기본 0.20)
  molit_trades?: TradeRecord[];
  auction_sales?: Array<{
    price: number;
    area: number;
    floor?: number | null;
    is_same_complex?: boolean;
  }>;
  external_values?: ExternalValue[];
  neighborhood_unit_price?: number;
  neighborhood_name?: string;
};

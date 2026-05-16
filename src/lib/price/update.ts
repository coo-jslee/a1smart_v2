/**
 * 시세 갱신 결과 DB 반영 (v1.7 price_updater.py 포팅).
 *
 * 핵심 정책 (CLAUDE.md §7.1):
 *   - 실거래 0건 + 합의시세 0원 → properties 가격 필드 덮어쓰기 금지
 *   - 내부 메모는 append-only
 *   - 재검토일 +7일 갱신
 *   - 시세이력DB는 append-only (개별 거래 N건 + 합의시세 1건)
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../supabase/types";
import type { ConsensusResult, TradeRecord } from "./types";

type PropertyUpdate = Database["public"]["Tables"]["properties"]["Update"];
type PriceHistoryInsert = Database["public"]["Tables"]["price_history"]["Insert"];

const PRICE_REFRESH_DAYS = 7;

/**
 * 개별 거래 N건을 시세이력DB row 로 변환 (append-only).
 */
export function buildPriceHistoryRows(
  asrCode: string,
  trades: TradeRecord[],
): PriceHistoryInsert[] {
  return trades.map((t) => ({
    asr_code: asrCode,
    trade_type: t.거래유형,
    price: t.거래가,
    monthly_rent: t.월세 ?? null,
    area_m2: t.전용면적_m2,
    floor_no: t.층 ?? null,
    contract_date: t.계약일 ?? null,
    source: t.출처,
    confidence: t.신뢰도,
    unit_price_m2:
      t.전용면적_m2 > 0 ? Math.round(t.거래가 / t.전용면적_m2) : null,
    is_consensus: false,
    consensus_meta: null,
    raw_payload: {
      complex: t.단지명 ?? null,
    } as never,
  }));
}

/**
 * 합의시세 row (시세이력DB).
 */
export function buildConsensusHistoryRow(
  asrCode: string,
  consensus: ConsensusResult,
  meta: {
    target_area: number;
    target_floor: number | null;
    total_floors: number | null;
    is_distressed: boolean;
    neighborhood_unit_price?: number | null;
  },
): PriceHistoryInsert {
  return {
    asr_code: asrCode,
    trade_type: "AI추정",
    price: consensus.final_price,
    monthly_rent: null,
    area_m2: meta.target_area,
    floor_no: meta.target_floor,
    contract_date: null,
    source: "AI추정",
    confidence: 80,
    unit_price_m2:
      meta.target_area > 0
        ? Math.round(consensus.final_price / meta.target_area)
        : null,
    is_consensus: true,
    consensus_meta: {
      normal_price: consensus.normal_price,
      final_price: consensus.final_price,
      distress_discount: consensus.distress_discount,
      weight_sum: consensus.weight_sum,
      components: consensus.components,
      total_floors: meta.total_floors,
      is_distressed: meta.is_distressed,
      neighborhood_unit_price: meta.neighborhood_unit_price ?? null,
    } as never,
    raw_payload: null,
  };
}

/**
 * 거래 N건에서 거래유형별 중위값 추출 (fallback용).
 */
export function aggregateMedians(trades: TradeRecord[]): {
  sale: number | null;
  jeonse: number | null;
  monthlyDeposit: number | null;
  monthly: number | null;
} {
  function median(arr: number[]): number | null {
    if (arr.length === 0) return null;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
      : sorted[mid];
  }
  return {
    sale: median(trades.filter((t) => t.거래유형 === "매매").map((t) => t.거래가)),
    jeonse: median(trades.filter((t) => t.거래유형 === "전세").map((t) => t.거래가)),
    monthlyDeposit: median(trades.filter((t) => t.거래유형 === "월세").map((t) => t.거래가)),
    monthly: median(
      trades
        .filter((t) => t.거래유형 === "월세" && t.월세 !== undefined)
        .map((t) => t.월세 ?? 0)
        .filter((v) => v > 0),
    ),
  };
}

/**
 * 매물DB 가격 컬럼 갱신 페이로드 빌더 (덮어쓰기 금지 정책 적용).
 *
 *  - consensus.final_price > 0 → sale_price 갱신
 *  - aggregate medians 도 0 이면 → sale_price 보존 (변경 없음)
 *  - jeonse/monthly 는 거래 있으면 갱신, 없으면 보존
 *  - 내부 메모 append-only
 *  - 재검토일 +7일
 */
export function buildPropertyPriceUpdate(args: {
  consensus: ConsensusResult;
  trades: TradeRecord[];
}): PropertyUpdate {
  const { consensus, trades } = args;
  const medians = aggregateMedians(trades);
  const today = new Date().toISOString().slice(0, 10);
  const nextReview = new Date(
    Date.now() + PRICE_REFRESH_DAYS * 24 * 60 * 60 * 1000,
  )
    .toISOString()
    .slice(0, 10);

  const update: PropertyUpdate = {
    next_review_date: nextReview,
  };

  // 매매가: 합의시세 우선 → 없으면 단순 중위값 → 없으면 보존
  if (consensus.final_price > 0) {
    update.sale_price = consensus.final_price;
  } else if (medians.sale !== null) {
    update.sale_price = medians.sale;
  }
  // 합의·중위 모두 0이면 sale_price 미갱신 (덮어쓰기 금지)

  if (medians.jeonse !== null) update.jeonse_deposit = medians.jeonse;
  if (medians.monthlyDeposit !== null)
    update.monthly_deposit = medians.monthlyDeposit;
  if (medians.monthly !== null) update.monthly_rent = medians.monthly;

  // 합의 결과가 0건이면 워크플로우 단계는 유지 (단순 재검토일만 갱신)
  if (consensus.final_price > 0 || medians.sale !== null) {
    update.workflow_stage = "06_시세조사";
  }

  return update;
}

/**
 * 메모 append (Postgres append_internal_note 함수 호출).
 */
export async function appendInternalNote(
  supabase: SupabaseClient<Database>,
  asrCode: string,
  note: string,
): Promise<void> {
  await supabase.rpc("append_internal_note", {
    p_asr_code: asrCode,
    p_note: note,
  });
}

/**
 * 내부 메모용 한 줄 요약 생성.
 */
export function summaryNote(
  consensus: ConsensusResult,
  tradeCount: number,
): string {
  const today = new Date().toISOString().slice(0, 10);
  if (consensus.final_price === 0 && tradeCount === 0) {
    return `[06갱신|${today}] 실거래 0건. 가격 보존.`;
  }
  const okeok = (n: number) =>
    n > 100_000_000
      ? `${(n / 100_000_000).toFixed(2)}억`
      : n > 10_000
      ? `${(n / 10_000).toFixed(0)}만`
      : `${n}`;
  return (
    `[06갱신|${today}] 실거래 ${tradeCount}건. ` +
    `합의시세 ${okeok(consensus.final_price)} ` +
    `(정상가 ${okeok(consensus.normal_price)}, 디스카운트 ${(consensus.distress_discount * 100).toFixed(0)}%, ` +
    `${consensus.components.length}개 방법 가중평균).`
  );
}

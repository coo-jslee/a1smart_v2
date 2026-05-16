/**
 * 매물 row + 최신 합의시세 row → DOCX 빌더가 소비하는 ReportPayload 변환.
 *
 * v1.7 pipeline_07.process_property 의 데이터 묶음 단계 포팅.
 *
 * 정책:
 *   - investor 버전은 PNU·내부메모·1순위 채권자 실명 제거
 *   - 시세이력DB 최신 합의시세 우선, 없으면 properties.sale_price fallback
 *   - 세무 추정은 항상 워터마크 포함
 */
import type { Tables } from "../supabase/types";
import { calcAcquisitionTax, isCommercialProperty, type AcquisitionTax } from "./tax";

type Property = Tables<"properties">;
type PriceHistory = Tables<"price_history">;

export type ReportVersion = "investor" | "full";

export type ReportConsensusComponent = {
  method: string;
  value: number;
  weight: number;
  근거: string;
};

/**
 * 보고서에 임베드할 이미지 1장.
 * - buffer: 다운로드된 바이너리 (route.ts에서 Storage에서 받아 채움)
 * - type: docx ImageRun 이 지원하는 포맷 (webp 등은 사전 변환 필요 — 미지원시 null로 처리)
 * - label: 셀 상단 캡션
 */
export type ReportImage = {
  buffer: Buffer;
  type: "png" | "jpg" | "gif" | "bmp";
  label: string;
} | null;

export type ReportPayload = {
  version: ReportVersion;
  generated_at: string; // ISO date
  asr_code: string;

  // 위치·건물 기본
  address: string;
  jibun: string;
  pnu: string; // investor → 빈 문자열
  building_name: string;
  floor_no: number | null;
  total_floors: number | null;
  exclusive_m2: number | null;
  built_year: number | null;
  structure: string | null;
  property_type: string | null;
  use_zone: string | null;

  // 권리
  risk_grade: string;
  mortgage_total: number;
  senior_creditor: string; // investor → "(생략)"
  is_distressed: boolean;
  risk_summary: string;

  // 시세
  consensus_price: number;
  normal_price: number | null;
  distress_discount: number | null;
  unit_price_m2: number | null;
  molit_count: number;
  price_method: string;
  consensus_components: ReportConsensusComponent[];
  external_evaluations: Array<{ source: string; value: number; weight: number }>;

  // 세무
  tax: AcquisitionTax;
  is_commercial: boolean;

  // CRM
  owner_name: string; // investor → "(생략)"
  internal_memo: string; // investor → ""

  // 사진 (3열 행: 대상부동산 / 위치도 광역 / 위치도 인근)
  // route.ts에서 image_paths[0..2] 를 Storage에서 다운로드 후 채움. 없으면 null.
  images: [ReportImage, ReportImage, ReportImage];

  // 전문가 의견 (별도 모듈에서 채움)
  expert_opinion?: { text: string; source: "claude" | "template" };
};

type ConsensusMeta = {
  normal_price?: number;
  final_price?: number;
  distress_discount?: number;
  weight_sum?: number;
  components?: ReportConsensusComponent[];
};

type ExternalEval = {
  source?: string;
  value?: number;
  weight?: number;
};

/**
 * properties + 최신 합의시세 row → ReportPayload.
 */
export function buildReportPayload(args: {
  property: Property;
  latestConsensus: Pick<
    PriceHistory,
    "price" | "consensus_meta" | "unit_price_m2" | "recorded_at"
  > | null;
  ownerName: string | null;
  version: ReportVersion;
}): ReportPayload {
  const { property: p, latestConsensus, ownerName, version } = args;
  const isInvestor = version === "investor";

  const consensusMeta = (latestConsensus?.consensus_meta ?? {}) as ConsensusMeta;
  const externalEvalsRaw = (p.external_evaluations ?? []) as ExternalEval[];

  // 합의시세 우선, 없으면 sale_price, 그것도 없으면 0
  const consensusPrice =
    (latestConsensus?.price ?? 0) > 0
      ? Number(latestConsensus!.price)
      : (p.sale_price ?? 0);

  const unitPriceM2 = (() => {
    if (latestConsensus?.unit_price_m2) return Number(latestConsensus.unit_price_m2);
    if (p.unit_price_m2) return Number(p.unit_price_m2);
    if (consensusPrice > 0 && p.exclusive_m2)
      return Math.round(consensusPrice / Number(p.exclusive_m2));
    return null;
  })();

  const isCommercial = isCommercialProperty(p.property_type);
  const tax = calcAcquisitionTax(consensusPrice, isCommercial);

  const molitCount = (consensusMeta.components ?? []).filter((c) =>
    /실거래|국토부|매매|매칭/.test(c.method),
  ).length;
  const methodCount = (consensusMeta.components ?? []).length;
  const priceMethod = methodCount
    ? `국토부 실거래 + 단가환산 (${methodCount}개 평가방법 가중평균)`
    : "기본 시세";

  return {
    version,
    generated_at: new Date().toISOString().slice(0, 10),
    asr_code: p.asr_code,

    address: p.address_road ?? p.address_jibun ?? "",
    jibun: p.address_jibun ?? "",
    pnu: isInvestor ? "" : p.pnu,
    building_name: p.building_name ?? "",
    floor_no: p.floor_no ?? null,
    total_floors: p.total_floors ?? null,
    exclusive_m2: p.exclusive_m2 ? Number(p.exclusive_m2) : null,
    built_year: p.built_year ?? null,
    structure: p.structure,
    property_type: p.property_type,
    use_zone: p.land_use_zone,

    risk_grade: p.risk_grade ?? "—",
    mortgage_total: p.mortgage_total ?? 0,
    senior_creditor: isInvestor ? "(생략)" : (p.senior_creditor ?? "—"),
    is_distressed: p.is_distressed,
    risk_summary: p.risk_summary ?? "특이사항 없음",

    consensus_price: consensusPrice,
    normal_price: consensusMeta.normal_price ?? null,
    distress_discount: consensusMeta.distress_discount ?? null,
    unit_price_m2: unitPriceM2,
    molit_count: molitCount,
    price_method: priceMethod,
    consensus_components: consensusMeta.components ?? [],
    external_evaluations: externalEvalsRaw.map((e) => ({
      source: String(e.source ?? "외부"),
      value: Number(e.value ?? 0),
      weight: Number(e.weight ?? 0),
    })),

    tax,
    is_commercial: isCommercial,

    owner_name: isInvestor ? "(생략)" : (ownerName ?? "—"),
    internal_memo: isInvestor ? "" : (p.internal_note ?? "").slice(0, 1000),

    // 이미지는 빈 슬롯으로 초기화. route.ts에서 Storage 다운로드 후 채움.
    images: [null, null, null],
  };
}

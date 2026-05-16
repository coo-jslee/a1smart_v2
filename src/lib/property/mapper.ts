/**
 * 구조화 JSON → Postgres INSERT 페이로드 매핑 (v1.7 property_mapper.py 포팅).
 *
 * 3종 공부 JSON을 합쳐서 properties / customers / gongbu_documents 입력용으로 변환.
 */
import type { Database } from "../supabase/types";
import { analyzeRisk } from "./risk";

type PropertyInsert = Database["public"]["Tables"]["properties"]["Insert"];
type CustomerInsert = Database["public"]["Tables"]["customers"]["Insert"];

type GeonchukOwner = {
  성명?: string;
  주민_법인_번호?: string;
  주소?: string;
  지분?: string;
  변동일자?: string;
  변동원인?: string;
};

type DeungkiOwner = {
  성명?: string;
  법인등록번호?: string;
  주소?: string;
  취득일?: string;
  취득원인?: string;
};

function pickFirst<T>(v: T | T[] | undefined | null): T | null {
  if (!v) return null;
  if (Array.isArray(v)) return v[0] ?? null;
  return v;
}

function inferPropertyType(geonchuk: Record<string, unknown>): string {
  const 전유 = (geonchuk["전유부분"] ?? {}) as Record<string, unknown>;
  const yongdo = String(전유["용도"] ?? "");
  if (yongdo.includes("도시형생활주택") || yongdo.includes("다세대")) return "빌라";
  if (yongdo.includes("오피스텔")) return "오피스텔";
  if (yongdo.includes("아파트") || geonchuk["공동주택_가격_이력"]) return "아파트";
  if (yongdo.includes("근린생활") || yongdo.includes("상가")) return "상가";
  return "빌라";
}

function inferStructure(geonchuk: Record<string, unknown>): string {
  const 전유 = (geonchuk["전유부분"] ?? {}) as Record<string, unknown>;
  const s = String(전유["구조"] ?? "");
  if (s.includes("철근콘크리트")) return "철근콘크리트조";
  if (s.includes("철골철근")) return "철골철근콘크리트조";
  if (s.includes("철골")) return "철골조";
  if (s.includes("벽돌")) return "벽돌조";
  return "기타";
}

function inferBuiltYear(geonchuk: Record<string, unknown>): number | null {
  const sa = String(geonchuk["사용승인일"] ?? "");
  if (sa.length >= 4) {
    const y = parseInt(sa.slice(0, 4), 10);
    return Number.isFinite(y) ? y : null;
  }
  return null;
}

/**
 * 매물 INSERT 페이로드 생성.
 */
export function buildPropertyInsert(args: {
  deungki: Record<string, unknown>;
  toji: Record<string, unknown>;
  geonchuk: Record<string, unknown>;
  asrCode: string;
  pnu: string;
  ownerId: string | null;
  agentId: string | null;
}): PropertyInsert {
  const { deungki, toji, geonchuk, asrCode, pnu, ownerId, agentId } = args;
  const risk = analyzeRisk(deungki);

  const 전유 = (geonchuk["전유부분"] ?? {}) as Record<string, unknown>;
  const 도로명 =
    String(deungki["도로명주소"] ?? "") ||
    String(geonchuk["도로명주소"] ?? "") ||
    "";
  const 호명 = String(geonchuk["호명칭"] ?? "");
  const fullAddress =
    호명 && !도로명.includes(호명) ? `${도로명}, ${호명}호` : 도로명;

  const today = new Date().toISOString().slice(0, 10);
  const memo =
    `[04발췌|${today}] PDF 3건 자동 추출. ` +
    `근저당 ${risk.mortgageTotal.toLocaleString()}원, ` +
    `가압류 ${risk.attachmentCount}건, ` +
    `경매 ${risk.isDistressed ? "O" : "X"}, ` +
    `위험등급 ${risk.riskGrade}.`;

  return {
    asr_code: asrCode,
    pnu,
    property_type: inferPropertyType(geonchuk),
    transaction_type: "매매",
    status: risk.isDistressed ? "보류" : "신규",
    workflow_stage: "05_입력",

    address_road: fullAddress || null,
    address_jibun: String(deungki["건물표시"] ?? "") || null,

    building_name: (geonchuk["명칭"] as string) ?? null,
    exclusive_m2: (전유["면적_㎡"] as number) ?? null,
    supply_m2: (geonchuk["공급면적_㎡"] as number) ?? null,
    floor_no: (전유["층"] as number) ?? null,
    built_year: inferBuiltYear(geonchuk),
    structure: inferStructure(geonchuk),
    violation: Boolean(geonchuk["위반건축물"]),

    mortgage_total: risk.mortgageTotal,
    senior_creditor: risk.seniorCreditor || null,
    is_distressed: risk.isDistressed,
    risk_grade: risk.riskGrade,
    risk_summary: risk.riskSummary,

    land_use_zone: (toji["용도지역"] as string) ?? null,
    land_m2: (toji["면적_㎡"] as number) ?? null,
    gongsi_jiga: (toji["공시지가_원_㎡_최신"] as number) ?? null,

    owner_id: ownerId,
    agent_id: agentId,
    internal_note: memo,
    source: risk.isDistressed ? "NPL/경공매" : "직접 의뢰",

    list_date: today,
  };
}

/**
 * 등기상 소유자를 customers INSERT 페이로드로 매핑.
 * (name, payload) 반환.
 */
export function buildOwnerInsert(args: {
  deungki: Record<string, unknown>;
  geonchuk: Record<string, unknown>;
  asrCode: string;
  createdBy: string | null;
}): { name: string; payload: CustomerInsert } {
  const { deungki, geonchuk, asrCode, createdBy } = args;
  const owner = pickFirst(
    deungki["현소유자"] as DeungkiOwner | DeungkiOwner[] | undefined,
  ) ?? {};

  const name = owner.성명 || "이름미상";
  const isCorp = /주식회사|\(주\)|㈜/.test(name);
  let bizNo = owner.법인등록번호 ?? "";

  if (!bizNo) {
    const gcOwners = (geonchuk["소유자"] ?? []) as GeonchukOwner[];
    if (gcOwners.length > 0) {
      bizNo = gcOwners[0].주민_법인_번호 ?? "";
    }
  }

  const address =
    owner.주소 ??
    (geonchuk["소유자"] as GeonchukOwner[] | undefined)?.[0]?.주소 ??
    "";

  const note =
    `${asrCode} 등기상 소유자` +
    (owner.취득일
      ? ` (${owner.취득일} ${owner.취득원인 ?? ""}로 취득)`
      : "") +
    ". 04 발췌 자동 생성.";

  const payload: CustomerInsert = {
    name,
    is_corp: isCorp,
    biz_number: bizNo || null,
    customer_type: ["매도"],
    classification: "소유주",
    grade: null,
    status: "신규",
    is_multi_owner: false,
    memo: `${address}\n\n${note}`.trim(),
    created_by: createdBy,
  };

  return { name, payload };
}

/**
 * 구조화 JSON → Postgres INSERT 페이로드 매핑 (v1.7 property_mapper.py 포팅).
 *
 * 3종 공부 JSON을 합쳐서 properties / customers / gongbu_documents 입력용으로 변환.
 *
 * v2-fallback: 단독건물·집합건물 두 케이스 모두 견고하게 처리.
 *   - 집합건물(아파트·빌라·도시형생활주택·오피스텔): 전유부분 사용
 *   - 단독건물(상가·근린생활시설·단독주택): 전유부분 null → 연면적·주구조·층수 fallback
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

type BuildingPhase = {
  층?: string;
  구분?: string;
  구조?: string;
  용도?: string;
  // "면적_㎡" 키도 있지만 TS 식별자 제약으로 generic 접근 사용
  [key: string]: unknown;
};

function pickFirst<T>(v: T | T[] | undefined | null): T | null {
  if (!v) return null;
  if (Array.isArray(v)) return v[0] ?? null;
  return v;
}

function asNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const cleaned = v.replace(/[,\s]/g, "");
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function asString(v: unknown): string {
  return v == null ? "" : String(v).trim();
}

/**
 * 층수 문자열 파서. v1.7 prompt는 정수 기대지만 단독건물은
 * "지하: 1층, 지상: 4층" 같은 문자열로 옴.
 *  반환: { ground: 지상층수, basement: 지하층수 }
 */
function parseFloorString(raw: unknown): { ground: number | null; basement: number | null } {
  const s = asString(raw);
  if (!s) return { ground: null, basement: null };

  // 이미 정수면 그대로 지상층으로
  if (typeof raw === "number") return { ground: raw, basement: null };

  let ground: number | null = null;
  let basement: number | null = null;

  const groundMatch = s.match(/지상\s*[:：]?\s*(\d+)/);
  if (groundMatch) ground = parseInt(groundMatch[1], 10);

  const basementMatch = s.match(/지하\s*[:：]?\s*(\d+)/);
  if (basementMatch) basement = parseInt(basementMatch[1], 10);

  // 단순 "5층" 같은 경우
  if (ground === null && basement === null) {
    const simple = s.match(/(\d+)\s*층/);
    if (simple) ground = parseInt(simple[1], 10);
  }

  return { ground, basement };
}

/**
 * 매물 종류 추정. 집합건물은 전유부분.용도, 단독건물은 주용도 사용.
 */
function inferPropertyType(geonchuk: Record<string, unknown>): string {
  const 전유 = (geonchuk["전유부분"] ?? {}) as Record<string, unknown>;
  // 전유부분.용도 (집합건물) → 주용도 (단독건물) fallback
  const yongdo = asString(전유["용도"]) || asString(geonchuk["주용도"]);

  if (yongdo.includes("도시형생활주택") || yongdo.includes("다세대")) return "빌라";
  if (yongdo.includes("오피스텔")) return "오피스텔";
  if (yongdo.includes("아파트") || geonchuk["공동주택_가격_이력"]) return "아파트";
  if (
    yongdo.includes("근린생활") ||
    yongdo.includes("상가") ||
    yongdo.includes("사무소") ||
    yongdo.includes("판매")
  )
    return "상가";
  if (yongdo.includes("단독주택") || yongdo.includes("다가구")) return "단독주택";
  return "기타";
}

/**
 * 구조 추정. 전유부분.구조 → 주구조 fallback.
 */
function inferStructure(geonchuk: Record<string, unknown>): string {
  const 전유 = (geonchuk["전유부분"] ?? {}) as Record<string, unknown>;
  const s = asString(전유["구조"]) || asString(geonchuk["주구조"]);

  if (s.includes("철근콘크리트")) return "철근콘크리트조";
  if (s.includes("철골철근")) return "철골철근콘크리트조";
  if (s.includes("철골")) return "철골조";
  if (s.includes("벽돌")) return "벽돌조";
  if (s.includes("목조")) return "목조";
  return "기타";
}

function inferBuiltYear(geonchuk: Record<string, unknown>): number | null {
  const sa = asString(geonchuk["사용승인일"]);
  if (sa.length >= 4) {
    const y = parseInt(sa.slice(0, 4), 10);
    return Number.isFinite(y) ? y : null;
  }
  return null;
}

/**
 * 건물명 추정. 집합건물=명칭, 단독건물=null이지만 도로명 끝부분 사용.
 */
function inferBuildingName(geonchuk: Record<string, unknown>): string | null {
  const name = asString(geonchuk["명칭"]);
  if (name) return name;
  // 단독건물 fallback: 호명칭도 없으면 null
  return null;
}

/**
 * 전용면적. 집합건물=전유부분.면적_㎡, 단독건물=null (개념상 본인 점유면적 분리 불가).
 */
function inferExclusiveM2(geonchuk: Record<string, unknown>): number | null {
  const 전유 = (geonchuk["전유부분"] ?? {}) as Record<string, unknown>;
  return asNumber(전유["면적_㎡"]);
}

/**
 * 공급면적. 집합건물=공급면적_㎡, 단독건물=연면적_㎡ fallback.
 */
function inferSupplyM2(geonchuk: Record<string, unknown>): number | null {
  return (
    asNumber(geonchuk["공급면적_㎡"]) ??
    asNumber(geonchuk["연면적_㎡"]) ??
    null
  );
}

/**
 * 해당 층. 집합건물=전유부분.층, 단독건물=null (건물 전체이므로 특정 층 의미 없음).
 */
function inferFloorNo(geonchuk: Record<string, unknown>): number | null {
  const 전유 = (geonchuk["전유부분"] ?? {}) as Record<string, unknown>;
  const fromExclusive = asNumber(전유["층"]);
  if (fromExclusive !== null) return fromExclusive;
  return null;
}

/**
 * 총 층수. 단독건물은 층수 문자열 파싱, 집합건물은 건축물현황 길이.
 */
function inferTotalFloors(geonchuk: Record<string, unknown>): number | null {
  // 1) 층수 필드 (단독건물): "지하: 1층, 지상: 4층"
  const parsed = parseFloorString(geonchuk["층수"]);
  if (parsed.ground !== null) return parsed.ground;

  // 2) 건축물현황 array (단독건물 보조)
  const phases = (geonchuk["건축물현황"] ?? []) as BuildingPhase[];
  if (phases.length > 0) {
    const groundFloors = phases.filter((p) => {
      const f = asString(p.층);
      return /^\d+층$/.test(f); // 지하·옥탑 제외
    });
    if (groundFloors.length > 0) return groundFloors.length;
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

  const 도로명 =
    asString(deungki["도로명주소"]) ||
    asString(geonchuk["도로명주소"]) ||
    "";
  const 호명 = asString(geonchuk["호명칭"]);
  const fullAddress =
    호명 && !도로명.includes(호명) ? `${도로명}, ${호명}호` : 도로명;

  const today = new Date().toISOString().slice(0, 10);
  const propertyType = inferPropertyType(geonchuk);
  const isStandalone = !geonchuk["전유부분"]; // 단독건물 여부

  const memo =
    `[04발췌|${today}] PDF 3건 자동 추출 (${isStandalone ? "단독건물" : "집합건물"}, ${propertyType}). ` +
    `근저당 ${risk.mortgageTotal.toLocaleString()}원, ` +
    `가압류 ${risk.attachmentCount}건, ` +
    `경매 ${risk.isDistressed ? "O" : "X"}, ` +
    `위험등급 ${risk.riskGrade}.`;

  return {
    asr_code: asrCode,
    pnu,
    property_type: propertyType,
    transaction_type: "매매",
    status: risk.isDistressed ? "보류" : "신규",
    workflow_stage: "05_입력",

    address_road: fullAddress || null,
    address_jibun: asString(deungki["건물표시"]) || null,

    building_name: inferBuildingName(geonchuk),
    exclusive_m2: inferExclusiveM2(geonchuk),
    supply_m2: inferSupplyM2(geonchuk),
    floor_no: inferFloorNo(geonchuk),
    total_floors: inferTotalFloors(geonchuk),
    built_year: inferBuiltYear(geonchuk),
    structure: inferStructure(geonchuk),
    violation: Boolean(geonchuk["위반건축물"]),

    mortgage_total: risk.mortgageTotal,
    senior_creditor: risk.seniorCreditor || null,
    is_distressed: risk.isDistressed,
    risk_grade: risk.riskGrade,
    risk_summary: risk.riskSummary,

    land_use_zone: asString(toji["용도지역"]) || null,
    land_m2: asNumber(toji["면적_㎡"]),
    gongsi_jiga: asNumber(toji["공시지가_원_㎡_최신"]),

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

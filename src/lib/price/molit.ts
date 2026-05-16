/**
 * 국토교통부 RTMS OpenAPI 클라이언트.
 * data.go.kr 의 공공데이터 포털 키 사용.
 *
 * 9개 엔드포인트:
 *   아파트     매매: getRTMSDataSvcAptTradeDev
 *   아파트     전월세: getRTMSDataSvcAptRent
 *   오피스텔   매매: getRTMSDataSvcOffiTrade
 *   오피스텔   전월세: getRTMSDataSvcOffiRent
 *   연립다세대 매매: getRTMSDataSvcRHTrade
 *   연립다세대 전월세: getRTMSDataSvcRHRent
 *   단독·다가구 매매: getRTMSDataSvcSHTrade
 *   단독·다가구 전월세: getRTMSDataSvcSHRent
 *   상업·업무용 매매: getRTMSDataSvcNrgTrade
 *
 * 공통 파라미터:
 *   LAWD_CD = PNU 앞 5자리 (시군구 코드)
 *   DEAL_YMD = YYYYMM (조회 년월)
 *   serviceKey = MOLIT_RTMS_API_KEY
 *
 * 응답: XML
 *
 * v1.7 price_collector.py 의 collect_all() 함수 TS 포팅 + .env fallback.
 */
import { readFileSync } from "fs";
import path from "path";
import type { TradeRecord, TradeType } from "./types";

const BASE = "https://apis.data.go.kr/1613000";

type Endpoint = {
  path: string;
  defaultType: TradeType;
};

export const MOLIT_ENDPOINTS = {
  apt_trade:   { path: "RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev", defaultType: "매매" as TradeType },
  apt_rent:    { path: "RTMSDataSvcAptRent/getRTMSDataSvcAptRent",         defaultType: "전세" as TradeType },
  offi_trade:  { path: "RTMSDataSvcOffiTrade/getRTMSDataSvcOffiTrade",     defaultType: "매매" as TradeType },
  offi_rent:   { path: "RTMSDataSvcOffiRent/getRTMSDataSvcOffiRent",       defaultType: "전세" as TradeType },
  rh_trade:    { path: "RTMSDataSvcRHTrade/getRTMSDataSvcRHTrade",         defaultType: "매매" as TradeType },
  rh_rent:     { path: "RTMSDataSvcRHRent/getRTMSDataSvcRHRent",           defaultType: "전세" as TradeType },
  sh_trade:    { path: "RTMSDataSvcSHTrade/getRTMSDataSvcSHTrade",         defaultType: "매매" as TradeType },
  sh_rent:     { path: "RTMSDataSvcSHRent/getRTMSDataSvcSHRent",           defaultType: "전세" as TradeType },
  nrg_trade:   { path: "RTMSDataSvcNrgTrade/getRTMSDataSvcNrgTrade",       defaultType: "매매" as TradeType },
} as const satisfies Record<string, Endpoint>;

export type MolitEndpointKey = keyof typeof MOLIT_ENDPOINTS;

/**
 * 매물 종류별 사용할 endpoint key 결정.
 */
export function endpointsForPropertyType(propertyType: string): MolitEndpointKey[] {
  switch (propertyType) {
    case "아파트":
      return ["apt_trade", "apt_rent"];
    case "오피스텔":
      return ["offi_trade", "offi_rent"];
    case "빌라":
      return ["rh_trade", "rh_rent"];
    case "단독주택":
      return ["sh_trade", "sh_rent"];
    case "상가":
      return ["nrg_trade"];
    default:
      return ["apt_trade", "apt_rent", "rh_trade", "rh_rent"];
  }
}

/**
 * API 키 로딩 (OS env → .env fallback).
 */
function getApiKey(): string {
  let key = (process.env.MOLIT_RTMS_API_KEY ?? "").trim();
  if (!key) {
    try {
      const envText = readFileSync(path.join(process.cwd(), ".env"), "utf-8");
      const m = envText.match(/^MOLIT_RTMS_API_KEY=(.+)$/m);
      if (m) key = m[1].trim();
    } catch {
      // ignore
    }
  }
  return key;
}

/**
 * 최근 N개월 분 YYYYMM 배열 (오늘 포함, 과거 방향).
 */
export function recentMonths(n = 3, baseDate?: Date): string[] {
  const base = baseDate ?? new Date();
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    out.push(`${y}${m}`);
  }
  return out;
}

/**
 * XML 에서 단순 <tag>value</tag> 형식 필드 추출 (RTMS 응답은 단순 XML).
 * 동일 태그가 여러 번 나오면 모두 반환.
 */
function pickXmlAll(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "g");
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    out.push(m[1].trim());
  }
  return out;
}

/**
 * 한 응답 XML 파싱 → TradeRecord[]
 */
function parseRtmsXml(xml: string, ep: Endpoint): TradeRecord[] {
  // RTMS 응답은 <item>...</item> 의 반복.
  const itemBlocks = pickXmlAll(xml, "item");
  const out: TradeRecord[] = [];

  for (const item of itemBlocks) {
    // 매매가 / 보증금 / 월세 등 필드명이 endpoint마다 다름. 통합 매핑.
    const dealAmount = pickXmlAll(item, "dealAmount")[0] ?? "";          // 매매 (만원)
    const deposit    = pickXmlAll(item, "deposit")[0]    ?? "";          // 전월세 보증금 (만원)
    const monthlyRent = pickXmlAll(item, "monthlyRent")[0] ?? "";        // 월세 (만원)

    // 면적 필드 (endpoint 마다 다름):
    //   아파트/오피스텔/연립: excluUseAr (전용면적)
    //   상가:                buildingAr (건물면적)
    //   단독·다가구:          totalFloorAr (연면적)
    const areaStr =
      pickXmlAll(item, "excluUseAr")[0] ??
      pickXmlAll(item, "buildingAr")[0] ??
      pickXmlAll(item, "totalFloorAr")[0] ??
      pickXmlAll(item, "houseAr")[0] ??
      "0";
    const area = parseFloat(areaStr.replace(/[,\s]/g, ""));
    const floorStr = (pickXmlAll(item, "floor")[0] ?? "").trim();
    const floor = floorStr ? parseInt(floorStr, 10) : NaN;
    const aptName   = pickXmlAll(item, "aptNm")[0]
                   ?? pickXmlAll(item, "offiNm")[0]
                   ?? pickXmlAll(item, "mhouseNm")[0]
                   ?? pickXmlAll(item, "houseNm")[0]
                   ?? pickXmlAll(item, "buldNm")[0]
                   ?? "";

    // 계약일
    const y = pickXmlAll(item, "dealYear")[0]  ?? "";
    const m = pickXmlAll(item, "dealMonth")[0] ?? "";
    const d = pickXmlAll(item, "dealDay")[0]   ?? "";
    const contractDate = y && m && d
      ? `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`
      : undefined;

    // 거래 종류 결정
    let tradeType: TradeType = ep.defaultType;
    let amount = 0;
    if (dealAmount) {
      amount = parseInt(dealAmount.replace(/[,\s]/g, ""), 10) * 10000;
      tradeType = "매매";
    } else if (deposit) {
      amount = parseInt(deposit.replace(/[,\s]/g, ""), 10) * 10000;
      const monthly = monthlyRent
        ? parseInt(monthlyRent.replace(/[,\s]/g, ""), 10) * 10000
        : 0;
      tradeType = monthly > 0 ? "월세" : "전세";
    }
    if (amount <= 0) continue;

    out.push({
      거래유형: tradeType,
      거래가: amount,
      월세: monthlyRent
        ? parseInt(monthlyRent.replace(/[,\s]/g, ""), 10) * 10000
        : undefined,
      전용면적_m2: Number.isFinite(area) ? area : 0,
      층: Number.isFinite(floor) ? floor : null,
      계약일: contractDate,
      단지명: aptName || undefined,
      출처: "국토부실거래",
      신뢰도: 95,
    });
  }
  return out;
}

/**
 * 단일 endpoint 호출.
 */
export async function fetchRtms(args: {
  endpoint: MolitEndpointKey;
  lawdCd: string;
  dealYmd: string;       // YYYYMM
  numOfRows?: number;
  apiKey?: string;
}): Promise<TradeRecord[]> {
  const ep = MOLIT_ENDPOINTS[args.endpoint];
  const key = args.apiKey ?? getApiKey();
  if (!key) {
    throw new Error("MOLIT_RTMS_API_KEY 가 설정되지 않았습니다.");
  }

  const url = new URL(`${BASE}/${ep.path}`);
  url.searchParams.set("serviceKey", key);
  url.searchParams.set("LAWD_CD", args.lawdCd);
  url.searchParams.set("DEAL_YMD", args.dealYmd);
  url.searchParams.set("numOfRows", String(args.numOfRows ?? 1000));
  url.searchParams.set("pageNo", "1");

  const res = await fetch(url.toString(), { method: "GET" });
  if (!res.ok) {
    throw new Error(`RTMS ${args.endpoint} HTTP ${res.status}`);
  }
  const xml = await res.text();
  // 에러 응답 체크
  if (xml.includes("<errMsg>") || xml.includes("<returnAuthMsg>")) {
    const err = pickXmlAll(xml, "errMsg")[0] || pickXmlAll(xml, "returnAuthMsg")[0] || "Unknown error";
    if (err && err !== "NORMAL SERVICE.") {
      throw new Error(`RTMS API error: ${err}`);
    }
  }
  return parseRtmsXml(xml, ep);
}

/**
 * 매물 1건의 실거래 데이터 수집.
 *
 * @param lawdCd PNU 앞 5자리 (시군구 코드)
 * @param propertyType 매물 종류 (아파트/오피스텔/빌라/단독주택/상가)
 * @param months 최근 N개월 (기본 3)
 */
export async function collectMolit(args: {
  lawdCd: string;
  propertyType: string;
  months?: number;
}): Promise<TradeRecord[]> {
  const months = args.months ?? 3;
  const ymdList = recentMonths(months);
  const eps = endpointsForPropertyType(args.propertyType);

  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("MOLIT_RTMS_API_KEY 가 설정되지 않았습니다.");
  }

  const all: TradeRecord[] = [];
  // 병렬 호출 (endpoint × month)
  const promises: Promise<TradeRecord[]>[] = [];
  for (const ep of eps) {
    for (const ymd of ymdList) {
      promises.push(
        fetchRtms({ endpoint: ep, lawdCd: args.lawdCd, dealYmd: ymd, apiKey }).catch(
          (err) => {
            console.warn(`[molit] ${ep} ${ymd} failed:`, err.message);
            return [] as TradeRecord[];
          },
        ),
      );
    }
  }
  const results = await Promise.all(promises);
  for (const r of results) all.push(...r);

  return all;
}

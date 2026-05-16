/**
 * 권리 위험등급 자동 판정 (v1.7 property_mapper.py 룰).
 *
 *  위험: 임의경매·강제경매·압류 OR 가압류 ≥ 3건
 *  주의: 가압류 ≥ 1건 OR 근저당 합계 > 0
 *  안전: 그 외
 */

type 위험권리 = {
  종류?: string;
  채권자?: string;
  청구금액?: number;
  사건번호?: string;
  신청채권자?: string;
  접수일?: string;
  순위?: number;
};

type 근저당 = {
  순위?: number;
  종류?: string;
  채권최고액?: number;
  최초채권자?: string;
  현채권자?: string;
  양도일?: string;
};

export type RiskGrade = "안전" | "주의" | "위험";

export type RiskAnalysis = {
  riskGrade: RiskGrade;
  mortgageTotal: number;
  seniorCreditor: string;
  isDistressed: boolean;
  auctionCount: number;
  attachmentCount: number;
  riskSummary: string;
};

export function analyzeRisk(deungki: Record<string, unknown>): RiskAnalysis {
  const 위험권리목록 = (deungki["갑구_위험권리"] ?? []) as 위험권리[];
  const 근저당목록 = (deungki["을구_근저당"] ?? []) as 근저당[];

  // 근저당 합계
  const mortgageTotal = 근저당목록.reduce(
    (sum, item) => sum + (item.채권최고액 ?? 0),
    0,
  );

  // 1순위 채권자
  const sortedMortgage = [...근저당목록].sort(
    (a, b) => (a.순위 ?? 99) - (b.순위 ?? 99),
  );
  let seniorCreditor = "";
  if (sortedMortgage.length > 0) {
    const first = sortedMortgage[0];
    const cur = first.현채권자 ?? first.최초채권자 ?? "";
    const amount = (first.채권최고액 ?? 0).toLocaleString();
    if (first.양도일) {
      seniorCreditor = `${cur} (양도일 ${first.양도일}, 원채권자 ${first.최초채권자 ?? ""}) / 채권최고액 ${amount}원`;
    } else {
      seniorCreditor = `${cur} / 채권최고액 ${amount}원`;
    }
  }

  // 압류·경매 여부
  const isDistressed = 위험권리목록.some((item) =>
    (item.종류 ?? "").match(/^(임의경매|강제경매|압류)/),
  );

  const auctionCount = 위험권리목록.filter((item) =>
    (item.종류 ?? "").includes("경매"),
  ).length;

  const attachmentCount = 위험권리목록.filter((item) =>
    (item.종류 ?? "").startsWith("가압류"),
  ).length;

  // 위험등급 판정
  let riskGrade: RiskGrade;
  if (isDistressed || attachmentCount >= 3) {
    riskGrade = "위험";
  } else if (attachmentCount >= 1 || mortgageTotal > 0) {
    riskGrade = "주의";
  } else {
    riskGrade = "안전";
  }

  // 리스크 요약
  const auctionItem = 위험권리목록.find((it) =>
    (it.종류 ?? "").includes("경매"),
  );
  const parts: string[] = [];
  if (auctionItem) {
    parts.push(
      `${auctionItem.사건번호 ?? ""}(${auctionItem.신청채권자 ?? ""},임의경매)`,
    );
  }
  if (mortgageTotal > 0) {
    parts.push(`근저당${(mortgageTotal / 1_000_000).toFixed(1)}M`);
  }
  if (attachmentCount > 0) {
    parts.push(`가압류${attachmentCount}건`);
  }
  const riskSummary = parts.length > 0 ? parts.join(" ") : "특이사항 없음";

  return {
    riskGrade,
    mortgageTotal,
    seniorCreditor,
    isDistressed,
    auctionCount,
    attachmentCount,
    riskSummary,
  };
}

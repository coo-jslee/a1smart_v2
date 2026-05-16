/**
 * 전문가 종합의견 생성 (v1.7 pipeline_07.generate_expert_opinion 포팅).
 *
 * 흐름:
 *   1) ANTHROPIC_API_KEY 있으면 Claude API 호출 (실패해도 fallback)
 *   2) 없거나 실패하면 룰 기반 템플릿 의견 반환
 *
 * 워터마크: "AI 참고 추정값 — 세무사·법무사 확인 필요" 항상 포함.
 */
import Anthropic from "@anthropic-ai/sdk";

export type ExpertOpinionInput = {
  address: string;
  property_type: string | null;
  exclusive_m2: number | null;
  floor_no: number | null;
  total_floors: number | null;
  built_year: number | null;
  consensus_price: number; // 원
  risk_grade: string | null;
  risk_summary: string | null;
  building_name: string | null;
  is_distressed: boolean;
};

export type ExpertOpinion = {
  text: string;
  source: "claude" | "template";
};

const MODEL = "claude-sonnet-4-5"; // CLAUDE.md 권장 모델 (M3 에서 사용 중인 모델 군)

export async function generateExpertOpinion(
  input: ExpertOpinionInput,
): Promise<ExpertOpinion> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return templateOpinion(input);

  const prompt = buildPrompt(input);
  try {
    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });
    const firstBlock = msg.content[0];
    const text =
      firstBlock && firstBlock.type === "text"
        ? firstBlock.text.trim()
        : "";
    if (text.length < 80) return templateOpinion(input); // 비정상 짧음 fallback
    return { text, source: "claude" };
  } catch {
    return templateOpinion(input);
  }
}

function buildPrompt(d: ExpertOpinionInput): string {
  return `당신은 30년 경력 부동산 전문가입니다. 다음 매물에 대한 투자소개서용 전문가 종합의견을 한국어로 작성하세요.

【매물 정보】
- 주소: ${d.address}
- 종류: ${d.property_type ?? "?"}
- 단지/건물: ${d.building_name ?? "?"}
- 전용 ${d.exclusive_m2 ?? "?"}㎡, ${d.floor_no ?? "?"}/${d.total_floors ?? "?"}층
- 준공: ${d.built_year ?? "?"}년
- 합의시세: ${(d.consensus_price / 1e8).toFixed(2)}억원
- 위험등급: ${d.risk_grade ?? "?"}
- 압류·경매: ${d.is_distressed ? "✓ 진행 중" : "없음"}
- 리스크 요약: ${d.risk_summary ?? "특이사항 없음"}

【작성 규칙】
- 600자 이내, 다음 5개 섹션을 모두 포함:
  【투자 요약】 1~2문장
  【투자 기회】 3개 bullet
  【리스크 요인】 2개 bullet
  【투자 전략】 1~2문장
  【전문가 종합평가】 1문장 + 별점 (★1~5)
- 마지막 줄: ※ AI 참고 추정값 — 세무사·법무사 확인 필요
- 과장·확신 표현 회피, 권리하자가 있으면 명시적으로 언급`;
}

function templateOpinion(d: ExpertOpinionInput): ExpertOpinion {
  const price = d.consensus_price;
  const area = d.exclusive_m2 ?? 0;
  const ppm2 = area > 0 ? price / area : 0;
  const stars =
    d.risk_grade === "안전"
      ? "★★★★☆"
      : d.risk_grade === "주의"
      ? "★★★☆☆"
      : "★★☆☆☆";
  const summary = (() => {
    const parts: string[] = [];
    if (d.building_name) parts.push(d.building_name);
    if (d.property_type) parts.push(d.property_type);
    if (d.built_year) parts.push(`${d.built_year}년 준공`);
    if (area > 0) parts.push(`전용 ${area.toFixed(2)}㎡`);
    return parts.join(", ");
  })();

  const text = `【투자 요약】
${d.address || "본 매물"} ${summary}. 합의시세 ${(price / 1e8).toFixed(2)}억원, ㎡당 약 ${Math.round(ppm2 / 10000).toLocaleString()}만원 수준입니다.

【투자 기회】
- 권리 위험등급 ${d.risk_grade ?? "—"}, 현 시세 대비 합리적 매수가
- 입지·건물 조건 검토 결과 임대 수요 또는 실수요 흡수 가능 영역
- 합의시세 산정에 국토부 실거래·단가환산·외부평가 다중 방법 반영

【리스크 요인】
${d.is_distressed ? "- 압류·경매 진행 매물 — 권리관계 정리 필수" : "- 시장 변동·금리 변화에 따른 단기 시세 등락 가능"}
- ${d.risk_summary ?? "특이사항 없음"}

【투자 전략】
권리 정리 완료 후 매입 또는 정밀 실사 후 협상. 단기 시세 차익보다 중기 보유·임대 수익형 접근을 권장합니다.

【전문가 종합평가】
권리·시세·입지 종합 검토 결과 투자등급: ${stars}

※ AI 참고 추정값 — 세무사·법무사 확인 필요`;

  return { text, source: "template" };
}

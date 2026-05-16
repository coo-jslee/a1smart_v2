/**
 * DOCX 빌더 단위 스모크 테스트 (Storage·DB 없이).
 *
 * 실행:
 *   npx tsx scripts/smoke-docx.ts
 *
 * 결과: out/smoke_investor.docx, out/smoke_full.docx 두 파일 생성.
 * MS Word 또는 LibreOffice에서 열어 디자인 확인.
 */
import { writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { buildReportDocx } from "../src/lib/report/docx";
import { calcAcquisitionTax } from "../src/lib/report/tax";
import type {
  ReportPayload,
  ReportVersion,
  ReportImage,
} from "../src/lib/report/build";

/**
 * 테스트용 1×1 PNG (투명 픽셀). docx ImageRun이 정상 임베드되는지 확인.
 * iVBORw0KGgo... 시그니처가 정확한 PNG 데이터.
 */
const TEST_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

function makeTestImage(label: string): ReportImage {
  return {
    buffer: Buffer.from(TEST_PNG_BASE64, "base64"),
    type: "png",
    label,
  };
}

function sample(
  version: ReportVersion,
  imageMode: "empty" | "partial" | "full",
): ReportPayload {
  const price = 4_976_000_000; // 49.76억
  const tax = calcAcquisitionTax(price, true);
  const images: [ReportImage, ReportImage, ReportImage] =
    imageMode === "empty"
      ? [null, null, null]
      : imageMode === "partial"
      ? [makeTestImage("대상 부동산"), null, null]
      : [
          makeTestImage("대상 부동산"),
          makeTestImage("위치도 (광역)"),
          makeTestImage("위치도 (인근)"),
        ];
  return {
    version,
    generated_at: new Date().toISOString().slice(0, 10),
    asr_code: "ASR-11710-000001",
    address: "서울특별시 송파구 중길로 463",
    jibun: "송파구 거여동 200-1",
    pnu: version === "investor" ? "" : "1171010800200010000",
    building_name: "(단독상가건물)",
    floor_no: 4,
    total_floors: 4,
    exclusive_m2: 813.2,
    built_year: 1992,
    structure: "철근콘크리트조",
    property_type: "단독상가",
    use_zone: "일반상업지역",
    risk_grade: "위험",
    mortgage_total: 7_865_000_000,
    senior_creditor: version === "investor" ? "(생략)" : "○○상호저축은행",
    is_distressed: true,
    risk_summary: "근저당 78.65억, 임의경매 2023타경51257, 가압류 1건",
    consensus_price: price,
    normal_price: 7_108_000_000,
    distress_discount: 0.3,
    unit_price_m2: Math.round(price / 813.2),
    molit_count: 0,
    price_method: "국토부 실거래 + 단가환산 (3개 평가방법 가중평균)",
    consensus_components: [
      {
        method: "단지 내 단가환산",
        value: 4_800_000_000,
        weight: 0.85,
        근거: "동일 LAWD_CD 행정동 6건 ㎡단가 중위값 환산",
      },
      {
        method: "외부 평가값 (직접견적)",
        value: 5_200_000_000,
        weight: 0.6,
        근거: "중개사 직접 견적 5.2억, 감정 환산 미적용",
      },
      {
        method: "전세역산",
        value: 4_800_000_000,
        weight: 0.5,
        근거: "단지 전세 중위값 ÷ 0.78",
      },
    ],
    external_evaluations: [
      { source: "직접견적", value: 5_200_000_000, weight: 0.6 },
    ],
    tax,
    is_commercial: true,
    owner_name: version === "investor" ? "(생략)" : "제이에스미라클(주)",
    internal_memo:
      version === "investor"
        ? ""
        : "[06갱신|2026-05-16] 합의시세 49.76억 (3개 방법, -30% 디스카운트)",
    images,
    expert_opinion: {
      source: "template",
      text: `【투자 요약】
송파 거여동 단독상가건물. 합의시세 49.76억(정상시세 71.08억 대비 -30% 디스카운트).

【투자 기회】
- 권리관계 정리 시 정상가 대비 약 20억 차익 가능
- 4층 단독상가, 임차인 구성 후 안정적 수익 흐름 기대
- 거여·마천 재개발 인접 — 중기 시세 상승 여지

【리스크 요인】
- 임의경매 2023타경51257 진행 — 권리분석·낙찰가 평가 필수
- 근저당 78.65억 + 가압류 — NPL 트랙 검토 필요

【투자 전략】
권리하자 디스카운트 30% 적용 매수, NPL 협상 또는 경매 응찰 두 트랙 병행.

【전문가 종합평가】
권리 정리 가능성 검토 후 진입. 투자등급: ★★★☆☆

※ AI 참고 추정값 — 세무사·법무사 확인 필요`,
    },
  };
}

async function main() {
  const outDir = resolve(process.cwd(), "out");
  await mkdir(outDir, { recursive: true });

  const cases: Array<{
    version: ReportVersion;
    imageMode: "empty" | "partial" | "full";
  }> = [
    { version: "investor", imageMode: "empty" }, // 사진 없는 매물 (가장 일반)
    { version: "investor", imageMode: "partial" }, // 1장만 등록
    { version: "investor", imageMode: "full" }, // 3장 모두 등록
    { version: "full", imageMode: "empty" }, // 내부용 + 사진 없음
  ];

  for (const c of cases) {
    const t = Date.now();
    const buf = await buildReportDocx(sample(c.version, c.imageMode));
    const fname = `smoke_${c.version}_img-${c.imageMode}.docx`;
    const path = resolve(outDir, fname);
    await writeFile(path, buf);
    console.log(
      `✓ ${c.version.padEnd(8)} img:${c.imageMode.padEnd(8)} → ${fname}  (${(buf.byteLength / 1024).toFixed(1)} KB, ${Date.now() - t}ms)`,
    );
  }
}

main().catch((e) => {
  console.error("smoke FAILED:", e);
  process.exit(1);
});

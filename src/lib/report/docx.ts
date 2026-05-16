/**
 * A1-SMART 분석보고서 DOCX 빌더 (v1.7 make_docx.js TypeScript 포팅).
 *
 * 디자인 (v1.6 기준):
 *   - 4열 KV 테이블 (라벨|값|라벨|값)
 *   - 섹션 헤더를 colspan=4 행으로 통합
 *   - 파스텔 블루 배색
 *   - 전문가의견 좌측 굵은 파란 테두리 박스
 *   - 페이지 브레이크 없음 — 표지에서 본문 자연 연결
 *
 * 입력: ReportPayload (build.ts).
 * 출력: Buffer (DOCX). Storage 업로드는 호출 측에서 처리.
 */
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  Header,
  Footer,
  AlignmentType,
  BorderStyle,
  WidthType,
  ShadingType,
  VerticalAlign,
  PageNumber,
  ImageRun,
  type IRunOptions,
} from "docx";
import type {
  ReportPayload,
  ReportConsensusComponent,
  ReportImage,
} from "./build";

/* ─── 색상 팔레트 (v1.7 → v2 딥블루 톤으로 변경) ─── */
//
//   금융·회계 보고서 톤. 짙은 네이비 + 코발트 + 라이트블루로 무게감/신뢰감 강화.
//
const C = {
  BRAND_DARK: "0B1F4D",   // 짙은 네이비 — 표지 띠 / 헤더·푸터 텍스트 / KPI 값 / 섹션 제목
  BRAND_MID: "1A3D7A",    // 코발트 — KPI 테두리 / 섹션 상단 굵은선 / 의견박스 좌선
  HDR_BG: "A3BCDB",       // 섹션 헤더 행 배경 (살짝 진해진 파스텔블루)
  LBL_BG: "D6E4F5",       // 라벨 셀 배경 (옅은 파스텔)
  KPI_BG: "EAF0F9",       // KPI 박스 배경 (차분한 라이트블루)
  KPI_BORDER: "1A3D7A",   // KPI 박스 테두리 = BRAND_MID
  OP_BG: "F0F4FA",        // 의견박스 배경 (차분 톤)
  WHITE: "FFFFFF",
  GRID: "B0B7BF",         // 표 일반 테두리 (살짝 진해서 BRAND와 톤 통일)
  TEXT_DARK: "1F2937",
  TEXT_GRAY: "6B7280",
  WARN_RED: "C00000",
  SAFE_GREEN: "375623",
  WARN_YELLOW: "B8860B",
} as const;

/* ─── 테이블 치수 (A4, 0.7" 여백 → 콘텐츠 영역 9890 DXA 풀폭 사용) ─── */
//
//   A4 = 11906 DXA
//   여백 좌/우 = 1008 + 1008 = 2016 DXA (0.7인치 × 2)
//   콘텐츠 = 11906 − 2016 = 9890 DXA   ← 헤더·푸터의 tabStops 와 동일
//
//   4열 비율 유지: LC : VC ≈ 1 : 2.1 (라벨 좁고 값 넓게)
//   LC × 2 + VC × 2 = 9890
//   → LC = 1600, VC = 3345  (검산: 1600×2 + 3345×2 = 9890 ✓)
const TW = 9890;
const LC = 1600;
const VC = 3345;
const VWIDE = VC + LC + VC; // colspan=3 와이드 값 셀 = 8290

/* ─── 헬퍼 ─── */
const bdr = (color: string = C.GRID, size = 4) => ({
  style: BorderStyle.SINGLE,
  size,
  color,
});
const allBdr = (color: string = C.GRID) => ({
  top: bdr(color),
  bottom: bdr(color),
  left: bdr(color),
  right: bdr(color),
});

function T(text: string | number, opts: Partial<IRunOptions> = {}): TextRun {
  return new TextRun({
    text: String(text),
    font: "Pretendard",
    size: 18,
    color: C.TEXT_DARK,
    ...opts,
  });
}
function TB(text: string | number, opts: Partial<IRunOptions> = {}): TextRun {
  return T(text, { bold: true, ...opts });
}

function mkCell(
  children: TextRun[] | string,
  opts: { fill?: string; w?: number; span?: number } = {},
): TableCell {
  const { fill = C.WHITE, w = VC, span = 1 } = opts;
  const runs = Array.isArray(children) ? children : [T(children)];
  return new TableCell({
    borders: allBdr(),
    shading: { fill, type: ShadingType.CLEAR, color: "auto" },
    margins: { top: 60, bottom: 60, left: 120, right: 100 },
    width: { size: w, type: WidthType.DXA },
    ...(span > 1 ? { columnSpan: span } : {}),
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        spacing: { before: 0, after: 0 },
        children: runs,
      }),
    ],
  });
}

function lblCell(text: string, w: number = LC): TableCell {
  return mkCell([TB(text, { size: 17, color: C.TEXT_DARK })], {
    fill: C.LBL_BG,
    w,
  });
}

function row4(l1: string, v1: string, l2: string, v2: string): TableRow {
  return new TableRow({
    children: [lblCell(l1), mkCell(v1), lblCell(l2), mkCell(v2)],
  });
}

function rowWide(label: string, value: string): TableRow {
  return new TableRow({
    children: [lblCell(label), mkCell(value, { w: VWIDE, span: 3 })],
  });
}

function secRow(title: string): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        borders: {
          top: bdr(C.BRAND_MID, 12),
          bottom: bdr(C.BRAND_MID, 4),
          left: bdr(C.BRAND_MID, 4),
          right: bdr(C.BRAND_MID, 4),
        },
        shading: { fill: C.HDR_BG, type: ShadingType.CLEAR, color: "auto" },
        margins: { top: 80, bottom: 80, left: 140, right: 100 },
        columnSpan: 4,
        width: { size: TW, type: WidthType.DXA },
        children: [
          new Paragraph({
            spacing: { before: 0, after: 0 },
            children: [TB(title, { size: 20, color: C.BRAND_DARK })],
          }),
        ],
      }),
    ],
  });
}

function buildTable(rows: TableRow[]): Table {
  return new Table({
    width: { size: TW, type: WidthType.DXA },
    columnWidths: [LC, VC, LC, VC],
    rows,
  });
}

function kpiCell(label: string, value: string, isRisk = false): TableCell {
  const kpiW = Math.floor(TW / 4);
  const color = isRisk
    ? value === "안전"
      ? C.SAFE_GREEN
      : value === "주의"
      ? C.WARN_YELLOW
      : C.WARN_RED
    : C.BRAND_DARK;
  return new TableCell({
    borders: allBdr(C.KPI_BORDER),
    shading: { fill: C.KPI_BG, type: ShadingType.CLEAR, color: "auto" },
    margins: { top: 100, bottom: 100, left: 120, right: 120 },
    width: { size: kpiW, type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 30 },
        children: [T(label, { size: 15, color: C.TEXT_GRAY })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 0 },
        children: [TB(value, { size: 26, color })],
      }),
    ],
  });
}

function opinionBox(text: string): Table {
  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  const paragraphs = lines.map((line) => {
    const trimmed = line.trim();
    const isSec =
      trimmed.startsWith("【") ||
      trimmed.startsWith("[") ||
      trimmed.startsWith("※");
    return new Paragraph({
      spacing: { before: isSec ? 100 : 30, after: 30 },
      children: [
        T(trimmed, {
          bold: isSec,
          size: isSec ? 18 : 17,
          color: isSec ? C.BRAND_MID : C.TEXT_DARK,
        }),
      ],
    });
  });
  return new Table({
    width: { size: TW, type: WidthType.DXA },
    columnWidths: [TW],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: {
              top: bdr(C.BRAND_MID, 10),
              bottom: bdr(C.GRID, 4),
              left: bdr(C.BRAND_MID, 12),
              right: bdr(C.GRID, 4),
            },
            shading: { fill: C.OP_BG, type: ShadingType.CLEAR, color: "auto" },
            margins: { top: 120, bottom: 120, left: 180, right: 160 },
            width: { size: TW, type: WidthType.DXA },
            children: paragraphs,
          }),
        ],
      }),
    ],
  });
}

function gap(pt = 100): Paragraph {
  return new Paragraph({ spacing: { before: pt, after: 0 }, children: [] });
}

/* ─── 이미지 행 (3열: 대상부동산 / 위치도 광역 / 위치도 인근) ─── */
//
//   ┌───────────────┬───────────────┬───────────────┐
//   │ 대상 부동산   │ 위치도 (광역) │ 위치도 (인근) │   ← 라벨 행 (LBL_BG)
//   ├───────────────┼───────────────┼───────────────┤
//   │   [이미지]    │   [이미지]    │   [이미지]    │   ← 이미지 행 (높이 고정)
//   │   또는 공란   │   또는 공란   │   또는 공란   │
//   └───────────────┴───────────────┴───────────────┘
//
// 슬롯이 null 이면 이미지 셀은 공란("—") 으로 유지 (라벨은 항상 표시).
const IMG_TABLE_COLS = [
  Math.floor(TW / 3),
  Math.floor(TW / 3),
  TW - Math.floor(TW / 3) * 2, // 나머지 픽셀 마지막 열에 흡수
] as const;
// TW 9890 → 각 셀 ≈ 3296 DXA ≈ 2.29인치 ≈ 220px. 이미지는 200×150px (4:3) 로 좌우 여백 확보.
const IMG_DISPLAY_WIDTH_PX = 200;
const IMG_DISPLAY_HEIGHT_PX = 150;

function imgLabelCell(label: string, w: number): TableCell {
  return new TableCell({
    borders: allBdr(C.GRID),
    shading: { fill: C.LBL_BG, type: ShadingType.CLEAR, color: "auto" },
    margins: { top: 50, bottom: 50, left: 100, right: 100 },
    width: { size: w, type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 0 },
        children: [TB(label, { size: 16, color: C.TEXT_DARK })],
      }),
    ],
  });
}

function imgBodyCell(img: ReportImage, w: number): TableCell {
  const paragraphs: Paragraph[] = [];

  if (img) {
    try {
      const run = new ImageRun({
        // docx 9 타입은 Buffer 를 받지만 타입 시그니처가 Uint8Array 까지 좁아서 cast.
        data: img.buffer as unknown as Uint8Array,
        transformation: {
          width: IMG_DISPLAY_WIDTH_PX,
          height: IMG_DISPLAY_HEIGHT_PX,
        },
        type: img.type,
      });
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 0 },
          children: [run],
        }),
      );
    } catch {
      // ImageRun 생성 실패(드물게 손상된 데이터) → 공란 처리
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 0 },
          children: [T("—", { color: C.TEXT_GRAY, size: 17 })],
        }),
      );
    }
  } else {
    // 빈 슬롯 — 라벨 행은 그대로, 이미지 셀만 공란
    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 0 },
        children: [T("—", { color: C.TEXT_GRAY, size: 17 })],
      }),
    );
  }

  return new TableCell({
    borders: allBdr(C.GRID),
    shading: { fill: C.WHITE, type: ShadingType.CLEAR, color: "auto" },
    margins: { top: 80, bottom: 80, left: 80, right: 80 },
    width: { size: w, type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    children: paragraphs,
  });
}

function buildImageTable(
  images: [ReportImage, ReportImage, ReportImage],
): Table {
  return new Table({
    width: { size: TW, type: WidthType.DXA },
    columnWidths: [...IMG_TABLE_COLS],
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          imgLabelCell("대상 부동산", IMG_TABLE_COLS[0]),
          imgLabelCell("위치도 (광역)", IMG_TABLE_COLS[1]),
          imgLabelCell("위치도 (인근)", IMG_TABLE_COLS[2]),
        ],
      }),
      new TableRow({
        children: [
          imgBodyCell(images[0], IMG_TABLE_COLS[0]),
          imgBodyCell(images[1], IMG_TABLE_COLS[1]),
          imgBodyCell(images[2], IMG_TABLE_COLS[2]),
        ],
      }),
    ],
  });
}

/* ─── 포맷터 ─── */
function won(n: number | null | undefined): string {
  if (n == null || n === 0) return "—";
  if (n >= 1e8) return `${(n / 1e8).toFixed(2)}억원`;
  return `${n.toLocaleString()}원`;
}
function pyung(m2: number | null): string {
  if (m2 == null) return "";
  return `${m2.toFixed(2)}㎡ (${(m2 / 3.305).toFixed(1)}평)`;
}
function won2(n: number): string {
  return `${n.toLocaleString()}원`;
}
function pct(x: number | null | undefined, decimals = 0): string {
  if (x == null) return "—";
  return `${(x * 100).toFixed(decimals)}%`;
}

/* ─── 메인 ─── */
export async function buildReportDocx(data: ReportPayload): Promise<Buffer> {
  const isInvestor = data.version === "investor";
  const today = data.generated_at;
  const price = data.consensus_price;
  const tax = data.tax;

  const pageProps = {
    page: {
      size: { width: 11906, height: 16838 }, // A4
      margin: { top: 1008, right: 1008, bottom: 1008, left: 1008 },
    },
  };

  /* ── 헤더 ── */
  const docHeader = new Header({
    children: [
      new Paragraph({
        border: {
          bottom: {
            style: BorderStyle.SINGLE,
            size: 8,
            color: C.BRAND_DARK,
            space: 4,
          },
        },
        spacing: { after: 0 },
        tabStops: [{ type: AlignmentType.RIGHT, position: TW }],
        children: [
          TB("A1-SMART 부동산중개법인", { size: 16, color: C.BRAND_DARK }),
          new TextRun("\t"),
          TB("부 동 산  분 석 보 고 서", { size: 16, color: C.BRAND_DARK }),
        ],
      }),
    ],
  });

  /* ── 푸터 ── */
  const docFooter = new Footer({
    children: [
      new Paragraph({
        border: {
          top: {
            style: BorderStyle.SINGLE,
            size: 6,
            color: C.BRAND_DARK,
            space: 4,
          },
        },
        spacing: { before: 60 },
        tabStops: [{ type: AlignmentType.RIGHT, position: TW }],
        children: [
          T(`발행일: ${today}  |  ASR: ${data.asr_code}`, {
            size: 15,
            color: C.TEXT_GRAY,
          }),
          new TextRun("\t"),
          new TextRun({
            children: ["- ", PageNumber.CURRENT, " -"],
            size: 15,
            color: C.TEXT_GRAY,
            font: "Pretendard",
          }),
        ],
      }),
    ],
  });

  /* ── KPI 테이블 ── */
  const kpiW = Math.floor(TW / 4);
  const kpiW4 = TW - kpiW * 3;
  const kpiUnit = data.unit_price_m2
    ? `${Math.round(data.unit_price_m2 / 10000).toLocaleString()}만원/㎡`
    : "—";
  const kpiTable = new Table({
    width: { size: TW, type: WidthType.DXA },
    columnWidths: [kpiW, kpiW, kpiW, kpiW4],
    rows: [
      new TableRow({
        children: [
          kpiCell("합의시세", won(price)),
          kpiCell("위험등급", data.risk_grade, true),
          kpiCell("㎡당 단가", kpiUnit),
          kpiCell("발행일", today),
        ],
      }),
    ],
  });

  /* ── ① 물건 기본정보 ── */
  const basicRows: TableRow[] = [
    secRow("① 물건 기본정보"),
    row4(
      "도로명 주소",
      data.address || "—",
      "단지/건물",
      data.building_name || "—",
    ),
    row4(
      "지번 주소",
      data.jibun || "—",
      "층 / 총층수",
      `${data.floor_no ?? "—"}층 / 전체 ${data.total_floors ?? "—"}층`,
    ),
    row4(
      "전용면적",
      pyung(data.exclusive_m2),
      "준공연도",
      data.built_year ? `${data.built_year}년` : "—",
    ),
    row4(
      "주용도",
      data.property_type ?? "—",
      "용도지역",
      data.use_zone ?? "—",
    ),
    row4(
      "구조",
      data.structure ?? "—",
      "소유자",
      data.owner_name,
    ),
  ];
  if (!isInvestor && data.pnu) {
    basicRows.push(rowWide("PNU 19자리", data.pnu));
  }
  const basicTable = buildTable(basicRows);

  /* ── ② 권리분석 ── */
  const riskTable = buildTable([
    secRow("② 권리분석"),
    row4(
      "위험등급",
      data.risk_grade,
      "근저당 합계",
      won2(data.mortgage_total),
    ),
    row4(
      "압류·경매",
      data.is_distressed ? "✓ 진행 중" : "없음",
      "1순위 채권자",
      data.senior_creditor,
    ),
    rowWide("리스크 요약", data.risk_summary || "특이사항 없음"),
  ]);

  /* ── ③ 시세분석 ── */
  const priceRows: TableRow[] = [
    secRow("③ 시세분석"),
    row4(
      "합의시세",
      won(price),
      "㎡당 단가",
      data.unit_price_m2
        ? `${Math.round(data.unit_price_m2 / 10000).toLocaleString()}만원/㎡`
        : "—",
    ),
    row4(
      "산출방법",
      data.price_method,
      "정상시세",
      won(data.normal_price),
    ),
    row4(
      "권리하자 디스카운트",
      pct(data.distress_discount),
      "평가방법 수",
      `${data.consensus_components.length}개`,
    ),
  ];
  if (data.external_evaluations.length > 0) {
    const extSummary = data.external_evaluations
      .map(
        (e) =>
          `${e.source}: ${won(e.value)} (가중 ${e.weight.toFixed(2)})`,
      )
      .join(" / ");
    priceRows.push(rowWide("외부 평가값", extSummary));
  }
  const priceTable = buildTable(priceRows);

  /* ── ④ 취득비용·세무 ── */
  const acqLabel = data.is_commercial
    ? "취득세 (4.0%)"
    : "취득세";
  const eduLabel = data.is_commercial
    ? "지방교육세 (0.4%)"
    : "지방교육세";
  const agriLabel = data.is_commercial
    ? "농어촌특별세 (0.2%)"
    : "농어촌특별세";
  const taxTable = buildTable([
    secRow("④ 취득비용·세무 추정"),
    row4("기준 매매가", won2(price), acqLabel, won2(tax.acquisition)),
    row4(eduLabel, won2(tax.edu), agriLabel, won2(tax.agri)),
    row4("인지세", won2(tax.stamp), "세금 합계", won2(tax.total)),
    row4(
      "실효세율",
      pct(tax.effective_rate, 2),
      "총 취득비용 (매매가+세금)",
      won2(price + tax.total),
    ),
  ]);
  const taxWarn = new Paragraph({
    spacing: { before: 50, after: 50 },
    children: [
      T("※ AI 참고 추정값 — 세무사 확인 필요", {
        size: 15,
        bold: true,
        color: C.WARN_RED,
      }),
    ],
  });

  /* ── ⑤ 합의시세 구성 (평가방법별) ── */
  const componentSection: (Paragraph | Table)[] = [];
  if (data.consensus_components.length > 0) {
    componentSection.push(
      new Paragraph({
        spacing: { before: 120, after: 60 },
        border: {
          bottom: {
            style: BorderStyle.SINGLE,
            size: 8,
            color: C.BRAND_MID,
            space: 4,
          },
        },
        children: [
          TB(
            `⑤ 합의시세 구성 (${data.consensus_components.length}개 평가방법)`,
            { size: 20, color: C.BRAND_MID },
          ),
        ],
      }),
    );

    const compRows: TableRow[] = [
      new TableRow({
        tableHeader: true,
        children: [
          mkCell([TB("평가방법", { size: 17 })], { fill: C.LBL_BG, w: 2200 }),
          mkCell([TB("추정가", { size: 17 })], { fill: C.LBL_BG, w: 1800 }),
          mkCell([TB("가중치", { size: 17 })], { fill: C.LBL_BG, w: 1200 }),
          mkCell([TB("근거", { size: 17 })], { fill: C.LBL_BG, w: 3490 }),
        ],
      }),
      ...data.consensus_components.map((c: ReportConsensusComponent) =>
        new TableRow({
          children: [
            mkCell(c.method, { w: 2200 }),
            mkCell(won(c.value), { w: 1800 }),
            mkCell(c.weight.toFixed(2), { w: 1200 }),
            mkCell([T(c.근거, { size: 16 })], { w: 3490 }),
          ],
        }),
      ),
    ];

    componentSection.push(
      new Table({
        width: { size: TW, type: WidthType.DXA },
        columnWidths: [2200, 1800, 1200, 3490],
        rows: compRows,
      }),
    );
  }

  /* ── ⑥ 전문가 종합의견 ── */
  const opinionText =
    data.expert_opinion?.text ?? "전문가 의견이 생성되지 않았습니다.";
  const secHeader6 = new Paragraph({
    spacing: { before: 160, after: 60 },
    border: {
      bottom: {
        style: BorderStyle.SINGLE,
        size: 8,
        color: C.BRAND_MID,
        space: 4,
      },
    },
    children: [
      TB("⑥ 전문가 종합의견", { size: 20, color: C.BRAND_MID }),
    ],
  });
  const opBox = opinionBox(opinionText);

  /* ── 내부용 추가 (full 버전만) ── */
  const internalSection: (Paragraph | Table)[] = isInvestor
    ? []
    : [
        gap(120),
        buildTable([
          secRow("⚙ 내부용 추가정보 (외부 배포 금지)"),
          rowWide("내부 메모", data.internal_memo || "—"),
        ]),
      ];

  /* ── 면책 ── */
  const disclaimer = new Paragraph({
    spacing: { before: 140, after: 0 },
    border: {
      top: { style: BorderStyle.SINGLE, size: 4, color: C.GRID, space: 6 },
    },
    children: [
      T(
        isInvestor
          ? "본 보고서는 투자자 배포용입니다. 투자 결정 전 전문가(세무사·법무사) 검토를 권장합니다."
          : "[내부용] 본 문서는 중개사 검토용입니다. 외부 배포 금지.",
        { size: 15, color: C.TEXT_GRAY, italics: true },
      ),
    ],
  });

  /* ── 표지 ── */
  const cover = [
    new Paragraph({
      spacing: { before: 0, after: 120 },
      shading: { fill: C.BRAND_DARK, type: ShadingType.CLEAR, color: "auto" },
      children: [
        TB("  A1-SMART 부동산중개법인", { size: 22, color: C.WHITE }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 80, after: 50 },
      children: [
        TB("부동산 분석보고서  /  Analysis Report", {
          size: 36,
          color: C.BRAND_DARK,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 100 },
      border: {
        bottom: {
          style: BorderStyle.SINGLE,
          size: 8,
          color: C.BRAND_MID,
          space: 6,
        },
      },
      children: [T(data.address || "(주소 미상)", { size: 22 })],
    }),
  ];

  // 압류·경매 매물 경고 배너
  const warningBanner: Paragraph[] = data.is_distressed
    ? [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 80 },
          shading: { fill: "FFEBEE", type: ShadingType.CLEAR, color: "auto" },
          children: [
            TB("⚠️ 압류·경매 진행 중 매물 — 권리관계 정리 필수", {
              size: 18,
              color: C.WARN_RED,
            }),
          ],
        }),
      ]
    : [];

  /* ── 문서 조립 ── */
  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: "Pretendard", size: 18 } },
      },
    },
    sections: [
      {
        properties: pageProps,
        headers: { default: docHeader },
        footers: { default: docFooter },
        children: [
          ...cover,
          ...warningBanner,
          kpiTable,
          gap(120),
          buildImageTable(data.images),
          gap(120),
          basicTable,
          gap(100),
          riskTable,
          gap(100),
          priceTable,
          gap(100),
          taxTable,
          taxWarn,
          ...componentSection,
          secHeader6,
          opBox,
          ...internalSection,
          disclaimer,
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}

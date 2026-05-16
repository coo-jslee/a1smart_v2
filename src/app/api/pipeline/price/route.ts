/**
 * 단계 5 시세 평가 endpoint.
 *
 * POST /api/pipeline/price?asr=ASR-11710-000001
 *
 * 흐름:
 *  1) 인증 + admin 검증
 *  2) 매물 row 조회 (asr_code, pnu, lawd_cd, property_type, 면적·층·총층수·신축·압류여부 등)
 *  3) MOLIT 실거래 수집 (최근 3개월, 매물 종류별 endpoint)
 *  4) 단지명 매칭 + 신뢰도 보정 (선택)
 *  5) 인근 행정동 평균 ㎡단가 산출
 *  6) 권리하자 디스카운트 결정
 *  7) 6개 평가방법 + 합의시세 산출
 *  8) price_history append (개별 거래 N건 + 합의시세 1건)
 *  9) properties UPDATE (덮어쓰기 금지 정책)
 * 10) internal_note append (Postgres 함수)
 * 11) 단계별 진행 + 결과 반환
 */
import { NextResponse, type NextRequest } from "next/server";
import {
  createSupabaseServerClient,
  createSupabaseServiceRoleClient,
} from "@/lib/supabase/server";
import { collectMolit } from "@/lib/price/molit";
import { calcNeighborhoodUnitPrice } from "@/lib/price/match";
import { estimatePropertyPrice, decideDistressSeverity } from "@/lib/price/consensus";
import {
  buildConsensusHistoryRow,
  buildPriceHistoryRows,
  buildPropertyPriceUpdate,
  appendInternalNote,
  summaryNote,
} from "@/lib/price/update";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();

  // 1) 인증
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const asrCode = req.nextUrl.searchParams.get("asr");
  if (!asrCode) {
    return NextResponse.json({ error: "asr 파라미터가 필요합니다." }, { status: 400 });
  }

  const svc = createSupabaseServiceRoleClient();
  type StepLog = { step: string; ok: boolean; detail?: string; ms?: number };
  const steps: StepLog[] = [];
  const t0 = Date.now();

  try {
    // 2) 매물 조회
    const { data: prop, error: propErr } = await svc
      .from("properties")
      .select(
        "asr_code, pnu, lawd_cd, property_type, building_name, exclusive_m2, supply_m2, floor_no, total_floors, built_year, is_distressed, risk_grade, risk_summary, mortgage_total, external_evaluations",
      )
      .eq("asr_code", asrCode)
      .single();
    if (propErr || !prop) {
      return NextResponse.json(
        { error: "매물을 찾을 수 없습니다: " + asrCode },
        { status: 404 },
      );
    }
    steps.push({ step: "매물 조회", ok: true, detail: `${prop.property_type ?? "?"} ${prop.lawd_cd}` });

    const targetArea = prop.exclusive_m2 ?? prop.supply_m2 ?? null;
    if (!targetArea) {
      return NextResponse.json(
        { error: "매물 면적(exclusive_m2 또는 supply_m2)이 없습니다. M3 매핑을 다시 확인하세요." },
        { status: 400 },
      );
    }
    const targetFloor = prop.floor_no;
    const totalFloors = prop.total_floors;
    const isNew = prop.built_year ? new Date().getFullYear() - prop.built_year <= 5 : false;
    const isDistressed = prop.is_distressed ?? false;

    // 3) MOLIT 실거래 수집
    const tMolit = Date.now();
    const trades = await collectMolit({
      lawdCd: prop.lawd_cd as string,
      propertyType: prop.property_type ?? "아파트",
      months: 3,
    });
    steps.push({
      step: "MOLIT 실거래 수집 (3개월)",
      ok: true,
      detail: `${trades.length}건 (LAWD_CD ${prop.lawd_cd})`,
      ms: Date.now() - tMolit,
    });

    // 5) 인근 평균 ㎡단가
    const neighborhoodUnit = calcNeighborhoodUnitPrice(
      trades,
      Number(targetArea),
      10.0,
    );
    steps.push({
      step: "인근 ㎡단가 산출",
      ok: true,
      detail: neighborhoodUnit
        ? `${Math.round(neighborhoodUnit).toLocaleString()}원/㎡`
        : "표본 부족 → 인근 평균 미사용",
    });

    // 6) 디스카운트 결정
    const attachmentCount = countByKeyword(prop.risk_summary, "가압류");
    const hasAuction = /경매/.test(prop.risk_summary ?? "");
    const distressSeverity = decideDistressSeverity({
      isDistressed,
      riskGrade: prop.risk_grade,
      riskSummary: prop.risk_summary,
      mortgageTotal: prop.mortgage_total ?? 0,
      attachmentCount,
      hasAuction,
    });
    steps.push({
      step: "권리하자 디스카운트 결정",
      ok: true,
      detail: `${(distressSeverity * 100).toFixed(0)}%`,
    });

    // 7) 6개 평가방법 + 합의시세
    // 7-a) 외부 평가값 변환 (관리자가 입력한 감정평가서/집품/KB 등)
    type ExternalEval = {
      id?: string;
      source?: string;
      value?: number;
      weight?: number;
      is_appraisal?: boolean;
    };
    const externalEvals = (prop.external_evaluations ?? []) as ExternalEval[];
    const externalValues = externalEvals.map((e) => ({
      value: Number(e.value ?? 0),
      source: String(e.source ?? "외부"),
      weight: Number(e.weight ?? 0.5),
      is_appraisal: Boolean(e.is_appraisal),
    }));
    if (externalValues.length > 0) {
      steps.push({
        step: "외부 평가값 로드",
        ok: true,
        detail: `${externalValues.length}건 (${externalEvals.map((e) => e.source).join(", ")})`,
      });
    }

    const tEst = Date.now();
    const consensus = estimatePropertyPrice({
      target_area: Number(targetArea),
      target_floor: targetFloor,
      total_floors: totalFloors,
      is_new: isNew,
      is_distressed: isDistressed,
      distress_severity: distressSeverity,
      molit_trades: trades,
      auction_sales: [],
      external_values: externalValues,
      neighborhood_unit_price: neighborhoodUnit ?? undefined,
      neighborhood_name: `LAWD_CD ${prop.lawd_cd}`,
    });
    steps.push({
      step: "6개 평가방법 + 합의시세",
      ok: true,
      detail: `합의 ${consensus.components.length}개 방법, 가중합 ${consensus.weight_sum.toFixed(2)}, 정상 ${consensus.normal_price.toLocaleString()}원, 최종 ${consensus.final_price.toLocaleString()}원`,
      ms: Date.now() - tEst,
    });

    // 8) 시세이력DB append
    const histRows = [
      ...buildPriceHistoryRows(asrCode, trades),
      buildConsensusHistoryRow(asrCode, consensus, {
        target_area: Number(targetArea),
        target_floor: targetFloor,
        total_floors: totalFloors,
        is_distressed: isDistressed,
        neighborhood_unit_price: neighborhoodUnit,
      }),
    ];
    if (histRows.length > 0) {
      const { error: histErr } = await svc.from("price_history").insert(histRows);
      if (histErr) throw new Error("price_history INSERT 실패: " + histErr.message);
    }
    steps.push({
      step: "price_history append",
      ok: true,
      detail: `${histRows.length}건 (개별 ${trades.length} + 합의 1)`,
    });

    // 9) properties UPDATE (덮어쓰기 금지 정책)
    const propUpdate = buildPropertyPriceUpdate({ consensus, trades });
    const { error: upErr } = await svc
      .from("properties")
      .update(propUpdate)
      .eq("asr_code", asrCode);
    if (upErr) throw new Error("properties UPDATE 실패: " + upErr.message);
    steps.push({
      step: "properties UPDATE",
      ok: true,
      detail: propUpdate.sale_price
        ? `sale_price = ${propUpdate.sale_price.toLocaleString()}원`
        : "가격 보존 (실거래 0건)",
    });

    // 10) internal_note append
    const note = summaryNote(consensus, trades.length);
    await appendInternalNote(svc, asrCode, note);
    steps.push({ step: "internal_note append", ok: true, detail: note });

    return NextResponse.json({
      ok: true,
      asrCode,
      consensus,
      tradeCount: trades.length,
      neighborhoodUnit,
      distressSeverity,
      totalMs: Date.now() - t0,
      steps,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    steps.push({ step: "FATAL", ok: false, detail: msg });
    try {
      await svc.from("error_logs").insert({
        asr_code: asrCode,
        stage: "06_시세조사",
        severity: "ERROR",
        message: msg,
        payload: { steps } as never,
        user_id: user.id,
      });
    } catch {
      // ignore
    }
    return NextResponse.json(
      { ok: false, error: msg, steps },
      { status: 500 },
    );
  }
}

function countByKeyword(text: string | null | undefined, keyword: string): number {
  if (!text) return 0;
  const re = new RegExp(`${keyword}\\s*(\\d+)건`, "g");
  let m: RegExpExecArray | null;
  let total = 0;
  while ((m = re.exec(text)) !== null) {
    total += parseInt(m[1], 10) || 0;
  }
  if (total > 0) return total;
  // fallback: 단순 키워드 등장 횟수
  return (text.match(new RegExp(keyword, "g")) ?? []).length;
}

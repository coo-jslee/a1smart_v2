/**
 * 매물 상세 페이지 — 시세 갱신 (M4) 트리거 + 합의시세 결과 표시.
 *
 * Server Component 로 매물 데이터 로딩 → Client Component 에 전달.
 */
import { notFound } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PriceRefreshButton } from "./price-refresh-client";
import {
  ExternalEvalsCard,
  type ExternalEvaluation,
} from "./external-evals-client";
import { ReportGenerateCard } from "./report-generate-client";

export const dynamic = "force-dynamic";

function won(n: number | null | undefined): string {
  if (n === null || n === undefined || n === 0) return "—";
  if (n >= 100_000_000) {
    const eok = n / 100_000_000;
    return `${eok.toFixed(2)}억원`;
  }
  return `${n.toLocaleString()}원`;
}

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ asr: string }>;
}) {
  const { asr } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: prop } = await supabase
    .from("properties")
    .select("*")
    .eq("asr_code", asr)
    .single();

  if (!prop) notFound();

  // 최신 합의시세 (price_history.is_consensus=true 최신 1건)
  const { data: latestConsensus } = await supabase
    .from("price_history")
    .select("price, recorded_at, consensus_meta, unit_price_m2")
    .eq("asr_code", asr)
    .eq("is_consensus", true)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const consensusMeta = (latestConsensus?.consensus_meta ?? null) as
    | { normal_price?: number; distress_discount?: number; components?: Array<{ method: string; value: number; weight: number; 근거: string }> }
    | null;

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-neutral-500 mb-1">
            <Link href="/admin/dashboard" className="hover:underline">
              대시보드
            </Link>{" "}
            / 매물
          </div>
          <h1 className="text-2xl font-bold">{prop.asr_code}</h1>
          <p className="text-sm text-neutral-500 mt-1">
            {prop.address_road ?? prop.address_jibun ?? "주소 미상"}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <span className="text-xs px-2 py-1 rounded bg-neutral-200">
            {prop.workflow_stage}
          </span>
          {prop.is_distressed && (
            <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-700">
              ⚠️ 경매 진행 중
            </span>
          )}
        </div>
      </div>

      {/* KPI 4분할 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI label="합의시세" value={won(latestConsensus?.price)} hi />
        <KPI
          label="정상시세"
          value={won(consensusMeta?.normal_price ?? null)}
        />
        <KPI
          label="㎡당"
          value={
            latestConsensus?.unit_price_m2
              ? `${latestConsensus.unit_price_m2.toLocaleString()}원`
              : "—"
          }
        />
        <KPI
          label="위험등급"
          value={prop.risk_grade ?? "—"}
          danger={prop.risk_grade === "위험"}
        />
      </div>

      {/* 시세 갱신 트리거 */}
      <Card>
        <CardHeader>
          <CardTitle>시세 평가 (M4)</CardTitle>
          <CardDescription>
            국토부 RTMS OpenAPI → 6개 평가방법 → 가중평균 합의시세 →
            권리하자 디스카운트 적용. 약 5~15초 소요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PriceRefreshButton asrCode={prop.asr_code} />
        </CardContent>
      </Card>

      {/* 외부 평가값 (M4.1) */}
      <Card>
        <CardHeader>
          <CardTitle>외부 평가값 (관리자 입력)</CardTitle>
          <CardDescription>
            감정평가서·집품·KB·중개사 직접 견적 등을 입력하면 시세 갱신 시
            가중평균에 반영됩니다. 단독건물·특이매물 시세 보정용.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ExternalEvalsCard
            asrCode={prop.asr_code}
            initialEvals={
              (prop.external_evaluations as ExternalEvaluation[] | null) ?? []
            }
          />
        </CardContent>
      </Card>

      {/* 분석보고서 (M6) */}
      <Card>
        <CardHeader>
          <CardTitle>분석보고서 (M6 — 단계 7)</CardTitle>
          <CardDescription>
            합의시세 + 권리분석 + 세무 추정 + 전문가 의견을 종합한 분석보고서를
            DOCX로 생성합니다. Storage `reports` 버킷에 영구 저장되고
            매물 첨부 목록에 기록됩니다. 외부용(투자자)·내부용(중개사) 선택 가능.
            <br />
            <span className="text-xs text-neutral-500">
              ※ 재생성 시 같은 버전의 기존 파일은 자동 삭제됩니다. 다른 버전은 유지됩니다.
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReportGenerateCard
            asrCode={prop.asr_code}
            initialAttachments={prop.attachment_paths ?? []}
          />
        </CardContent>
      </Card>

      {/* 기본 정보 */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">물건 기본정보</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="text-sm space-y-2">
              <Row k="PNU" v={prop.pnu} />
              <Row k="매물 종류" v={prop.property_type} />
              <Row k="단지/건물명" v={prop.building_name ?? "—"} />
              <Row k="전용면적" v={prop.exclusive_m2 ? `${prop.exclusive_m2}㎡` : "—"} />
              <Row k="공급/연면적" v={prop.supply_m2 ? `${prop.supply_m2}㎡` : "—"} />
              <Row k="해당 층 / 총 층수" v={`${prop.floor_no ?? "—"} / ${prop.total_floors ?? "—"}`} />
              <Row k="준공년도" v={prop.built_year ?? "—"} />
              <Row k="구조" v={prop.structure ?? "—"} />
              <Row k="용도지역" v={prop.land_use_zone ?? "—"} />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">권리분석</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="text-sm space-y-2">
              <Row k="위험등급" v={prop.risk_grade ?? "—"} />
              <Row k="근저당 합계" v={won(prop.mortgage_total)} />
              <Row k="1순위 채권자" v={prop.senior_creditor ?? "—"} />
              <Row k="압류·경매" v={prop.is_distressed ? "✓" : "—"} />
              <Row k="리스크 요약" v={prop.risk_summary ?? "—"} />
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* 합의시세 구성 */}
      {consensusMeta?.components && consensusMeta.components.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              합의시세 구성 ({consensusMeta.components.length}개 평가방법)
            </CardTitle>
            <CardDescription>
              정상가 {won(consensusMeta.normal_price)} × (1 −{" "}
              {((consensusMeta.distress_discount ?? 0) * 100).toFixed(0)}%
              디스카운트) = 합의시세 {won(latestConsensus?.price)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">평가방법</th>
                  <th className="text-right py-2">추정가</th>
                  <th className="text-right py-2 w-16">가중치</th>
                  <th className="text-left py-2 pl-3">근거</th>
                </tr>
              </thead>
              <tbody>
                {consensusMeta.components.map((c, i) => (
                  <tr key={i} className="border-b border-neutral-100">
                    <td className="py-2">{c.method}</td>
                    <td className="py-2 text-right">{won(c.value)}</td>
                    <td className="py-2 text-right">{c.weight.toFixed(2)}</td>
                    <td className="py-2 pl-3 text-xs text-neutral-500">
                      {c.근거}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {!latestConsensus && (
        <Alert>
          <AlertDescription className="text-xs">
            아직 시세 평가가 실행되지 않았습니다. 위쪽의 [시세 갱신 시작]
            버튼을 누르면 국토부 실거래가를 기반으로 합의시세가 산출됩니다.
          </AlertDescription>
        </Alert>
      )}

      {prop.internal_note && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">내부 메모 (append-only)</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs whitespace-pre-wrap text-neutral-700">
              {prop.internal_note}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function KPI({
  label,
  value,
  hi,
  danger,
}: {
  label: string;
  value: string | number;
  hi?: boolean;
  danger?: boolean;
}) {
  return (
    <div
      className={
        "p-4 rounded-lg border " +
        (danger
          ? "bg-red-50 border-red-200"
          : hi
          ? "bg-blue-50 border-blue-200"
          : "bg-white")
      }
    >
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="text-xl font-bold mt-1">{value}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex">
      <dt className="w-32 text-neutral-500 flex-shrink-0">{k}</dt>
      <dd className="flex-1 break-all">{v}</dd>
    </div>
  );
}

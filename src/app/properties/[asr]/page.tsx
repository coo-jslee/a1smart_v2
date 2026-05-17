/**
 * 공개 매물 상세 페이지 (`/properties/[asr]`) — 다크 톤.
 *
 * 접근 정책:
 *   - 로그인 필수 (member/admin 모두 OK). 비로그인은 /login?redirectedFrom=... 으로 자동 redirect.
 *   - middleware에서 가드.
 */
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, Home, Calendar } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PublicNavbar } from "@/components/public/public-navbar";
import { PublicFooter } from "@/components/public/public-footer";
import { propertyImageUrls } from "@/lib/storage/public-url";
import { PublicGallery } from "./public-gallery";
import { ReportDownloadList } from "./report-download-client";

export const dynamic = "force-dynamic";

function won(n: number | null | undefined): string {
  if (n == null || n === 0) return "—";
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(2)}억원`;
  return `${n.toLocaleString()}원`;
}

function riskBadgeClass(grade: string | null): string {
  switch (grade) {
    case "안전":
      return "bg-green-500/90 text-white border-green-400/50";
    case "주의":
      return "bg-amber-500/90 text-white border-amber-400/50";
    case "위험":
      return "bg-red-500/90 text-white border-red-400/50";
    default:
      return "bg-neutral-700/80 text-neutral-200 border-neutral-500/30";
  }
}

export default async function PublicPropertyDetail({
  params,
}: {
  params: Promise<{ asr: string }>;
}) {
  const { asr } = await params;
  const supabase = await createSupabaseServerClient();

  // 비공개 매물 차단
  const { data: prop } = await supabase
    .from("properties")
    .select("*")
    .eq("asr_code", asr)
    .eq("is_public", true)
    .single();
  if (!prop) notFound();

  // 합의시세 메타 (최신)
  const { data: latestConsensus } = await supabase
    .from("price_history")
    .select("price, recorded_at, consensus_meta, unit_price_m2")
    .eq("asr_code", asr)
    .eq("is_consensus", true)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const consensusMeta = (latestConsensus?.consensus_meta ?? null) as
    | {
        normal_price?: number;
        distress_discount?: number;
        components?: Array<{
          method: string;
          value: number;
          weight: number;
          근거: string;
        }>;
      }
    | null;

  const imageUrls = propertyImageUrls(prop.image_paths);

  // 외부용 보고서만 회원에게 노출 (investor_*.docx)
  const investorReports = (prop.attachment_paths ?? []).filter((p) => {
    const filename = p.split("/").pop() ?? "";
    return filename.startsWith("investor_");
  });

  return (
    <div className="dark flex flex-col flex-1 min-h-screen bg-[#0B1F4D] text-white">
      <PublicNavbar />

      <section className="flex-1">
        <div className="max-w-6xl mx-auto px-6 py-8">
          {/* 브레드크럼 */}
          <Link
            href="/properties"
            className="inline-flex items-center gap-1 text-sm text-blue-200/70 hover:text-yellow-300 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            매물 리스트
          </Link>

          {/* 헤더 */}
          <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {prop.property_type && (
                  <span className="px-2 py-0.5 text-xs rounded bg-white/10 text-blue-100 border border-white/15 font-medium">
                    {prop.property_type}
                  </span>
                )}
                {prop.risk_grade && (
                  <span
                    className={
                      "px-2 py-0.5 text-xs rounded border font-medium " +
                      riskBadgeClass(prop.risk_grade)
                    }
                  >
                    {prop.risk_grade}
                  </span>
                )}
                {prop.is_distressed && (
                  <span className="px-2 py-0.5 text-xs rounded border bg-red-500/90 text-white border-red-400/50 font-medium">
                    ⚠ 경매 진행 중
                  </span>
                )}
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                {prop.building_name || prop.address_road || "(이름 미상)"}
              </h1>
              <p className="mt-1 text-sm text-blue-200/70 flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {prop.address_road ?? prop.address_jibun ?? "주소 미상"}
              </p>
            </div>
          </div>

          {/* 압류·경매 경고 배너 */}
          {prop.is_distressed && (
            <Alert
              variant="destructive"
              className="mb-6 bg-red-900/30 border-red-500/40 text-red-100 [&>svg]:text-red-300"
            >
              <AlertDescription className="text-red-100">
                본 매물은 압류·경매 진행 중입니다. 권리관계 정리·낙찰가 평가 등
                전문가 검토가 반드시 필요합니다.
              </AlertDescription>
            </Alert>
          )}

          {/* 사진 갤러리 */}
          {imageUrls.length > 0 && (
            <div className="mb-6">
              <PublicGallery images={imageUrls} alt={prop.address_road ?? ""} />
            </div>
          )}

          {/* KPI 4분할 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <KPI
              label="합의시세"
              value={won(latestConsensus?.price ?? prop.sale_price)}
              hi
            />
            <KPI
              label="정상시세"
              value={won(consensusMeta?.normal_price ?? null)}
            />
            <KPI
              label="㎡당"
              value={
                latestConsensus?.unit_price_m2 ?? prop.unit_price_m2
                  ? `${Math.round(
                      Number(
                        latestConsensus?.unit_price_m2 ?? prop.unit_price_m2,
                      ) / 10000,
                    ).toLocaleString()}만원`
                  : "—"
              }
            />
            <KPI
              label="위험등급"
              value={prop.risk_grade ?? "—"}
              danger={prop.risk_grade === "위험"}
            />
          </div>

          {/* 기본정보 + 권리분석 */}
          <div className="grid md:grid-cols-2 gap-5 mb-6">
            <DarkCard title="물건 기본정보" icon={<Home className="h-4 w-4 text-cyan-300" />}>
              <dl className="text-sm divide-y divide-white/10">
                <Row k="매물 종류" v={prop.property_type ?? "—"} />
                <Row k="단지/건물명" v={prop.building_name ?? "—"} />
                <Row
                  k="전용면적"
                  v={
                    prop.exclusive_m2
                      ? `${Number(prop.exclusive_m2).toFixed(2)}㎡  (${(
                          Number(prop.exclusive_m2) / 3.305
                        ).toFixed(1)}평)`
                      : "—"
                  }
                />
                <Row
                  k="공급/연면적"
                  v={
                    prop.supply_m2
                      ? `${Number(prop.supply_m2).toFixed(2)}㎡`
                      : "—"
                  }
                />
                <Row
                  k="해당 층 / 총 층수"
                  v={`${prop.floor_no ?? "—"} / ${prop.total_floors ?? "—"}`}
                />
                <Row
                  k="준공년도"
                  v={
                    prop.built_year ? (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-blue-300/60" />
                        {prop.built_year}년
                      </span>
                    ) : (
                      "—"
                    )
                  }
                />
                <Row k="구조" v={prop.structure ?? "—"} />
                <Row k="용도지역" v={prop.land_use_zone ?? "—"} />
              </dl>
            </DarkCard>

            <DarkCard title="권리분석 요약">
              <dl className="text-sm divide-y divide-white/10">
                <Row k="위험등급" v={prop.risk_grade ?? "—"} />
                <Row k="근저당 합계" v={won(prop.mortgage_total)} />
                <Row k="압류·경매" v={prop.is_distressed ? "✓ 진행 중" : "없음"} />
                <Row k="리스크 요약" v={prop.risk_summary ?? "—"} />
              </dl>
              <p className="mt-3 text-xs text-blue-300/60 italic">
                ※ 1순위 채권자 실명·PNU 등 상세 권리관계는 분석보고서에서
                확인하세요.
              </p>
            </DarkCard>
          </div>

          {/* 합의시세 구성 */}
          {consensusMeta?.components && consensusMeta.components.length > 0 && (
            <DarkCard
              title={`합의시세 구성 (${consensusMeta.components.length}개 평가방법)`}
              className="mb-6"
              subtitle={
                <>
                  정상가{" "}
                  <span className="text-yellow-300 font-semibold">
                    {won(consensusMeta.normal_price)}
                  </span>{" "}
                  × (1 −{" "}
                  {((consensusMeta.distress_discount ?? 0) * 100).toFixed(0)}%
                  디스카운트) = 합의시세{" "}
                  <span className="text-yellow-300 font-semibold">
                    {won(latestConsensus?.price ?? prop.sale_price)}
                  </span>
                </>
              }
            >
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/15 text-blue-200/70">
                    <th className="text-left py-2 font-medium">평가방법</th>
                    <th className="text-right py-2 font-medium">추정가</th>
                    <th className="text-right py-2 font-medium w-16">
                      가중치
                    </th>
                    <th className="text-left py-2 pl-3 font-medium">근거</th>
                  </tr>
                </thead>
                <tbody>
                  {consensusMeta.components.map((c, i) => (
                    <tr
                      key={i}
                      className="border-b border-white/10 last:border-b-0"
                    >
                      <td className="py-2 text-white">{c.method}</td>
                      <td className="py-2 text-right text-yellow-200">
                        {won(c.value)}
                      </td>
                      <td className="py-2 text-right text-cyan-200">
                        {c.weight.toFixed(2)}
                      </td>
                      <td className="py-2 pl-3 text-xs text-blue-200/70">
                        {c.근거}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DarkCard>
          )}

          {/* 분석보고서 다운로드 */}
          <DarkCard
            title="분석보고서 다운로드 (외부용)"
            subtitle="회원 전용 — 합의시세·권리분석·세무 추정·전문가 의견 종합 DOCX"
            className="mb-6"
          >
            {investorReports.length === 0 ? (
              <div className="text-sm text-blue-300/60 italic">
                아직 발행된 외부용 분석보고서가 없습니다. 매물 담당자에게
                문의해 주세요.
              </div>
            ) : (
              <ReportDownloadList
                asrCode={prop.asr_code}
                paths={investorReports}
              />
            )}
          </DarkCard>

          {/* CTA */}
          <div className="text-center py-8 text-sm text-blue-200/70">
            본 매물에 관심 있으신가요?
            <br />
            <Link
              href="/contact"
              className="mt-2 inline-block text-yellow-300 font-medium hover:text-yellow-200 hover:underline"
            >
              담당자에게 문의하기 →
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
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
  value: string;
  hi?: boolean;
  danger?: boolean;
}) {
  return (
    <div
      className={
        "p-4 rounded-lg border backdrop-blur-sm " +
        (danger
          ? "bg-red-900/30 border-red-500/40"
          : hi
          ? "bg-cyan-400/10 border-cyan-400/40"
          : "bg-blue-950/40 border-white/15")
      }
    >
      <div className="text-xs text-blue-200/70">{label}</div>
      <div
        className={
          "text-xl font-bold mt-1 " +
          (hi ? "text-yellow-300" : danger ? "text-red-300" : "text-white")
        }
      >
        {value}
      </div>
    </div>
  );
}

function DarkCard({
  title,
  subtitle,
  icon,
  className = "",
  children,
}: {
  title: string;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={
        "bg-blue-950/40 border border-white/15 rounded-lg backdrop-blur-sm " +
        className
      }
    >
      <div className="px-5 py-4 border-b border-white/10">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          {icon}
          {title}
        </h3>
        {subtitle && (
          <p className="text-xs text-blue-200/70 mt-1">{subtitle}</p>
        )}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex py-2">
      <dt className="w-32 text-blue-200/70 flex-shrink-0">{k}</dt>
      <dd className="flex-1 text-white break-all">{v}</dd>
    </div>
  );
}

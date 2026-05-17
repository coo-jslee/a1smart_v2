/**
 * /admin/properties — 관리자 매물 일람.
 *
 *  - 필터: 워크플로우 단계, 공개 여부, 위험등급, 매물 종류
 *  - 정렬: 최신순 (created_at desc)
 *  - 표 형태 (시각·ASR·종류·주소·합의시세·위험·단계·공개)
 *  - row 클릭 → /admin/properties/[asr]
 *  - 페이지네이션 (20건씩)
 */
import Link from "next/link";
import {
  Building2,
  Plus,
  ArrowRight,
  Filter,
  Globe,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

type SearchParams = Promise<{
  stage?: string;
  pub?: "y" | "n";
  risk?: string;
  type?: string;
  page?: string;
}>;

const STAGE_LABELS: Record<string, string> = {
  "01_입수": "01 입수",
  "02_발급": "02 발급",
  "03_저장": "03 저장",
  "04_발췌": "04 발췌",
  "05_입력": "05 입력",
  "06_시세조사": "06 시세조사",
  "07_분석보고서": "07 분석보고서",
  완료: "완료",
  "99_오류": "99 오류",
};
const STAGES = Object.keys(STAGE_LABELS);
const RISK_GRADES = ["안전", "주의", "위험"];
const PROPERTY_TYPES = ["아파트", "오피스텔", "빌라", "상가", "단독상가"];

function won(n: number | null): string {
  if (!n) return "—";
  if (n >= 1e8) return `${(n / 1e8).toFixed(2)}억`;
  if (n >= 1e4) return `${(n / 1e4).toFixed(0)}만`;
  return n.toLocaleString();
}
function formatDate(s: string): string {
  return new Date(s).toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
function riskBadgeClass(g: string | null): string {
  switch (g) {
    case "안전":
      return "bg-green-100 text-green-700 border-green-200";
    case "주의":
      return "bg-amber-100 text-amber-700 border-amber-200";
    case "위험":
      return "bg-red-100 text-red-700 border-red-200";
    default:
      return "bg-neutral-100 text-neutral-600 border-neutral-200";
  }
}
function stageBadgeClass(s: string): string {
  if (s === "완료") return "bg-blue-100 text-blue-800 border-blue-200";
  if (s === "99_오류") return "bg-red-100 text-red-700 border-red-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
}

export default async function AdminPropertiesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const stage = sp.stage ?? "";
  const pub = sp.pub ?? "";
  const risk = sp.risk ?? "";
  const type = sp.type ?? "";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10));

  const supabase = await createSupabaseServerClient();

  // KPI 카운트 (전체)
  const { count: total } = await supabase
    .from("properties")
    .select("id:asr_code", { count: "exact", head: true });
  const { count: pubCount } = await supabase
    .from("properties")
    .select("id:asr_code", { count: "exact", head: true })
    .eq("is_public", true);
  const { count: doneCount } = await supabase
    .from("properties")
    .select("id:asr_code", { count: "exact", head: true })
    .eq("workflow_stage", "완료");
  const { count: distressedCount } = await supabase
    .from("properties")
    .select("id:asr_code", { count: "exact", head: true })
    .eq("is_distressed", true);

  // 쿼리
  let query = supabase
    .from("properties")
    .select(
      "asr_code, created_at, property_type, building_name, address_road, address_jibun, sale_price, unit_price_m2, risk_grade, is_distressed, workflow_stage, is_public, image_paths, attachment_paths",
      { count: "exact" },
    );
  if (stage) query = query.eq("workflow_stage", stage);
  if (pub === "y") query = query.eq("is_public", true);
  if (pub === "n") query = query.eq("is_public", false);
  if (risk) query = query.eq("risk_grade", risk);
  if (type) query = query.eq("property_type", type);

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data: rows, count: filteredCount } = await query;
  const totalPages = Math.max(1, Math.ceil((filteredCount ?? 0) / PAGE_SIZE));

  function buildUrl(overrides: Record<string, string | undefined>): string {
    const params = new URLSearchParams();
    if (stage) params.set("stage", stage);
    if (pub) params.set("pub", pub);
    if (risk) params.set("risk", risk);
    if (type) params.set("type", type);
    if (page > 1) params.set("page", String(page));
    for (const [k, v] of Object.entries(overrides)) {
      if (v === undefined || v === "") params.delete(k);
      else params.set(k, v);
    }
    const qs = params.toString();
    return qs ? `/admin/properties?${qs}` : "/admin/properties";
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">매물</h1>
          <p className="mt-1 text-sm text-neutral-500">
            등록된 모든 매물 일람 · 워크플로우 단계·공개 여부 관리
          </p>
        </div>
        <Link href="/admin/properties/new">
          <Button size="default">
            <Plus className="h-4 w-4 mr-1" />
            매물 신규 등록
          </Button>
        </Link>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI label="전체" value={total ?? 0} />
        <KPI label="완료" value={doneCount ?? 0} highlight />
        <KPI label="공개" value={pubCount ?? 0} highlight="cyan" />
        <KPI label="경매·압류" value={distressedCount ?? 0} danger />
      </div>

      {/* 필터 */}
      <div className="bg-white border rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm text-neutral-600 mb-2">
          <Filter className="h-4 w-4" />
          <span className="font-medium">필터</span>
          {(stage || pub || risk || type) && (
            <Link
              href="/admin/properties"
              className="ml-auto text-xs text-blue-700 hover:underline"
            >
              초기화
            </Link>
          )}
        </div>
        <FilterGroup label="워크플로우 단계">
          <Chip
            href={buildUrl({ stage: "", page: "1" })}
            active={!stage}
            label="전체"
          />
          {STAGES.map((s) => (
            <Chip
              key={s}
              href={buildUrl({ stage: s === stage ? "" : s, page: "1" })}
              active={stage === s}
              label={STAGE_LABELS[s] ?? s}
            />
          ))}
        </FilterGroup>
        <FilterGroup label="공개 여부">
          <Chip
            href={buildUrl({ pub: "", page: "1" })}
            active={!pub}
            label="전체"
          />
          <Chip
            href={buildUrl({ pub: pub === "y" ? "" : "y", page: "1" })}
            active={pub === "y"}
            label="공개"
          />
          <Chip
            href={buildUrl({ pub: pub === "n" ? "" : "n", page: "1" })}
            active={pub === "n"}
            label="비공개"
          />
        </FilterGroup>
        <FilterGroup label="위험등급">
          <Chip
            href={buildUrl({ risk: "", page: "1" })}
            active={!risk}
            label="전체"
          />
          {RISK_GRADES.map((r) => (
            <Chip
              key={r}
              href={buildUrl({ risk: r === risk ? "" : r, page: "1" })}
              active={risk === r}
              label={r}
            />
          ))}
        </FilterGroup>
        <FilterGroup label="매물 종류">
          <Chip
            href={buildUrl({ type: "", page: "1" })}
            active={!type}
            label="전체"
          />
          {PROPERTY_TYPES.map((t) => (
            <Chip
              key={t}
              href={buildUrl({ type: t === type ? "" : t, page: "1" })}
              active={type === t}
              label={t}
            />
          ))}
        </FilterGroup>
      </div>

      {/* 일람 표 */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-4 py-3 text-xs font-medium text-neutral-500 border-b bg-neutral-50">
          <div className="col-span-2">접수일 / ASR</div>
          <div className="col-span-1">종류</div>
          <div className="col-span-3">주소 / 단지명</div>
          <div className="col-span-2 text-right">합의시세</div>
          <div className="col-span-1">위험</div>
          <div className="col-span-2">단계</div>
          <div className="col-span-1 text-center">공개</div>
        </div>
        {!rows || rows.length === 0 ? (
          <div className="text-center py-16 text-neutral-400 text-sm">
            <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <div>조건에 맞는 매물이 없습니다.</div>
            <Link
              href="/admin/properties/new"
              className="text-xs text-blue-700 hover:underline mt-2 inline-block"
            >
              매물 신규 등록 →
            </Link>
          </div>
        ) : (
          <div className="divide-y">
            {rows.map((r) => (
              <Link
                key={r.asr_code}
                href={`/admin/properties/${r.asr_code}`}
                className="grid grid-cols-12 gap-2 px-4 py-3 text-sm hover:bg-neutral-50 transition-colors"
              >
                <div className="col-span-2">
                  <div className="font-mono text-xs text-neutral-700">
                    {formatDate(r.created_at)}
                  </div>
                  <div className="font-mono text-xs text-neutral-500 mt-0.5 truncate">
                    {r.asr_code}
                  </div>
                </div>
                <div className="col-span-1 text-xs flex items-center">
                  <span className="px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-700">
                    {r.property_type ?? "—"}
                  </span>
                </div>
                <div className="col-span-3 text-xs">
                  <div className="font-medium text-neutral-900 truncate">
                    {r.building_name ?? "—"}
                  </div>
                  <div className="text-neutral-500 truncate">
                    {r.address_road ?? r.address_jibun ?? "—"}
                  </div>
                </div>
                <div className="col-span-2 text-right">
                  <div className="text-sm font-medium text-blue-900">
                    {won(r.sale_price)}
                  </div>
                  {r.unit_price_m2 && (
                    <div className="text-xs text-neutral-500">
                      {Math.round(r.unit_price_m2 / 10000).toLocaleString()}만/㎡
                    </div>
                  )}
                </div>
                <div className="col-span-1">
                  <div className="flex flex-wrap gap-1">
                    <span
                      className={
                        "px-1.5 py-0.5 rounded text-xs border " +
                        riskBadgeClass(r.risk_grade)
                      }
                    >
                      {r.risk_grade ?? "—"}
                    </span>
                    {r.is_distressed && (
                      <span className="px-1 text-xs text-red-600" title="경매·압류">
                        ⚠
                      </span>
                    )}
                  </div>
                </div>
                <div className="col-span-2">
                  <span
                    className={
                      "inline-block px-2 py-0.5 rounded text-xs border " +
                      stageBadgeClass(r.workflow_stage)
                    }
                  >
                    {STAGE_LABELS[r.workflow_stage] ?? r.workflow_stage}
                  </span>
                </div>
                <div className="col-span-1 text-center">
                  {r.is_public ? (
                    <Globe className="h-4 w-4 text-cyan-700 mx-auto" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-neutral-300 mx-auto" />
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 px-4 py-3 border-t bg-neutral-50">
            {page > 1 && (
              <Link
                href={buildUrl({ page: String(page - 1) })}
                className="text-xs px-3 py-1 bg-white border rounded hover:bg-neutral-50"
              >
                이전
              </Link>
            )}
            <span className="text-xs text-neutral-500 px-4">
              {page} / {totalPages} (총 {filteredCount}건)
            </span>
            {page < totalPages && (
              <Link
                href={buildUrl({ page: String(page + 1) })}
                className="text-xs px-3 py-1 bg-white border rounded hover:bg-neutral-50"
              >
                다음 <ArrowRight className="inline h-3 w-3" />
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function KPI({
  label,
  value,
  highlight,
  danger,
}: {
  label: string;
  value: number;
  highlight?: boolean | "cyan";
  danger?: boolean;
}) {
  return (
    <div
      className={
        "p-4 rounded-lg border bg-white " +
        (danger ? "border-red-200 bg-red-50/50" : "")
      }
    >
      <div className="text-xs text-neutral-500">{label}</div>
      <div
        className={
          "text-2xl font-bold mt-1 " +
          (danger
            ? "text-red-700"
            : highlight === "cyan"
            ? "text-cyan-700"
            : highlight
            ? "text-blue-900"
            : "text-neutral-900")
        }
      >
        {value.toLocaleString()}
      </div>
    </div>
  );
}

function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-neutral-500 w-24 flex-shrink-0">
        {label}
      </span>
      <div className="flex flex-wrap gap-1 flex-1">{children}</div>
    </div>
  );
}

function Chip({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={
        "px-2.5 py-1 text-xs rounded border transition-colors " +
        (active
          ? "bg-blue-900 border-blue-900 text-white"
          : "bg-white border-neutral-200 text-neutral-600 hover:border-blue-200")
      }
    >
      {label}
    </Link>
  );
}

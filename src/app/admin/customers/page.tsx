/**
 * /admin/customers — 관리자 고객 일람.
 *
 *  - customers 테이블: 매수/매도/임차/임대 통합 고객 DB
 *  - 필터: 분류, 등급, 상태, 법인 여부
 *  - 정렬: 최신순
 *  - 표 형태 (이름·연락처·분류·등급·예산·상태·등록일)
 */
import Link from "next/link";
import { Users, Filter, Mail, Phone, Building2 } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

type SearchParams = Promise<{
  classification?: string;
  grade?: string;
  status?: string;
  corp?: "y" | "n";
  page?: string;
}>;

function won(n: number | null): string {
  if (!n) return "—";
  if (n >= 1e8) return `${(n / 1e8).toFixed(1)}억`;
  if (n >= 1e4) return `${(n / 1e4).toFixed(0)}만`;
  return n.toLocaleString();
}
function formatDate(s: string): string {
  return new Date(s).toLocaleDateString("ko-KR", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  });
}

function gradeBadgeClass(g: string | null): string {
  switch (g) {
    case "A":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "B":
      return "bg-green-100 text-green-700 border-green-200";
    case "C":
      return "bg-neutral-100 text-neutral-600 border-neutral-200";
    default:
      return "bg-white text-neutral-400 border-neutral-200";
  }
}

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const classification = sp.classification ?? "";
  const grade = sp.grade ?? "";
  const status = sp.status ?? "";
  const corp = sp.corp ?? "";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10));

  const supabase = await createSupabaseServerClient();

  // KPI
  const { count: total } = await supabase
    .from("customers")
    .select("id", { count: "exact", head: true });
  const { count: aGrade } = await supabase
    .from("customers")
    .select("id", { count: "exact", head: true })
    .eq("grade", "A");
  const { count: activeCount } = await supabase
    .from("customers")
    .select("id", { count: "exact", head: true })
    .eq("status", "신규");
  const { count: corpCount } = await supabase
    .from("customers")
    .select("id", { count: "exact", head: true })
    .eq("is_corp", true);

  // 쿼리
  let query = supabase
    .from("customers")
    .select(
      "id, customer_no, name, is_corp, biz_number, classification, grade, phone, email, budget_min, budget_max, status, last_contact_at, created_at, customer_type",
      { count: "exact" },
    );
  if (classification) query = query.eq("classification", classification);
  if (grade) query = query.eq("grade", grade);
  if (status) query = query.eq("status", status);
  if (corp === "y") query = query.eq("is_corp", true);
  if (corp === "n") query = query.eq("is_corp", false);

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data: rows, count: filteredCount } = await query;
  const totalPages = Math.max(1, Math.ceil((filteredCount ?? 0) / PAGE_SIZE));

  function buildUrl(overrides: Record<string, string | undefined>): string {
    const params = new URLSearchParams();
    if (classification) params.set("classification", classification);
    if (grade) params.set("grade", grade);
    if (status) params.set("status", status);
    if (corp) params.set("corp", corp);
    if (page > 1) params.set("page", String(page));
    for (const [k, v] of Object.entries(overrides)) {
      if (v === undefined || v === "") params.delete(k);
      else params.set(k, v);
    }
    const qs = params.toString();
    return qs ? `/admin/customers?${qs}` : "/admin/customers";
  }

  // 분류·상태 추출 (실데이터 기반)
  const { data: allClassifications } = await supabase
    .from("customers")
    .select("classification")
    .not("classification", "is", null);
  const uniqueClassifications = Array.from(
    new Set((allClassifications ?? []).map((r) => r.classification ?? "")),
  ).filter(Boolean);

  const STATUSES = ["신규", "진행중", "보류", "종료"];

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">고객</h1>
          <p className="mt-1 text-sm text-neutral-500">
            매수·매도·임차·임대 통합 고객 DB · 등록 / 매물 의뢰에서 자동 누적
          </p>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI label="전체" value={total ?? 0} />
        <KPI label="신규" value={activeCount ?? 0} highlight="blue" />
        <KPI label="A등급" value={aGrade ?? 0} highlight="blue" />
        <KPI label="법인" value={corpCount ?? 0} highlight="cyan" />
      </div>

      {/* 필터 */}
      <div className="bg-white border rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm text-neutral-600 mb-2">
          <Filter className="h-4 w-4" />
          <span className="font-medium">필터</span>
          {(classification || grade || status || corp) && (
            <Link
              href="/admin/customers"
              className="ml-auto text-xs text-blue-700 hover:underline"
            >
              초기화
            </Link>
          )}
        </div>
        {uniqueClassifications.length > 0 && (
          <FilterGroup label="분류">
            <Chip
              href={buildUrl({ classification: "", page: "1" })}
              active={!classification}
              label="전체"
            />
            {uniqueClassifications.map((c) => (
              <Chip
                key={c}
                href={buildUrl({
                  classification: c === classification ? "" : c,
                  page: "1",
                })}
                active={classification === c}
                label={c}
              />
            ))}
          </FilterGroup>
        )}
        <FilterGroup label="등급">
          <Chip
            href={buildUrl({ grade: "", page: "1" })}
            active={!grade}
            label="전체"
          />
          {["A", "B", "C"].map((g) => (
            <Chip
              key={g}
              href={buildUrl({ grade: g === grade ? "" : g, page: "1" })}
              active={grade === g}
              label={g}
            />
          ))}
        </FilterGroup>
        <FilterGroup label="상태">
          <Chip
            href={buildUrl({ status: "", page: "1" })}
            active={!status}
            label="전체"
          />
          {STATUSES.map((s) => (
            <Chip
              key={s}
              href={buildUrl({ status: s === status ? "" : s, page: "1" })}
              active={status === s}
              label={s}
            />
          ))}
        </FilterGroup>
        <FilterGroup label="법인">
          <Chip
            href={buildUrl({ corp: "", page: "1" })}
            active={!corp}
            label="전체"
          />
          <Chip
            href={buildUrl({ corp: corp === "y" ? "" : "y", page: "1" })}
            active={corp === "y"}
            label="법인"
          />
          <Chip
            href={buildUrl({ corp: corp === "n" ? "" : "n", page: "1" })}
            active={corp === "n"}
            label="개인"
          />
        </FilterGroup>
      </div>

      {/* 표 */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-4 py-3 text-xs font-medium text-neutral-500 border-b bg-neutral-50">
          <div className="col-span-1">번호</div>
          <div className="col-span-2">이름</div>
          <div className="col-span-2">연락처</div>
          <div className="col-span-1">분류</div>
          <div className="col-span-1">유형</div>
          <div className="col-span-2 text-right">예산</div>
          <div className="col-span-1">등급</div>
          <div className="col-span-1">상태</div>
          <div className="col-span-1">등록일</div>
        </div>
        {!rows || rows.length === 0 ? (
          <div className="text-center py-16 text-neutral-400 text-sm">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <div>고객 데이터가 없습니다.</div>
            <div className="text-xs mt-2 text-neutral-400">
              매물 분석(M3 파이프라인)에서 소유자가 자동 등록됩니다.
            </div>
          </div>
        ) : (
          <div className="divide-y">
            {rows.map((r) => (
              <div
                key={r.id}
                className="grid grid-cols-12 gap-2 px-4 py-3 text-sm hover:bg-neutral-50 transition-colors"
              >
                <div className="col-span-1 font-mono text-xs text-neutral-500 truncate">
                  {r.customer_no ?? "—"}
                </div>
                <div className="col-span-2 min-w-0">
                  <div className="font-medium text-neutral-900 truncate flex items-center gap-1">
                    {r.is_corp && (
                      <Building2 className="h-3 w-3 text-neutral-400 flex-shrink-0" />
                    )}
                    {r.name}
                  </div>
                  {r.biz_number && (
                    <div className="font-mono text-xs text-neutral-500 truncate">
                      {r.biz_number}
                    </div>
                  )}
                </div>
                <div className="col-span-2 text-xs text-neutral-600 space-y-0.5">
                  {r.phone && (
                    <div className="flex items-center gap-1">
                      <Phone className="h-3 w-3 text-neutral-400" />
                      {r.phone}
                    </div>
                  )}
                  {r.email && (
                    <div className="flex items-center gap-1 truncate">
                      <Mail className="h-3 w-3 text-neutral-400" />
                      <span className="truncate">{r.email}</span>
                    </div>
                  )}
                </div>
                <div className="col-span-1 text-xs text-neutral-700 truncate">
                  {r.classification ?? "—"}
                </div>
                <div className="col-span-1 text-xs">
                  {r.customer_type && r.customer_type.length > 0 ? (
                    <div className="flex flex-wrap gap-0.5">
                      {r.customer_type.slice(0, 2).map((t) => (
                        <span
                          key={t}
                          className="px-1 py-0.5 rounded bg-neutral-100 text-neutral-700"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-neutral-400">—</span>
                  )}
                </div>
                <div className="col-span-2 text-right text-xs text-neutral-700">
                  {r.budget_min || r.budget_max ? (
                    <>
                      {won(r.budget_min)} ~ {won(r.budget_max)}
                    </>
                  ) : (
                    <span className="text-neutral-400">—</span>
                  )}
                </div>
                <div className="col-span-1">
                  <span
                    className={
                      "inline-block px-1.5 py-0.5 rounded text-xs border " +
                      gradeBadgeClass(r.grade)
                    }
                  >
                    {r.grade ?? "—"}
                  </span>
                </div>
                <div className="col-span-1 text-xs text-neutral-600">
                  {r.status}
                </div>
                <div className="col-span-1 text-xs text-neutral-500">
                  {formatDate(r.created_at)}
                </div>
              </div>
            ))}
          </div>
        )}

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
                다음
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
}: {
  label: string;
  value: number;
  highlight?: "blue" | "cyan";
}) {
  return (
    <div className="p-4 rounded-lg border bg-white">
      <div className="text-xs text-neutral-500">{label}</div>
      <div
        className={
          "text-2xl font-bold mt-1 " +
          (highlight === "cyan"
            ? "text-cyan-700"
            : highlight === "blue"
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
      <span className="text-xs font-medium text-neutral-500 w-16 flex-shrink-0">
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

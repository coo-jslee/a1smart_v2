/**
 * /admin/inquiries — 고객 의뢰 일람 (M7 후속3).
 *
 *  - 필터: 유형(매도/매수/일반/매물) + 상태(new/reviewing/replied/closed) + 거래형태(매매/전세/월세)
 *  - 정렬: 최신순 (replied_at desc 가 아니라 created_at desc 가 자연스러움)
 *  - 페이지네이션: 20건씩
 *  - 상단 KPI: 신규/검토중/답변완료/종료 + 오늘 인입 건수
 *  - row 클릭 → URL ?detail=<id> → InquiryDetailDialog 가 자동 열림 (URL 기반 — 새로고침 시 유지)
 */
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { InquiryDetailDialog } from "./inquiry-detail-client";
import {
  Mail,
  Phone,
  Building2,
  Search,
  TrendingUp,
  HandshakeIcon,
} from "lucide-react";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

type SearchParams = Promise<{
  type?: string;
  status?: string;
  tx?: string;
  page?: string;
  detail?: string;
}>;

const TYPE_LABELS: Record<string, string> = {
  contact: "일반",
  sell: "매도",
  buy: "매수",
  property: "매물문의",
};

const STATUS_LABELS: Record<string, string> = {
  new: "신규",
  reviewing: "검토중",
  replied: "답변완료",
  closed: "종료",
};

function formatDate(s: string | null | undefined): string {
  if (!s) return "—";
  return new Date(s).toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
function won(n: number | null | undefined): string {
  if (!n) return "—";
  if (n >= 1e8) return `${(n / 1e8).toFixed(2)}억`;
  if (n >= 1e4) return `${(n / 1e4).toFixed(0)}만`;
  return n.toLocaleString();
}
function statusBadgeClass(s: string | null): string {
  switch (s) {
    case "new":
      return "bg-red-100 text-red-700 border-red-200";
    case "reviewing":
      return "bg-amber-100 text-amber-700 border-amber-200";
    case "replied":
      return "bg-green-100 text-green-700 border-green-200";
    case "closed":
      return "bg-neutral-200 text-neutral-600 border-neutral-300";
    default:
      return "bg-neutral-100 text-neutral-700 border-neutral-200";
  }
}
function typeBadgeClass(t: string | null): string {
  switch (t) {
    case "sell":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "buy":
      return "bg-violet-100 text-violet-800 border-violet-200";
    case "property":
      return "bg-cyan-100 text-cyan-800 border-cyan-200";
    case "contact":
      return "bg-neutral-100 text-neutral-700 border-neutral-200";
    default:
      return "bg-neutral-100 text-neutral-700 border-neutral-200";
  }
}

export default async function InquiriesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const type = sp.type ?? "";
  const status = sp.status ?? "";
  const tx = sp.tx ?? "";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10));
  const detailId = sp.detail ? parseInt(sp.detail, 10) : null;

  const supabase = await createSupabaseServerClient();

  // 상태별 카운트 (KPI 카드)
  const allStatuses = ["new", "reviewing", "replied", "closed"] as const;
  const counts: Record<string, number> = { new: 0, reviewing: 0, replied: 0, closed: 0 };
  const countResults = await Promise.all(
    allStatuses.map((st) =>
      supabase
        .from("inquiries")
        .select("id", { count: "exact", head: true })
        .eq("status", st),
    ),
  );
  allStatuses.forEach((st, i) => {
    counts[st] = countResults[i].count ?? 0;
  });

  // 오늘 인입
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const { count: todayCount } = await supabase
    .from("inquiries")
    .select("id", { count: "exact", head: true })
    .gte("created_at", todayStart.toISOString());

  // 일람 (필터 + 페이지네이션)
  let query = supabase
    .from("inquiries")
    .select(
      "id, created_at, inquiry_type, transaction_type, name, phone, email, subject, property_type, region, expected_price, budget_min, monthly_rent_max, area_m2, status",
      { count: "exact" },
    );
  if (type) query = query.eq("inquiry_type", type);
  if (status) query = query.eq("status", status);
  if (tx) query = query.eq("transaction_type", tx);

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data: rows, count: totalCount } = await query;
  const totalPages = Math.max(1, Math.ceil((totalCount ?? 0) / PAGE_SIZE));

  // 상세 대상 row (open 상태)
  const detailRow = detailId
    ? (rows ?? []).find((r) => r.id === detailId) ?? null
    : null;
  // detail이 현재 페이지에 없으면 추가 fetch
  let detailFull: Awaited<ReturnType<typeof fetchInquiry>> | null = null;
  if (detailId && !detailRow) {
    detailFull = await fetchInquiry(supabase, detailId);
  } else if (detailRow) {
    detailFull = await fetchInquiry(supabase, detailId!);
  }

  function buildUrl(overrides: Record<string, string | undefined>): string {
    const params = new URLSearchParams();
    if (type) params.set("type", type);
    if (status) params.set("status", status);
    if (tx) params.set("tx", tx);
    if (page > 1) params.set("page", String(page));
    for (const [k, v] of Object.entries(overrides)) {
      if (v === undefined || v === "") params.delete(k);
      else params.set(k, v);
    }
    const qs = params.toString();
    return qs ? `/admin/inquiries?${qs}` : "/admin/inquiries";
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">고객 의뢰</h1>
          <p className="mt-1 text-sm text-neutral-500">
            매도 의뢰 · 매수 의뢰 · 일반 문의 통합 관리
          </p>
        </div>
        <div className="text-xs text-neutral-500">
          오늘 인입 <span className="font-bold text-blue-900">{todayCount ?? 0}</span>건
        </div>
      </div>

      {/* KPI 4분할 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {allStatuses.map((st) => (
          <Link
            key={st}
            href={buildUrl({ status: st === status ? "" : st, page: "1" })}
            className={
              "p-4 rounded-lg border bg-white hover:shadow-sm transition-all " +
              (status === st ? "ring-2 ring-blue-200 border-blue-200" : "")
            }
          >
            <div className="text-xs text-neutral-500">{STATUS_LABELS[st]}</div>
            <div
              className={
                "text-2xl font-bold mt-1 " +
                (st === "new"
                  ? "text-red-700"
                  : st === "reviewing"
                  ? "text-amber-700"
                  : st === "replied"
                  ? "text-green-700"
                  : "text-neutral-600")
              }
            >
              {counts[st].toLocaleString()}
            </div>
          </Link>
        ))}
      </div>

      {/* 필터 */}
      <div className="bg-white border rounded-lg p-4 space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs font-medium text-neutral-500 w-12">유형</span>
          <Chip href={buildUrl({ type: "", page: "1" })} active={!type}>
            전체
          </Chip>
          {Object.entries(TYPE_LABELS).map(([k, v]) => (
            <Chip
              key={k}
              href={buildUrl({ type: k === type ? "" : k, page: "1" })}
              active={type === k}
              colorClass={typeBadgeClass(k)}
            >
              {v}
            </Chip>
          ))}
          {(type === "buy" || tx) && (
            <>
              <span className="text-xs font-medium text-neutral-500 ml-3 w-16">
                거래형태
              </span>
              {(["매매", "전세", "월세"] as const).map((t) => (
                <Chip
                  key={t}
                  href={buildUrl({ tx: tx === t ? "" : t, page: "1" })}
                  active={tx === t}
                >
                  {t}
                </Chip>
              ))}
            </>
          )}
        </div>
      </div>

      {/* 일람 */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-4 py-3 text-xs font-medium text-neutral-500 border-b bg-neutral-50">
          <div className="col-span-2">시각 / 상태</div>
          <div className="col-span-1">유형</div>
          <div className="col-span-2">이름</div>
          <div className="col-span-2">연락처</div>
          <div className="col-span-2">매물 / 지역</div>
          <div className="col-span-2 text-right">예산</div>
          <div className="col-span-1 text-right">액션</div>
        </div>

        {!rows || rows.length === 0 ? (
          <div className="text-center py-16 text-neutral-400 text-sm">
            조건에 맞는 의뢰가 없습니다.
          </div>
        ) : (
          <div className="divide-y">
            {rows.map((r) => {
              const isBuy = r.inquiry_type === "buy";
              const budgetDisplay = isBuy
                ? r.transaction_type === "월세"
                  ? `${won(r.expected_price)} / 월 ${won(r.monthly_rent_max)}`
                  : r.budget_min
                  ? `${won(r.budget_min)} ~ ${won(r.expected_price)}`
                  : won(r.expected_price)
                : won(r.expected_price);
              const TypeIcon =
                r.inquiry_type === "sell"
                  ? Building2
                  : r.inquiry_type === "buy"
                  ? Search
                  : HandshakeIcon;
              return (
                <Link
                  key={r.id}
                  href={buildUrl({ detail: String(r.id) })}
                  className="grid grid-cols-12 gap-2 px-4 py-3 text-sm hover:bg-neutral-50 transition-colors"
                >
                  <div className="col-span-2">
                    <div className="font-mono text-xs text-neutral-700">
                      {formatDate(r.created_at)}
                    </div>
                    <span
                      className={
                        "inline-block mt-1 px-1.5 py-0.5 rounded text-xs border " +
                        statusBadgeClass(r.status)
                      }
                    >
                      {STATUS_LABELS[r.status] ?? r.status}
                    </span>
                  </div>
                  <div className="col-span-1">
                    <span
                      className={
                        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs border " +
                        typeBadgeClass(r.inquiry_type)
                      }
                    >
                      <TypeIcon className="h-3 w-3" />
                      {TYPE_LABELS[r.inquiry_type] ?? r.inquiry_type}
                      {isBuy && r.transaction_type && (
                        <span className="ml-0.5 text-[10px] opacity-80">
                          ·{r.transaction_type}
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="col-span-2 font-medium text-neutral-900">
                    {r.name}
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
                  <div className="col-span-2 text-xs">
                    <div className="text-neutral-900">{r.property_type ?? "—"}</div>
                    <div className="text-neutral-500 truncate">
                      {r.region ?? "—"}
                    </div>
                  </div>
                  <div className="col-span-2 text-right text-sm font-medium text-blue-900">
                    {budgetDisplay}
                  </div>
                  <div className="col-span-1 text-right text-xs text-blue-700 hover:underline">
                    상세 →
                  </div>
                </Link>
              );
            })}
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
              {page} / {totalPages} (총 {totalCount}건)
            </span>
            {page < totalPages && (
              <Link
                href={buildUrl({ page: String(page + 1) })}
                className="text-xs px-3 py-1 bg-white border rounded hover:bg-neutral-50"
              >
                다음 →
              </Link>
            )}
          </div>
        )}
      </div>

      {/* 상세 다이얼로그 (URL 기반) */}
      {detailFull && (
        <InquiryDetailDialog
          inquiry={detailFull}
          closeHref={buildUrl({ detail: "" })}
        />
      )}

      {/* 신규 메모 */}
      {counts.new > 0 && status !== "new" && (
        <div className="text-xs text-neutral-500 italic">
          ※ 미처리 신규 의뢰 <span className="font-bold text-red-700">{counts.new}</span>건이 있습니다.{" "}
          <Link
            href={buildUrl({ status: "new", page: "1" })}
            className="text-blue-700 hover:underline"
          >
            바로 확인 →
          </Link>
        </div>
      )}
    </div>
  );
}

// ─── 헬퍼 ─────────────────────────────────────────────────────────────
async function fetchInquiry(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  id: number,
) {
  const { data } = await supabase
    .from("inquiries")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data;
}

function Chip({
  href,
  active,
  children,
  colorClass,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
  colorClass?: string;
}) {
  return (
    <Link
      href={href}
      className={
        "px-2.5 py-1 text-xs rounded border transition-colors " +
        (active
          ? "bg-blue-900 border-blue-900 text-white"
          : colorClass
          ? colorClass
          : "bg-white border-neutral-200 text-neutral-600 hover:border-blue-200")
      }
    >
      {children}
    </Link>
  );
}

// TrendingUp 임포트는 향후 KPI 트렌드 카드용 (현재 미사용)
void TrendingUp;

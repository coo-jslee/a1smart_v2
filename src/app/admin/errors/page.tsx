/**
 * /admin/errors — 자동화 실패 로그 일람.
 *
 *  - error_logs 테이블: stage·severity·message·payload
 *  - 필터: severity, stage
 *  - 정렬: 최신순
 */
import Link from "next/link";
import {
  AlertTriangle,
  Filter,
  Info,
  AlertCircle,
  XCircle,
  ShieldAlert,
} from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

type SearchParams = Promise<{
  severity?: string;
  stage?: string;
  page?: string;
}>;

const SEVERITIES = ["INFO", "WARN", "ERROR", "CRITICAL"];
const STAGES = [
  "01_입수",
  "02_발급",
  "03_저장",
  "04_발췌",
  "05_입력",
  "06_시세조사",
  "07_분석보고서",
  "99_오류",
];

function formatDate(s: string): string {
  return new Date(s).toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function severityClass(s: string): string {
  switch (s) {
    case "INFO":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "WARN":
      return "bg-amber-100 text-amber-700 border-amber-200";
    case "ERROR":
      return "bg-red-100 text-red-700 border-red-200";
    case "CRITICAL":
      return "bg-red-600 text-white border-red-800";
    default:
      return "bg-neutral-100 text-neutral-600 border-neutral-200";
  }
}

function SeverityIcon({ s }: { s: string }) {
  const cls = "h-4 w-4";
  if (s === "INFO") return <Info className={cls + " text-blue-700"} />;
  if (s === "WARN") return <AlertCircle className={cls + " text-amber-600"} />;
  if (s === "ERROR") return <XCircle className={cls + " text-red-600"} />;
  if (s === "CRITICAL")
    return <ShieldAlert className={cls + " text-red-700"} />;
  return <AlertTriangle className={cls + " text-neutral-500"} />;
}

export default async function AdminErrorsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const severity = sp.severity ?? "";
  const stage = sp.stage ?? "";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10));

  const supabase = await createSupabaseServerClient();

  // KPI (severity별)
  const counts: Record<string, number> = {};
  await Promise.all(
    SEVERITIES.map(async (sev) => {
      const { count } = await supabase
        .from("error_logs")
        .select("id", { count: "exact", head: true })
        .eq("severity", sev);
      counts[sev] = count ?? 0;
    }),
  );

  // 24시간 인입
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: last24 } = await supabase
    .from("error_logs")
    .select("id", { count: "exact", head: true })
    .gte("created_at", last24h);

  // 쿼리
  let query = supabase
    .from("error_logs")
    .select(
      "id, created_at, asr_code, stage, severity, error_code, message, stack_trace",
      { count: "exact" },
    );
  if (severity) query = query.eq("severity", severity);
  if (stage) query = query.eq("stage", stage);

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data: rows, count: filteredCount } = await query;
  const totalPages = Math.max(1, Math.ceil((filteredCount ?? 0) / PAGE_SIZE));

  function buildUrl(overrides: Record<string, string | undefined>): string {
    const params = new URLSearchParams();
    if (severity) params.set("severity", severity);
    if (stage) params.set("stage", stage);
    if (page > 1) params.set("page", String(page));
    for (const [k, v] of Object.entries(overrides)) {
      if (v === undefined || v === "") params.delete(k);
      else params.set(k, v);
    }
    const qs = params.toString();
    return qs ? `/admin/errors?${qs}` : "/admin/errors";
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold">오류 로그</h1>
        <p className="mt-1 text-sm text-neutral-500">
          자동화 파이프라인 실패 기록 (PDF 추출·시세 산출·보고서 생성 등)
        </p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KPI label="최근 24시간" value={last24 ?? 0} highlight />
        {SEVERITIES.map((sev) => (
          <Link
            key={sev}
            href={buildUrl({ severity: sev === severity ? "" : sev, page: "1" })}
            className={
              "p-4 rounded-lg border bg-white hover:shadow-sm transition-all " +
              (severity === sev ? "ring-2 ring-blue-200 border-blue-300" : "")
            }
          >
            <div className="text-xs text-neutral-500 flex items-center gap-1">
              <SeverityIcon s={sev} />
              {sev}
            </div>
            <div
              className={
                "text-2xl font-bold mt-1 " +
                (sev === "CRITICAL" || sev === "ERROR"
                  ? "text-red-700"
                  : sev === "WARN"
                  ? "text-amber-700"
                  : "text-neutral-900")
              }
            >
              {counts[sev]?.toLocaleString() ?? "0"}
            </div>
          </Link>
        ))}
      </div>

      {/* 필터 */}
      <div className="bg-white border rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm text-neutral-600 mb-2">
          <Filter className="h-4 w-4" />
          <span className="font-medium">필터</span>
          {(severity || stage) && (
            <Link
              href="/admin/errors"
              className="ml-auto text-xs text-blue-700 hover:underline"
            >
              초기화
            </Link>
          )}
        </div>
        <FilterGroup label="심각도">
          <Chip
            href={buildUrl({ severity: "", page: "1" })}
            active={!severity}
            label="전체"
          />
          {SEVERITIES.map((s) => (
            <Chip
              key={s}
              href={buildUrl({ severity: s === severity ? "" : s, page: "1" })}
              active={severity === s}
              label={s}
            />
          ))}
        </FilterGroup>
        <FilterGroup label="단계">
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
              label={s}
            />
          ))}
        </FilterGroup>
      </div>

      {/* 일람 */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-4 py-3 text-xs font-medium text-neutral-500 border-b bg-neutral-50">
          <div className="col-span-2">시각</div>
          <div className="col-span-1">심각도</div>
          <div className="col-span-2">단계</div>
          <div className="col-span-2">ASR / 에러코드</div>
          <div className="col-span-5">메시지</div>
        </div>
        {!rows || rows.length === 0 ? (
          <div className="text-center py-16 text-neutral-400 text-sm">
            <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <div>오류 로그가 없습니다.</div>
            <div className="text-xs mt-2 text-green-600">
              ✓ 시스템이 안정적으로 동작 중입니다.
            </div>
          </div>
        ) : (
          <div className="divide-y">
            {rows.map((r) => (
              <details
                key={r.id}
                className="group [&_summary::-webkit-details-marker]:hidden"
              >
                <summary className="grid grid-cols-12 gap-2 px-4 py-3 text-sm hover:bg-neutral-50 transition-colors cursor-pointer">
                  <div className="col-span-2 font-mono text-xs text-neutral-700">
                    {formatDate(r.created_at)}
                  </div>
                  <div className="col-span-1">
                    <span
                      className={
                        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs border " +
                        severityClass(r.severity)
                      }
                    >
                      <SeverityIcon s={r.severity} />
                      {r.severity}
                    </span>
                  </div>
                  <div className="col-span-2 text-xs text-neutral-700">
                    {r.stage}
                  </div>
                  <div className="col-span-2 text-xs">
                    {r.asr_code && (
                      <Link
                        href={`/admin/properties/${r.asr_code}`}
                        className="font-mono text-blue-700 hover:underline truncate block"
                      >
                        {r.asr_code}
                      </Link>
                    )}
                    {r.error_code && (
                      <div className="font-mono text-neutral-500 truncate">
                        {r.error_code}
                      </div>
                    )}
                  </div>
                  <div className="col-span-5 text-xs text-neutral-800 truncate">
                    {r.message}
                  </div>
                </summary>
                {r.stack_trace && (
                  <div className="px-4 py-3 bg-neutral-50 border-t">
                    <div className="text-xs font-medium text-neutral-600 mb-1">
                      Stack trace
                    </div>
                    <pre className="text-xs font-mono whitespace-pre-wrap text-red-700 max-h-64 overflow-auto">
                      {r.stack_trace}
                    </pre>
                  </div>
                )}
              </details>
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
  highlight?: boolean;
}) {
  return (
    <div className="p-4 rounded-lg border bg-white">
      <div className="text-xs text-neutral-500">{label}</div>
      <div
        className={
          "text-2xl font-bold mt-1 " +
          (highlight ? "text-blue-900" : "text-neutral-900")
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

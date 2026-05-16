/**
 * 공개 매물 리스트 페이지 (`/properties`) — M7 1차.
 *
 * 비로그인도 접근 가능. 상세 페이지는 로그인 가드.
 *
 * 쿼리 파라미터:
 *   ?type=상가|아파트|...           (매물 종류 필터)
 *   ?region=11710                    (LAWD_CD 시군구 코드)
 *   ?minPrice=N&maxPrice=N           (매매가 원 단위)
 *   ?risk=안전|주의|위험
 *   ?page=1                          (12건씩 페이지네이션)
 *   ?sort=newest|price-asc|price-desc
 */
import Link from "next/link";
import { Filter, ArrowRight, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PublicNavbar } from "@/components/public/public-navbar";
import { PublicFooter } from "@/components/public/public-footer";
import {
  PropertyCard,
  type PropertyCardData,
} from "@/components/public/property-card";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 12;

type SearchParams = Promise<{
  type?: string;
  region?: string;
  minPrice?: string;
  maxPrice?: string;
  risk?: string;
  page?: string;
  sort?: "newest" | "price-asc" | "price-desc";
}>;

const PROPERTY_TYPES = ["아파트", "오피스텔", "빌라", "상가", "단독상가"];
const RISK_GRADES = ["안전", "주의", "위험"];
const REGIONS = [
  { code: "", label: "전체" },
  { code: "11710", label: "송파구" },
  { code: "11680", label: "강남구" },
  { code: "11650", label: "서초구" },
  { code: "11440", label: "마포구" },
  { code: "11200", label: "성동구" },
  { code: "41135", label: "분당구" },
];

const PRICE_RANGES = [
  { value: "", label: "전체" },
  { value: "0-300000000", label: "3억 이하" },
  { value: "300000000-1000000000", label: "3~10억" },
  { value: "1000000000-3000000000", label: "10~30억" },
  { value: "3000000000-10000000000", label: "30~100억" },
  { value: "10000000000-", label: "100억 이상" },
];

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10));
  const sort = sp.sort ?? "newest";
  const type = sp.type ?? "";
  const region = sp.region ?? "";
  const risk = sp.risk ?? "";
  const minPrice = sp.minPrice ? parseInt(sp.minPrice, 10) : null;
  const maxPrice = sp.maxPrice ? parseInt(sp.maxPrice, 10) : null;

  const supabase = await createSupabaseServerClient();

  // 쿼리 조립
  let query = supabase
    .from("properties")
    .select(
      "asr_code, address_road, address_jibun, property_type, building_name, exclusive_m2, floor_no, total_floors, built_year, sale_price, unit_price_m2, risk_grade, is_distressed, image_paths, created_at",
      { count: "exact" },
    )
    .eq("is_public", true);

  if (type) query = query.eq("property_type", type);
  if (region) query = query.eq("lawd_cd", region);
  if (risk) query = query.eq("risk_grade", risk);
  if (minPrice != null) query = query.gte("sale_price", minPrice);
  if (maxPrice != null) query = query.lte("sale_price", maxPrice);

  if (sort === "price-asc") query = query.order("sale_price", { ascending: true });
  else if (sort === "price-desc")
    query = query.order("sale_price", { ascending: false });
  else query = query.order("created_at", { ascending: false });

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  query = query.range(from, to);

  const { data, count } = await query;

  const list: PropertyCardData[] = (data ?? []).map((p) => ({
    asr_code: p.asr_code,
    address_road: p.address_road,
    address_jibun: p.address_jibun,
    property_type: p.property_type,
    building_name: p.building_name,
    exclusive_m2: p.exclusive_m2 ? Number(p.exclusive_m2) : null,
    floor_no: p.floor_no,
    total_floors: p.total_floors,
    built_year: p.built_year,
    sale_price: p.sale_price,
    unit_price_m2: p.unit_price_m2,
    risk_grade: p.risk_grade,
    is_distressed: p.is_distressed,
    image_paths: p.image_paths ?? [],
  }));

  const totalCount = count ?? list.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // 현재 필터 상태로 URL 빌더
  function buildUrl(overrides: Record<string, string | undefined>): string {
    const params = new URLSearchParams();
    if (type) params.set("type", type);
    if (region) params.set("region", region);
    if (risk) params.set("risk", risk);
    if (minPrice != null) params.set("minPrice", String(minPrice));
    if (maxPrice != null) params.set("maxPrice", String(maxPrice));
    if (sort !== "newest") params.set("sort", sort);
    if (page > 1) params.set("page", String(page));
    for (const [k, v] of Object.entries(overrides)) {
      if (v === undefined || v === "") params.delete(k);
      else params.set(k, v);
    }
    const qs = params.toString();
    return qs ? `/properties?${qs}` : "/properties";
  }

  const priceRangeValue =
    minPrice != null || maxPrice != null
      ? `${minPrice ?? 0}-${maxPrice ?? ""}`
      : "";

  return (
    <div className="flex flex-col flex-1 min-h-screen bg-neutral-50/40">
      <PublicNavbar />

      <section className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
            공개 매물
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            AI 합의시세·권리분석이 완료된 매물 목록 — 총 {totalCount}건
          </p>
        </div>
      </section>

      {/* 필터 바 */}
      <section className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-6 py-5">
          <div className="flex items-center gap-2 mb-3 text-sm text-neutral-600">
            <Filter className="h-4 w-4" />
            <span className="font-medium">필터</span>
            {(type || region || risk || priceRangeValue) && (
              <Link
                href="/properties"
                className="ml-auto text-xs text-blue-700 hover:underline"
              >
                초기화
              </Link>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <FilterGroup label="지역">
              {REGIONS.map((r) => (
                <FilterChip
                  key={r.code}
                  href={buildUrl({ region: r.code, page: "1" })}
                  active={region === r.code}
                  label={r.label}
                />
              ))}
            </FilterGroup>

            <FilterGroup label="매물 종류">
              <FilterChip
                href={buildUrl({ type: "", page: "1" })}
                active={!type}
                label="전체"
              />
              {PROPERTY_TYPES.map((t) => (
                <FilterChip
                  key={t}
                  href={buildUrl({ type: t, page: "1" })}
                  active={type === t}
                  label={t}
                />
              ))}
            </FilterGroup>

            <FilterGroup label="가격대">
              {PRICE_RANGES.map((p) => {
                const [mn, mx] = p.value.split("-");
                return (
                  <FilterChip
                    key={p.label}
                    href={buildUrl({
                      minPrice: mn || undefined,
                      maxPrice: mx || undefined,
                      page: "1",
                    })}
                    active={priceRangeValue === p.value}
                    label={p.label}
                  />
                );
              })}
            </FilterGroup>

            <FilterGroup label="위험등급">
              <FilterChip
                href={buildUrl({ risk: "", page: "1" })}
                active={!risk}
                label="전체"
              />
              {RISK_GRADES.map((r) => (
                <FilterChip
                  key={r}
                  href={buildUrl({ risk: r, page: "1" })}
                  active={risk === r}
                  label={r}
                />
              ))}
            </FilterGroup>
          </div>

          <div className="mt-4 flex items-center gap-2 text-sm">
            <span className="text-neutral-500">정렬:</span>
            <FilterChip
              href={buildUrl({ sort: undefined })}
              active={sort === "newest"}
              label="최신순"
              size="sm"
            />
            <FilterChip
              href={buildUrl({ sort: "price-asc" })}
              active={sort === "price-asc"}
              label="가격 낮은 순"
              size="sm"
            />
            <FilterChip
              href={buildUrl({ sort: "price-desc" })}
              active={sort === "price-desc"}
              label="가격 높은 순"
              size="sm"
            />
          </div>
        </div>
      </section>

      {/* 리스트 */}
      <section className="flex-1">
        <div className="max-w-6xl mx-auto px-6 py-10">
          {list.length === 0 ? (
            <div className="text-center py-24 text-neutral-400">
              <Building2 className="h-16 w-16 mx-auto mb-3 opacity-50" />
              <div className="text-base">
                선택한 조건의 매물이 없습니다.
              </div>
              <Link
                href="/properties"
                className="text-sm text-blue-700 hover:underline mt-2 inline-block"
              >
                전체 매물 보기
              </Link>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {list.map((p) => (
                <PropertyCard key={p.asr_code} property={p} />
              ))}
            </div>
          )}

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-2">
              {page > 1 && (
                <Link href={buildUrl({ page: String(page - 1) })}>
                  <Button variant="outline" size="sm">
                    이전
                  </Button>
                </Link>
              )}
              <span className="text-sm text-neutral-500 px-4">
                {page} / {totalPages}
              </span>
              {page < totalPages && (
                <Link href={buildUrl({ page: String(page + 1) })}>
                  <Button variant="outline" size="sm">
                    다음
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              )}
            </div>
          )}
        </div>
      </section>

      <PublicFooter />
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
    <div>
      <div className="text-xs font-medium text-neutral-500 mb-1.5">{label}</div>
      <div className="flex flex-wrap gap-1">{children}</div>
    </div>
  );
}

function FilterChip({
  href,
  active,
  label,
  size = "md",
}: {
  href: string;
  active: boolean;
  label: string;
  size?: "sm" | "md";
}) {
  return (
    <Link
      href={href}
      className={
        (size === "sm" ? "px-2 py-0.5 text-xs " : "px-2.5 py-1 text-xs ") +
        "rounded border transition-colors " +
        (active
          ? "bg-blue-900 border-blue-900 text-white"
          : "bg-white border-neutral-200 text-neutral-600 hover:border-blue-200 hover:text-blue-900")
      }
    >
      {label}
    </Link>
  );
}

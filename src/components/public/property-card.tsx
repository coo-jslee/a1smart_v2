/**
 * 매물 카드 — 홈/매물 리스트에서 공유.
 *
 * 표시 항목:
 *  - 썸네일 (image_paths[0]) / 없으면 placeholder
 *  - 위험등급 + 압류·경매 배지
 *  - 주소(도로명) / 단지명
 *  - 면적·층·준공년도
 *  - 합의시세 (강조)
 *  - ㎡당 단가
 *
 * 클릭 시 /properties/[asr] 로 이동 (상세는 로그인 가드).
 */
import Link from "next/link";
import { Building2 } from "lucide-react";
import { firstPropertyImageUrl } from "@/lib/storage/public-url";

export type PropertyCardData = {
  asr_code: string;
  address_road: string | null;
  address_jibun: string | null;
  property_type: string | null;
  building_name: string | null;
  exclusive_m2: number | null;
  floor_no: number | null;
  total_floors: number | null;
  built_year: number | null;
  sale_price: number | null;
  unit_price_m2: number | null;
  risk_grade: string | null;
  is_distressed: boolean;
  image_paths: string[];
};

function won(n: number | null | undefined): string {
  if (n == null || n === 0) return "가격 문의";
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

export function PropertyCard({ property }: { property: PropertyCardData }) {
  const thumb = firstPropertyImageUrl(property.image_paths);
  const addr = property.address_road ?? property.address_jibun ?? "주소 미상";
  const unitMan = property.unit_price_m2
    ? Math.round(property.unit_price_m2 / 10000).toLocaleString() + "만원/㎡"
    : null;

  return (
    <Link
      href={`/properties/${property.asr_code}`}
      className="group block bg-blue-950/40 border border-white/10 rounded-lg overflow-hidden hover:border-cyan-400/50 hover:shadow-lg hover:shadow-cyan-500/10 transition-all backdrop-blur-sm"
    >
      {/* 썸네일 */}
      <div className="relative aspect-[4/3] bg-blue-950 overflow-hidden">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt={addr}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-blue-300/40">
            <Building2 className="h-16 w-16" />
          </div>
        )}

        {/* 위험등급 배지 (좌상단) */}
        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
          {property.risk_grade && (
            <span
              className={
                "px-2 py-0.5 text-xs rounded border font-medium backdrop-blur-sm " +
                riskBadgeClass(property.risk_grade)
              }
            >
              {property.risk_grade}
            </span>
          )}
          {property.is_distressed && (
            <span className="px-2 py-0.5 text-xs rounded border bg-red-500/90 text-white border-red-400/50 font-medium backdrop-blur-sm">
              ⚠ 경매
            </span>
          )}
        </div>

        {/* 매물 종류 (우상단) */}
        {property.property_type && (
          <div className="absolute top-2 right-2 px-2 py-0.5 text-xs rounded bg-blue-950/85 text-blue-100 border border-white/10 font-medium backdrop-blur-sm">
            {property.property_type}
          </div>
        )}
      </div>

      {/* 본문 */}
      <div className="p-4 space-y-2">
        <div>
          <div className="text-sm text-blue-200/70 truncate">{addr}</div>
          {property.building_name && (
            <div className="font-semibold text-white truncate">
              {property.building_name}
            </div>
          )}
        </div>

        <div className="text-xs text-blue-200/60 flex flex-wrap gap-x-3 gap-y-1">
          {property.exclusive_m2 && (
            <span>
              전용 {Number(property.exclusive_m2).toFixed(1)}㎡
              <span className="text-blue-300/40">
                {" "}
                ({(Number(property.exclusive_m2) / 3.305).toFixed(1)}평)
              </span>
            </span>
          )}
          {property.floor_no != null && property.total_floors != null && (
            <span>
              {property.floor_no}F / {property.total_floors}F
            </span>
          )}
          {property.built_year && <span>{property.built_year}년 준공</span>}
        </div>

        <div className="pt-2 flex items-end justify-between border-t border-white/10">
          <div>
            <div className="text-xs text-blue-200/60">합의시세</div>
            <div className="text-lg font-bold text-yellow-300">
              {won(property.sale_price)}
            </div>
          </div>
          {unitMan && (
            <div className="text-right">
              <div className="text-xs text-blue-200/60">㎡당</div>
              <div className="text-sm font-medium text-cyan-200">
                {unitMan}
              </div>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

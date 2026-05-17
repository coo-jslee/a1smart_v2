/**
 * inquiries 테이블 상태 진단.
 *
 *  - 테이블 존재 여부
 *  - 컬럼 구조 (transaction_type 등 0007 적용 여부 확인)
 *  - 현재 row 수 + 최근 5건 미리보기
 *
 * 실행: npx tsx scripts/check-inquiries.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/supabase/types";

function loadDotenv(): void {
  try {
    const text = readFileSync(resolve(process.cwd(), ".env"), "utf8");
    for (const line of text.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq < 0) continue;
      const k = t.slice(0, eq).trim();
      const v = t.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[k]) process.env[k] = v;
    }
  } catch {}
}
loadDotenv();

const s = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

async function main() {
  console.log("🔍 inquiries 테이블 진단 시작...");
  console.log("");

  // 1) 테이블 존재 + row 수
  const { count, error: countErr } = await s
    .from("inquiries")
    .select("*", { count: "exact", head: true });

  if (countErr) {
    if (
      countErr.message.includes("relation") ||
      countErr.message.includes("does not exist") ||
      countErr.code === "42P01" ||
      countErr.code === "PGRST205"
    ) {
      console.log("❌ inquiries 테이블 미존재");
      console.log("");
      console.log("📋 다음 마이그레이션을 Supabase Studio에서 적용 필요:");
      console.log(
        "   1) supabase/migrations/0006_inquiries.sql  (테이블 생성)",
      );
      console.log(
        "   2) supabase/migrations/0007_inquiries_buy.sql (매수 의뢰 컬럼)",
      );
      console.log("");
      console.log(
        "   접속: https://supabase.com/dashboard/project/iaanyxyrwjbinbrzwcuv/sql/new",
      );
      return;
    }
    console.error("❌ 조회 실패:", countErr.message);
    return;
  }
  console.log(`✅ inquiries 테이블 존재 (현재 ${count ?? 0} row)`);

  // 2) 최근 5건 미리보기
  const { data: recent } = await s
    .from("inquiries")
    .select(
      "id, created_at, inquiry_type, transaction_type, name, phone, email, property_type, region, expected_price, monthly_rent_max, status, subject",
    )
    .order("created_at", { ascending: false })
    .limit(5);

  if (recent && recent.length > 0) {
    console.log("");
    console.log("📬 최근 접수 5건:");
    console.log("─".repeat(110));
    for (const r of recent) {
      const t = new Date(r.created_at).toLocaleString("ko-KR");
      const type =
        r.inquiry_type === "buy"
          ? `매수(${r.transaction_type ?? "?"})`
          : r.inquiry_type === "sell"
          ? "매도"
          : r.inquiry_type === "contact"
          ? "일반문의"
          : r.inquiry_type;
      const contact = r.phone ?? r.email ?? "—";
      const detail =
        r.inquiry_type === "buy"
          ? `${r.region ?? ""} / ${r.property_type ?? ""} / 예산 ${
              r.expected_price?.toLocaleString() ?? "—"
            }원`
          : r.inquiry_type === "sell"
          ? `${r.region ?? ""} / ${r.property_type ?? ""} / 희망가 ${
              r.expected_price?.toLocaleString() ?? "—"
            }원`
          : (r.subject ?? "");
      console.log(
        `  #${r.id.toString().padStart(4)}  ${t}  [${type.padEnd(10)}]  ${r.name.padEnd(10)}  ${contact.padEnd(20)}`,
      );
      console.log(`         └ ${detail}  [${r.status}]`);
    }
  } else {
    console.log("");
    console.log("📭 아직 접수된 의뢰 없음 (테이블 정상, row 0건)");
  }

  // 3) 0007 적용 여부 검증 — transaction_type 컬럼 존재 확인
  // count 쿼리는 컬럼 검증을 직접 못함. 직접 INSERT 시도 없이 select 로만.
  const probe = await s
    .from("inquiries")
    .select("transaction_type, budget_min, monthly_rent_max")
    .limit(1);
  if (probe.error) {
    console.log("");
    console.log("⚠️  0007 마이그레이션 미적용 (transaction_type 컬럼 없음)");
    console.log("    → /buy-request 폼 제출 시 INSERT 실패할 수 있음");
  } else {
    console.log("");
    console.log("✅ 0007 컬럼 확인 (transaction_type / budget_min / monthly_rent_max)");
  }
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});

/**
 * inquiries INSERT 테스트 — Server Action 의 실제 흐름과 동일.
 *
 *  - service_role 키로 INSERT (RETURNING 시 RLS SELECT 우회)
 *  - 매도 + 매수(매매/전세/월세) 4건 INSERT
 *  - 끝나면 정리 삭제 (테스트 row 0건 유지)
 *
 *  ※ 폼 제출 흐름:
 *     브라우저(anon) → /contact|/intake|/buy-request → submitInquiry Server Action
 *                                                          ↓
 *                                              service_role INSERT (이 스크립트와 동일)
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

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const svc = createClient<Database>(URL, SVC, { auth: { persistSession: false } });

const TAG = "[TEST_SMOKE_2026]"; // 정리 시 식별용

type Inquiry = Database["public"]["Tables"]["inquiries"]["Insert"];

const samples: Inquiry[] = [
  {
    inquiry_type: "sell",
    name: TAG + " 매도김",
    phone: "010-0000-0001",
    subject: "매도 의뢰 — 아파트",
    message: "매도 의뢰 테스트 메시지입니다.",
    property_type: "아파트",
    region: "서울 송파구",
    expected_price: 500000000,
    area_m2: 84.95,
    consent_privacy: true,
    consent_marketing: false,
    status: "new",
  },
  {
    inquiry_type: "buy",
    transaction_type: "매매",
    name: TAG + " 매수박",
    phone: "010-0000-0002",
    subject: "매수 의뢰 — 매매 / 아파트",
    message: "매수 매매 테스트.",
    property_type: "아파트",
    region: "서울 강남구",
    budget_min: 300000000,
    expected_price: 500000000,
    consent_privacy: true,
    status: "new",
  },
  {
    inquiry_type: "buy",
    transaction_type: "전세",
    name: TAG + " 전세이",
    email: "test@example.com",
    subject: "매수 의뢰 — 전세 / 빌라",
    message: "전세 테스트.",
    property_type: "빌라",
    region: "마포구",
    expected_price: 300000000,
    consent_privacy: true,
    status: "new",
  },
  {
    inquiry_type: "buy",
    transaction_type: "월세",
    name: TAG + " 월세최",
    phone: "010-0000-0004",
    subject: "매수 의뢰 — 월세 / 오피스텔",
    message: "월세 테스트.",
    property_type: "오피스텔",
    region: "강남구 역삼동",
    expected_price: 10000000,
    monthly_rent_max: 700000,
    consent_privacy: true,
    status: "new",
  },
];

async function main() {
  console.log("🧪 INSERT 테스트 시작 (Server Action 동일 흐름 — service_role)");
  console.log("");

  const inserted: number[] = [];
  for (const s of samples) {
    const { data, error } = await svc
      .from("inquiries")
      .insert(s)
      .select("id")
      .single();
    const label = `${s.inquiry_type}/${s.transaction_type ?? "-"}`;
    if (error) {
      console.log(`  ❌ ${label.padEnd(10)} ${s.name}  →  ${error.message}`);
    } else {
      console.log(`  ✅ ${label.padEnd(10)} ${s.name}  →  id=${data.id}`);
      inserted.push(data.id);
    }
  }
  console.log("");
  console.log(`📊 INSERT 결과: 성공 ${inserted.length}/${samples.length}건`);

  // 검증: service_role 로 다시 읽어 컬럼 값 확인
  if (inserted.length > 0) {
    const { data: rows } = await svc
      .from("inquiries")
      .select(
        "id, inquiry_type, transaction_type, name, property_type, region, expected_price, budget_min, monthly_rent_max",
      )
      .in("id", inserted);
    console.log("");
    console.log("📋 저장된 row 확인:");
    for (const r of rows ?? []) {
      const money = (n: number | null) =>
        n ? `${(n / 1e8).toFixed(2)}억` : "—";
      console.log(
        `  #${r.id}  [${r.inquiry_type}/${r.transaction_type ?? "-"}]  ${r.name}  ${r.region}  예산 ${money(r.budget_min)} ~ ${money(r.expected_price)}  월세 ${r.monthly_rent_max ?? "-"}`,
      );
    }
  }

  // 정리: 테스트 row 모두 삭제
  if (inserted.length > 0) {
    const { error: delErr } = await svc
      .from("inquiries")
      .delete()
      .in("id", inserted);
    console.log("");
    if (delErr) {
      console.log(`⚠️  테스트 row 정리 실패 (수동 삭제 필요): ${delErr.message}`);
    } else {
      console.log(`🗑️  테스트 row ${inserted.length}건 정리 완료`);
    }
  }
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});

/**
 * 임시 검증: 매물 7건의 is_public·workflow 상태 표시 + 원본 매물을 공개로 전환.
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
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const s = createClient<Database>(URL, KEY, { auth: { persistSession: false } });

const PROMOTE_ORIGIN = process.argv.includes("--promote-origin");

async function main() {
  const { data } = await s
    .from("properties")
    .select(
      "asr_code, address_road, sale_price, is_public, workflow_stage, image_paths, attachment_paths",
    )
    .like("asr_code", "ASR-11710-%")
    .order("asr_code");

  if (!data) return;

  console.log(
    "ASR".padEnd(20) +
      "주소".padEnd(40) +
      "매매가".padStart(16) +
      "  공개".padStart(8) +
      "  단계".padStart(14) +
      "  사진".padStart(6) +
      "  보고서".padStart(8),
  );
  console.log("─".repeat(120));
  for (const r of data) {
    console.log(
      r.asr_code.padEnd(20) +
        (r.address_road ?? "").padEnd(40) +
        String(r.sale_price?.toLocaleString() ?? "—").padStart(14) +
        "원" +
        ("  " + String(r.is_public)).padStart(10) +
        ("  " + (r.workflow_stage ?? "—")).padStart(16) +
        ("  " + (r.image_paths?.length ?? 0)).padStart(8) +
        ("  " + (r.attachment_paths?.length ?? 0)).padStart(10),
    );
  }
  console.log("");
  console.log(`총 ${data.length}건`);

  if (PROMOTE_ORIGIN) {
    const { error } = await s
      .from("properties")
      .update({ is_public: true })
      .eq("asr_code", "ASR-11710-000001");
    if (error) {
      console.error("❌ 원본 공개 전환 실패:", error.message);
    } else {
      console.log("✓ ASR-11710-000001 → is_public = true 갱신");
    }
  }
}

main().catch(console.error);

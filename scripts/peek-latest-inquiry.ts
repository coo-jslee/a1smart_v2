/** 최신 inquiry row 1건의 전체 컬럼 표시. */
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

async function main() {
  const s = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const { data } = await s
    .from("inquiries")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) {
    console.log("(아직 row 없음)");
    return;
  }

  console.log("📋 최신 inquiry row 전체:");
  console.log("─".repeat(80));
  for (const [k, v] of Object.entries(data)) {
    const val = v === null ? "(null)" : v === "" ? "(empty)" : v;
    console.log(`  ${k.padEnd(22)} : ${val}`);
  }
}

main().catch(console.error);

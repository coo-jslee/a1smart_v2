/**
 * 매물 복제 시드 스크립트.
 *
 * 동작: ASR-11710-000001 (송파 거여 단독상가) 매물을 6번 복제 → 총 7건 확보.
 *      홈페이지(M7) 출시 전 매물 리스트가 풍성하게 보이도록 더미 데이터 확장용.
 *
 * 실행:
 *   cd C:\\Users\\juncp\\00_claudecode\\03_A1_Smart_v2
 *   npx tsx scripts/seed-clone-properties.ts
 *
 * 옵션:
 *   --dry-run     : 실제 INSERT 없이 페이로드만 출력
 *   --source ASR-... : 원본 매물 ASR 변경 (기본: ASR-11710-000001)
 *   --count N      : 복제 개수 (기본: 6)
 *
 * 정책:
 *   - PNU·ASR·도로명·가격·면적은 자동 변형 (UNIQUE 보장)
 *   - image_paths 는 그대로 공유 (Storage 파일 1세트 재사용)
 *   - attachment_paths 는 빈 배열 (각 매물마다 따로 보고서 생성)
 *   - is_public = true (홈페이지 공개 매물)
 *   - GENERATED 컬럼 (lawd_cd, unit_price_m2) 은 INSERT 페이로드에서 제외
 *
 * 환경 변수:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/supabase/types";

/* ─── .env 수동 로딩 (tsx 단독 실행 환경) ─── */
function loadDotenv(): void {
  try {
    const text = readFileSync(resolve(process.cwd(), ".env"), "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    // .env 없으면 environ 변수 사용
  }
}
loadDotenv();

/* ─── CLI 인자 ─── */
const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const SOURCE_ASR =
  argValue("--source") ?? "ASR-11710-000001";
const CLONE_COUNT = parseInt(argValue("--count") ?? "6", 10);

function argValue(flag: string): string | undefined {
  const i = args.indexOf(flag);
  if (i < 0 || i + 1 >= args.length) return undefined;
  return args[i + 1];
}

/* ─── Supabase 클라이언트 ─── */
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error(
    "❌ NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 미설정. .env 확인.",
  );
  process.exit(1);
}
const supabase = createClient<Database>(URL, KEY, {
  auth: { persistSession: false },
});

/* ─── 변형 헬퍼 ─── */
function incrementPnu(pnu: string, delta: number): string {
  // PNU 19자리 = 시도(2) + 시군구(3) + 읍면동(3) + 리(2) + 산구분(1) + 본번(4) + 부번(4)
  // 부번(끝 4자리) 만 변경 → UNIQUE 보장
  if (pnu.length !== 19) {
    throw new Error(`PNU 19자리 아님: ${pnu} (${pnu.length}자리)`);
  }
  const prefix = pnu.slice(0, 15);
  const subno = parseInt(pnu.slice(15), 10) + delta;
  return prefix + String(subno).padStart(4, "0");
}

function bumpAddressNumber(addr: string | null, delta: number): string | null {
  if (!addr) return addr;
  // 도로명 또는 지번 안의 첫 번호 + delta
  return addr.replace(/(\d+)/, (m) => String(parseInt(m, 10) + delta));
}

function jitter(value: number | null, rangePct: number): number | null {
  if (value == null) return null;
  const factor = 1 + (Math.random() - 0.5) * (rangePct * 2);
  return Math.round(value * factor);
}

function jitterFloat(value: number | null, rangePct: number): number | null {
  if (value == null) return null;
  const factor = 1 + (Math.random() - 0.5) * (rangePct * 2);
  return Number((value * factor).toFixed(2));
}

/* ─── 메인 ─── */
async function main() {
  console.log(
    `🌱 매물 복제 시드 시작 — 원본 ${SOURCE_ASR}, 복제 ${CLONE_COUNT}건${DRY_RUN ? " (DRY-RUN)" : ""}`,
  );

  // 1) 원본 매물 fetch
  const { data: src, error: srcErr } = await supabase
    .from("properties")
    .select("*")
    .eq("asr_code", SOURCE_ASR)
    .single();
  if (srcErr || !src) {
    console.error(`❌ 원본 매물 ${SOURCE_ASR} 없음:`, srcErr?.message);
    process.exit(1);
  }
  console.log(
    `  ✓ 원본 로드: ${src.property_type ?? "?"} / ${src.address_road ?? "?"} / 매매가 ${src.sale_price?.toLocaleString() ?? "?"}원`,
  );

  // 2) 시퀀스 충돌 회피 — 기존 ASR 코드 조회
  const lawd = src.lawd_cd ?? "11710";
  const { data: existing } = await supabase
    .from("properties")
    .select("asr_code")
    .like("asr_code", `ASR-${lawd}-%`);
  const existingSet = new Set((existing ?? []).map((r) => r.asr_code));
  console.log(`  ✓ 기존 ${lawd} 매물 ${existingSet.size}건 확인`);

  // 다음 시퀀스 찾기
  let nextSeq = 2;
  function nextAsr(): string {
    while (true) {
      const code = `ASR-${lawd}-${String(nextSeq).padStart(6, "0")}`;
      nextSeq++;
      if (!existingSet.has(code)) return code;
    }
  }

  // 3) 복제 INSERT
  const results: Array<{ asr: string; ok: boolean; detail: string }> = [];
  for (let i = 0; i < CLONE_COUNT; i++) {
    const asrCode = nextAsr();
    const idx = i + 1; // 1~6

    // GENERATED 컬럼 제외
    const { lawd_cd: _l, unit_price_m2: _u, created_at: _c, updated_at: _u2, ...rest } = src;
    void _l; void _u; void _c; void _u2;

    const payload = {
      ...rest,
      asr_code: asrCode,
      pnu: incrementPnu(src.pnu, idx),
      address_road: bumpAddressNumber(src.address_road, idx * 2),
      address_jibun: bumpAddressNumber(src.address_jibun, idx),
      sale_price: jitter(src.sale_price, 0.1), // ±10%
      jeonse_deposit: jitter(src.jeonse_deposit, 0.1),
      exclusive_m2: jitterFloat(src.exclusive_m2 ? Number(src.exclusive_m2) : null, 0.05), // ±5%
      supply_m2: jitterFloat(src.supply_m2 ? Number(src.supply_m2) : null, 0.05),
      attachment_paths: [], // 각 매물 따로 보고서
      is_public: true, // 홈페이지 공개
      // image_paths: 그대로 공유 (Storage 파일 재사용)
      // external_evaluations: 그대로 (Json 필드)
    };

    if (DRY_RUN) {
      console.log(
        `  [DRY] ${asrCode} | PNU ${payload.pnu} | ${payload.address_road} | 매매 ${payload.sale_price?.toLocaleString()}원`,
      );
      results.push({
        asr: asrCode,
        ok: true,
        detail: "dry-run",
      });
      continue;
    }

    const { error: insErr } = await supabase
      .from("properties")
      .insert(payload);
    if (insErr) {
      console.error(`  ❌ ${asrCode} 실패:`, insErr.message);
      results.push({
        asr: asrCode,
        ok: false,
        detail: insErr.message,
      });
    } else {
      console.log(
        `  ✓ ${asrCode} | PNU ${payload.pnu} | ${payload.address_road} | 매매 ${payload.sale_price?.toLocaleString()}원`,
      );
      results.push({
        asr: asrCode,
        ok: true,
        detail: `매매가 ${payload.sale_price?.toLocaleString()}원`,
      });
    }
  }

  // 4) price_history 합의시세 row 복제 (각 새 매물에 대해)
  if (!DRY_RUN) {
    const { data: srcConsensus } = await supabase
      .from("price_history")
      .select("*")
      .eq("asr_code", SOURCE_ASR)
      .eq("is_consensus", true)
      .order("recorded_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (srcConsensus) {
      const okClones = results.filter((r) => r.ok).map((r) => r.asr);
      const consensusInserts = okClones.map((asr) => {
        const { id: _id, recorded_at: _r, ...rest } = srcConsensus;
        void _id; void _r;
        // 가격을 매물 sale_price와 맞춰 약간 변형
        return {
          ...rest,
          asr_code: asr,
        };
      });
      const { error: chErr } = await supabase
        .from("price_history")
        .insert(consensusInserts);
      if (chErr) {
        console.error(`  ⚠️ 합의시세 row 복제 일부 실패:`, chErr.message);
      } else {
        console.log(
          `  ✓ 합의시세 row ${consensusInserts.length}건 복제 (price_history)`,
        );
      }
    } else {
      console.log("  · 원본에 합의시세 row 없음 → 복제 스킵");
    }
  }

  // 5) 요약
  console.log("");
  console.log("─".repeat(60));
  const okCount = results.filter((r) => r.ok).length;
  const failCount = results.filter((r) => !r.ok).length;
  console.log(`✅ 완료: 성공 ${okCount}/${results.length}건, 실패 ${failCount}건`);
  if (failCount > 0) process.exit(1);
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});

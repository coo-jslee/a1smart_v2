/**
 * Supabase 마이그레이션 SQL 파일을 service_role 로 실행.
 *
 * 실행:
 *   npx tsx scripts/apply-migration.ts supabase/migrations/0006_inquiries.sql
 *
 * Supabase REST 의 SQL 엔드포인트는 노출되지 않아 pg connection string 필요.
 * 대안: 각 문장을 개별 RPC 호출로 분리하는 방식은 트랜잭션 안 됨.
 * → 가장 안전한 방법: `pg` 라이브러리 + DATABASE_URL.
 *
 * 환경 변수 (택 1):
 *   1) SUPABASE_DB_URL=postgresql://postgres:[PWD]@db.[REF].supabase.co:5432/postgres
 *   2) Supabase 대시보드의 Connection string 직접 사용
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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

const sqlPath = process.argv[2];
if (!sqlPath) {
  console.error("사용법: npx tsx scripts/apply-migration.ts <path-to.sql>");
  process.exit(1);
}

// 1) SUPABASE_DB_URL or DATABASE_URL 우선 사용
// 2) 없으면 SUPABASE_DB_PASSWORD + NEXT_PUBLIC_SUPABASE_URL 로 자동 조립 (pooler)
function buildDbUrl(): string | null {
  if (process.env.SUPABASE_DB_URL) return process.env.SUPABASE_DB_URL;
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const pwd = process.env.SUPABASE_DB_PASSWORD;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!pwd || !url) return null;

  // url: https://{ref}.supabase.co → ref 추출
  const m = url.match(/https:\/\/([a-z0-9]+)\.supabase\.co/);
  if (!m) return null;
  const ref = m[1];

  // Supabase Session Pooler (region에 무관하게 aws-0-ap-northeast-2 — Seoul 프로젝트)
  // 비밀번호에 특수문자가 있으면 URL 인코딩 필요
  const encPwd = encodeURIComponent(pwd);
  return `postgresql://postgres.${ref}:${encPwd}@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres`;
}

const dbUrl = buildDbUrl();
if (!dbUrl) {
  console.error(
    `❌ DB 접속 정보 없음.

다음 중 하나 설정:
  - SUPABASE_DB_URL=postgresql://... (Connection string 직접)
  - 또는 .env 에 SUPABASE_DB_PASSWORD + NEXT_PUBLIC_SUPABASE_URL 모두 있어야 자동 조립됨

대안: Supabase Studio SQL Editor 에서 직접 ${sqlPath} 내용 붙여넣기.
`,
  );
  process.exit(1);
}

const sql = readFileSync(sqlPath, "utf8");

async function main() {
  const pg = await import("pg").catch(() => null);
  if (!pg) {
    console.error(
      "❌ 'pg' 패키지 미설치. 다음 명령 실행 후 재시도:\n  npm install --save-dev pg @types/pg",
    );
    process.exit(1);
  }
  const { Client } = pg.default ?? pg;
  const client = new Client({ connectionString: dbUrl ?? undefined });
  await client.connect();
  console.log(`📂 ${sqlPath} 실행 중 (${sql.length}자)...`);
  try {
    await client.query(sql);
    console.log(`✅ 적용 완료`);
  } catch (e) {
    const err = e as { message: string; position?: number; hint?: string };
    console.error(`❌ SQL 실행 실패: ${err.message}`);
    if (err.hint) console.error(`   hint: ${err.hint}`);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});

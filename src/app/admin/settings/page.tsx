/**
 * /admin/settings — 환경설정 (현황 + 추후 확장 placeholder).
 *
 *  - 현재 운영 환경 정보 표시 (Supabase 프로젝트, 모델·API 키 보유 여부 등)
 *  - 비밀번호 변경·세션 정보 등
 *  - 추후 시스템 설정 (이메일 알림, 요금정책 등) 자리 확보
 */
import Link from "next/link";
import {
  Settings,
  Database,
  Brain,
  Key,
  Mail,
  Server,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profile = user
    ? await supabase
        .from("profiles")
        .select("role, full_name, email, created_at")
        .eq("id", user.id)
        .single()
        .then((r) => r.data)
    : null;

  // 환경 변수 보유 여부 (실제 값은 노출 X)
  const env = {
    SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    SERVICE_ROLE: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    ANTHROPIC: !!process.env.ANTHROPIC_API_KEY,
    MOLIT: !!process.env.MOLIT_RTMS_API_KEY,
    CLOVA_OCR: !!process.env.CLOVA_OCR_URL && !!process.env.CLOVA_OCR_SECRET,
  };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const projectRef =
    supabaseUrl.match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1] ?? "(미설정)";

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6" />
          환경설정
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          시스템 환경 정보 · API 키 보유 여부 · 계정 정보
        </p>
      </div>

      {/* 계정 정보 */}
      <Section title="내 계정" icon={<Key className="h-4 w-4 text-blue-900" />}>
        <Row k="이름" v={profile?.full_name ?? "(미설정)"} />
        <Row k="이메일" v={profile?.email ?? user?.email ?? "—"} />
        <Row
          k="역할"
          v={
            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 text-xs font-medium">
              {profile?.role ?? "—"}
            </span>
          }
        />
        <Row
          k="가입일"
          v={
            profile?.created_at
              ? new Date(profile.created_at).toLocaleString("ko-KR")
              : "—"
          }
        />
      </Section>

      {/* 시스템 환경 */}
      <Section
        title="시스템 환경"
        icon={<Server className="h-4 w-4 text-blue-900" />}
      >
        <Row k="Supabase 프로젝트" v={<code className="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">{projectRef}</code>} />
        <Row
          k="Supabase URL"
          v={
            <code className="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded truncate inline-block max-w-md">
              {supabaseUrl}
            </code>
          }
        />
        <Row
          k="대시보드"
          v={
            <a
              href={`https://supabase.com/dashboard/project/${projectRef}`}
              target="_blank"
              rel="noreferrer"
              className="text-blue-700 hover:underline text-sm inline-flex items-center gap-1"
            >
              Supabase Studio 열기
              <ExternalLink className="h-3 w-3" />
            </a>
          }
        />
      </Section>

      {/* API 키 보유 */}
      <Section
        title="외부 API 연동"
        icon={<Brain className="h-4 w-4 text-blue-900" />}
      >
        <ApiStatus name="Supabase URL" ok={env.SUPABASE_URL} />
        <ApiStatus
          name="Supabase Service Role Key"
          ok={env.SERVICE_ROLE}
          critical
        />
        <ApiStatus
          name="Anthropic (Claude API)"
          ok={env.ANTHROPIC}
          desc="공부 PDF 분석·전문가 의견 생성"
        />
        <ApiStatus
          name="국토교통부 RTMS API"
          ok={env.MOLIT}
          desc="실거래가 9개 endpoint"
        />
        <ApiStatus
          name="Clova OCR"
          ok={env.CLOVA_OCR}
          desc="(선택) 한글 OCR 보강 — 미설정 시 Claude PDF 직접 추출만 사용"
        />
      </Section>

      {/* DB 마이그레이션 현황 */}
      <Section
        title="데이터베이스"
        icon={<Database className="h-4 w-4 text-blue-900" />}
      >
        <ul className="text-sm space-y-1.5">
          {[
            "0001_initial_schema.sql — 9개 기본 테이블",
            "0002_rls_policies.sql — Row Level Security",
            "0003_storage_buckets.sql — gongbu / property-images / reports",
            "0004_seed_admin.sql — 관리자 초기 시드",
            "0005_external_evaluations.sql — 외부 평가값 JSONB",
            "0006_inquiries.sql — 의뢰 테이블",
            "0007_inquiries_buy.sql — 매수 의뢰 컬럼 확장",
          ].map((m, i) => (
            <li key={i} className="flex items-start gap-2 text-neutral-700">
              <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <code className="text-xs font-mono">{m}</code>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-neutral-500">
          ※ 마이그레이션은 Supabase Studio SQL Editor에서 직접 실행하며,
          실행 이력은 위 일람이 아닌 실제 schema 상태로 관리됩니다.
        </p>
      </Section>

      {/* 추후 확장 안내 */}
      <Section
        title="추후 추가 예정"
        icon={<Mail className="h-4 w-4 text-neutral-400" />}
        muted
      >
        <ul className="text-sm space-y-1.5 text-neutral-500">
          <li>• 의뢰 자동 알림 이메일 (Resend/SendGrid 연동)</li>
          <li>• 매물 분석 자동 트리거 (스케줄러)</li>
          <li>• 외부 평가값 출처별 가중치 조정</li>
          <li>• 사용자 권한 세분화 (member → premium / corp)</li>
          <li>• 비밀번호 변경 / 2FA</li>
        </ul>
      </Section>

      <div className="text-xs text-neutral-400 pt-4 border-t">
        <Link
          href="https://github.com/coo-jslee/a1smart_v2"
          target="_blank"
          rel="noreferrer"
          className="hover:text-blue-700 inline-flex items-center gap-1"
        >
          GitHub coo-jslee/a1smart_v2
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

function Section({
  title,
  icon,
  muted,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  muted?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={
        "border rounded-lg " + (muted ? "bg-neutral-50/50" : "bg-white")
      }
    >
      <div className="px-5 py-3 border-b bg-neutral-50/50">
        <h2 className="font-bold text-sm flex items-center gap-2 text-neutral-800">
          {icon}
          {title}
        </h2>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-start py-2 text-sm border-b last:border-b-0">
      <dt className="w-40 text-neutral-500 flex-shrink-0">{k}</dt>
      <dd className="flex-1 text-neutral-800 break-all">{v}</dd>
    </div>
  );
}

function ApiStatus({
  name,
  ok,
  desc,
  critical,
}: {
  name: string;
  ok: boolean;
  desc?: string;
  critical?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 py-2 text-sm border-b last:border-b-0">
      {ok ? (
        <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
      ) : (
        <AlertCircle
          className={
            "h-5 w-5 flex-shrink-0 mt-0.5 " +
            (critical ? "text-red-600" : "text-amber-500")
          }
        />
      )}
      <div className="flex-1">
        <div className="font-medium text-neutral-900">{name}</div>
        {desc && <div className="text-xs text-neutral-500 mt-0.5">{desc}</div>}
        {!ok && (
          <div className="text-xs text-amber-700 mt-0.5">
            {critical
              ? "❗ 필수 키 누락 — .env 확인 필요"
              : "(미설정 — 해당 기능 비활성)"}
          </div>
        )}
      </div>
    </div>
  );
}

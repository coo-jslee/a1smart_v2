/**
 * 매물 외부 평가값 (external_evaluations) 추가/삭제 API.
 *
 * GET    /api/properties/:asr/external-evals       목록 조회
 * POST   /api/properties/:asr/external-evals       추가 (body: source, value, weight, is_appraisal, notes)
 * DELETE /api/properties/:asr/external-evals?id=…  삭제 (id 매칭)
 */
import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "crypto";
import {
  createSupabaseServerClient,
  createSupabaseServiceRoleClient,
} from "@/lib/supabase/server";

export const runtime = "nodejs";

export type ExternalEvaluation = {
  id: string;
  source: string;
  value: number;
  weight: number;
  is_appraisal: boolean;
  notes: string | null;
  created_at: string;
  created_by: string | null;
};

const VALID_SOURCES = new Set([
  "감정평가서",
  "집품 AI",
  "KB시세",
  "디스코",
  "직접견적",
  "기타",
]);

async function authedAdmin() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user, supabase };
}

async function readEvals(asr: string): Promise<ExternalEvaluation[]> {
  const svc = createSupabaseServiceRoleClient();
  const { data } = await svc
    .from("properties")
    .select("external_evaluations")
    .eq("asr_code", asr)
    .single();
  return (data?.external_evaluations as ExternalEvaluation[] | null) ?? [];
}

async function writeEvals(asr: string, evals: ExternalEvaluation[]) {
  const svc = createSupabaseServiceRoleClient();
  return svc
    .from("properties")
    .update({ external_evaluations: evals as never })
    .eq("asr_code", asr);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ asr: string }> },
) {
  const auth = await authedAdmin();
  if ("error" in auth) return auth.error;
  const { asr } = await params;
  const evals = await readEvals(asr);
  return NextResponse.json({ evals });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ asr: string }> },
) {
  const auth = await authedAdmin();
  if ("error" in auth) return auth.error;
  const { asr } = await params;

  const body = await req.json().catch(() => ({}));
  const source = String(body.source ?? "").trim();
  const value = Number(body.value);
  const weight = Number(body.weight ?? 0.5);
  const isAppraisal = Boolean(body.is_appraisal);
  const notes = body.notes ? String(body.notes).trim() : null;

  if (!VALID_SOURCES.has(source)) {
    return NextResponse.json(
      { error: `source 는 ${[...VALID_SOURCES].join("/")} 중 하나여야 합니다.` },
      { status: 400 },
    );
  }
  if (!Number.isFinite(value) || value <= 0) {
    return NextResponse.json({ error: "value 는 양의 숫자여야 합니다." }, { status: 400 });
  }
  if (!Number.isFinite(weight) || weight < 0.1 || weight > 1.0) {
    return NextResponse.json(
      { error: "weight 는 0.1 ~ 1.0 사이여야 합니다." },
      { status: 400 },
    );
  }

  const newEval: ExternalEvaluation = {
    id: randomUUID(),
    source,
    value: Math.round(value),
    weight,
    is_appraisal: isAppraisal,
    notes,
    created_at: new Date().toISOString(),
    created_by: auth.user.id,
  };

  const existing = await readEvals(asr);
  const updated = [...existing, newEval];
  const { error } = await writeEvals(asr, updated);
  if (error) {
    return NextResponse.json(
      { error: "DB UPDATE 실패: " + error.message },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true, evaluation: newEval, evals: updated });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ asr: string }> },
) {
  const auth = await authedAdmin();
  if ("error" in auth) return auth.error;
  const { asr } = await params;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id 파라미터 필요" }, { status: 400 });
  }

  const existing = await readEvals(asr);
  const updated = existing.filter((e) => e.id !== id);
  if (existing.length === updated.length) {
    return NextResponse.json({ error: "해당 id 없음" }, { status: 404 });
  }

  const { error } = await writeEvals(asr, updated);
  if (error) {
    return NextResponse.json(
      { error: "DB UPDATE 실패: " + error.message },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true, evals: updated });
}

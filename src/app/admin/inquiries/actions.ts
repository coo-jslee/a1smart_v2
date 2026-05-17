"use server";

/**
 * /admin/inquiries 페이지 전용 Server Actions.
 *
 *  - updateInquiry: status 변경 + reply_note(담당자 내부 메모) 저장 + agent_id 매핑
 *  - 호출 권한: admin only (createSupabaseServerClient 의 세션으로 확인)
 *  - revalidatePath('/admin/inquiries') 로 일람 즉시 갱신
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createSupabaseServerClient,
  createSupabaseServiceRoleClient,
} from "@/lib/supabase/server";
import type { TablesUpdate } from "@/lib/supabase/types";

const UpdateSchema = z.object({
  id: z.coerce.number().int().positive(),
  status: z.enum(["new", "reviewing", "replied", "closed"]).optional(),
  reply_note: z.string().trim().max(2000).optional().nullable(),
});

export type UpdateResult =
  | { ok: true; id: number; status: string | null }
  | { ok: false; error: string };

export async function updateInquiry(
  formData: FormData,
): Promise<UpdateResult> {
  const raw = {
    id: formData.get("id"),
    status: formData.get("status") ?? undefined,
    reply_note: formData.get("reply_note") ?? undefined,
  };
  const parsed = UpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "잘못된 입력",
    };
  }
  const { id, status, reply_note } = parsed.data;

  // admin 인증
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return { ok: false, error: "Forbidden" };
  }

  const svc = createSupabaseServiceRoleClient();

  // 빌더: 빈 필드는 변경하지 않음
  const patch: TablesUpdate<"inquiries"> = {};
  if (status !== undefined) {
    patch.status = status;
    // 처음 손대는 admin 을 agent 로 매핑 (이미 다른 agent 면 덮어쓰지 않음 — 아래 logic)
    patch.agent_id = user.id;
  }
  if (reply_note !== undefined) {
    patch.reply_note = reply_note?.trim() || null;
  }
  if (Object.keys(patch).length === 0) {
    return { ok: false, error: "변경 사항 없음" };
  }

  const { data: updated, error } = await svc
    .from("inquiries")
    .update(patch)
    .eq("id", id)
    .select("id, status")
    .single();

  if (error || !updated) {
    return { ok: false, error: "업데이트 실패: " + (error?.message ?? "Unknown") };
  }

  revalidatePath("/admin/inquiries");
  return { ok: true, id: updated.id, status: updated.status };
}

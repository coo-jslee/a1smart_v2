"use server";

/**
 * 공개 문의 폼 Server Actions — `/contact`, `/intake` 공유.
 *
 *  - anon 도 INSERT 가능 (0006_inquiries.sql RLS 정책)
 *  - inquiry_type 별로 필드 다름:
 *      'contact' : name, message, (phone | email)
 *      'sell'    : name, phone OR email, property_type, region, message
 *  - 로그인 회원이면 user_id 자동 매핑
 *  - 봇 방지: 단순 honeypot (필드 'website' 가 비어있어야 함)
 */
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { headers } from "next/headers";

const ContactSchema = z.object({
  inquiry_type: z.enum(["contact", "sell", "property"]).default("contact"),
  name: z.string().trim().min(1, "이름을 입력해 주세요.").max(60),
  phone: z.string().trim().max(40).optional().nullable(),
  email: z
    .string()
    .trim()
    .email("올바른 이메일을 입력해 주세요.")
    .max(120)
    .optional()
    .nullable(),
  subject: z.string().trim().max(120).optional().nullable(),
  message: z
    .string()
    .trim()
    .min(5, "문의 내용을 5자 이상 입력해 주세요.")
    .max(2000),
  property_type: z.string().trim().max(40).optional().nullable(),
  region: z.string().trim().max(120).optional().nullable(),
  expected_price: z
    .union([z.string(), z.number(), z.null()])
    .optional()
    .transform((v) => {
      if (v == null || v === "") return null;
      const n = typeof v === "string" ? Number(v.replace(/[^\d]/g, "")) : v;
      return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
    }),
  area_m2: z
    .union([z.string(), z.number(), z.null()])
    .optional()
    .transform((v) => {
      if (v == null || v === "") return null;
      const n = typeof v === "string" ? Number(v) : v;
      return Number.isFinite(n) && n > 0 ? n : null;
    }),
  asr_code: z.string().trim().max(40).optional().nullable(),
  consent_privacy: z
    .union([z.boolean(), z.string()])
    .transform((v) => v === true || v === "on" || v === "true"),
  consent_marketing: z
    .union([z.boolean(), z.string(), z.undefined()])
    .transform((v) => v === true || v === "on" || v === "true"),
  // honeypot — 사용자가 채우면 봇
  website: z.string().max(0).optional().nullable(),
});

export type InquiryResult =
  | { ok: true; id: number }
  | { ok: false; error: string };

export async function submitInquiry(
  formData: FormData,
): Promise<InquiryResult> {
  // 1) FormData → object
  const raw = Object.fromEntries(formData);

  // 2) zod 검증
  const parsed = ContactSchema.safeParse(raw);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return { ok: false, error: firstIssue?.message ?? "입력값을 확인해 주세요." };
  }
  const data = parsed.data;

  // 3) honeypot 통과 검증
  if (data.website && data.website.length > 0) {
    return { ok: false, error: "검증 실패 (자동화 의심)" };
  }

  // 4) 동의 사항 필수
  if (!data.consent_privacy) {
    return { ok: false, error: "개인정보 처리 방침에 동의해 주세요." };
  }

  // 5) 연락처 둘 중 하나
  if (!data.phone && !data.email) {
    return { ok: false, error: "전화번호 또는 이메일 중 하나는 입력해 주세요." };
  }

  // 6) 매도 의뢰면 property_type·region 필수
  if (data.inquiry_type === "sell") {
    if (!data.property_type || !data.region) {
      return {
        ok: false,
        error: "매물 종류와 소재지(시군구·동)를 입력해 주세요.",
      };
    }
  }

  // 7) Supabase INSERT (anon OK, RLS 정책 일치)
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // user-agent header (메타용)
  const hdrs = await headers();
  const userAgent = hdrs.get("user-agent")?.slice(0, 500) ?? null;

  const { data: inserted, error } = await supabase
    .from("inquiries")
    .insert({
      inquiry_type: data.inquiry_type,
      name: data.name,
      phone: data.phone ?? null,
      email: data.email ?? null,
      subject: data.subject ?? null,
      message: data.message,
      property_type: data.property_type ?? null,
      region: data.region ?? null,
      expected_price: data.expected_price,
      area_m2: data.area_m2,
      asr_code: data.asr_code ?? null,
      consent_privacy: data.consent_privacy,
      consent_marketing: data.consent_marketing ?? false,
      user_id: user?.id ?? null,
      user_agent: userAgent,
      status: "new",
    })
    .select("id")
    .single();

  if (error || !inserted) {
    // 테이블이 아직 적용되지 않은 경우 친절한 메시지
    const msg = error?.message ?? "Unknown";
    if (msg.includes('relation "public.inquiries"') || msg.includes("inquiries")) {
      return {
        ok: false,
        error:
          "문의 저장 테이블이 아직 준비되지 않았습니다. 관리자에게 알려주세요. (DB: " +
          msg.slice(0, 100) +
          ")",
      };
    }
    return { ok: false, error: "문의 접수 실패: " + msg };
  }

  return { ok: true, id: inserted.id };
}

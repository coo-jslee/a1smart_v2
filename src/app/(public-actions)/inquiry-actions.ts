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
import {
  createSupabaseServerClient,
  createSupabaseServiceRoleClient,
} from "@/lib/supabase/server";
import { headers } from "next/headers";

// 원 단위 정수 파서 — "1,000,000원" / "100000" / 100000 모두 허용
const moneyParser = z
  .union([z.string(), z.number(), z.null()])
  .optional()
  .transform((v) => {
    if (v == null || v === "") return null;
    const n = typeof v === "string" ? Number(v.replace(/[^\d]/g, "")) : v;
    return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
  });

const ContactSchema = z.object({
  inquiry_type: z
    .enum(["contact", "sell", "property", "buy"])
    .default("contact"),
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
  expected_price: moneyParser,
  budget_min: moneyParser,
  monthly_rent_max: moneyParser,
  transaction_type: z
    .enum(["매매", "전세", "월세"])
    .optional()
    .nullable(),
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

  // 6-b) 매수 의뢰면 transaction_type, property_type, region 필수
  if (data.inquiry_type === "buy") {
    if (!data.transaction_type) {
      return {
        ok: false,
        error: "거래 형태(매매/전세/월세)를 선택해 주세요.",
      };
    }
    if (!data.property_type || !data.region) {
      return {
        ok: false,
        error: "매물 종류와 희망 지역을 입력해 주세요.",
      };
    }
    // 월세 의뢰면 monthly_rent_max 권장 (필수까지는 X — 협의 가능)
    // 예산 (expected_price 상한) 도 권장
  }

  // 7) Supabase INSERT
  //   - 인증 확인: cookie SSR 클라이언트 (로그인 사용자 user_id 매핑용)
  //   - INSERT 실행: service_role 클라이언트
  //
  //   왜 service_role 인가:
  //     anon 키로 INSERT … RETURNING 하면 PostgreSQL이 RETURNING 절에 SELECT 권한을
  //     요구해서 RLS SELECT 정책이 없는 anon 사용자는 행 보안 위반 오류가 발생한다.
  //     Server Action 안에서만 service_role 을 사용하고, 입력 데이터는 위쪽 zod 로
  //     이미 엄격히 검증했으므로 RLS WITH CHECK 와 동등한 보호 수준이다.
  const cookieClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await cookieClient.auth.getUser();

  const svc = createSupabaseServiceRoleClient();

  // user-agent header (메타용)
  const hdrs = await headers();
  const userAgent = hdrs.get("user-agent")?.slice(0, 500) ?? null;

  const { data: inserted, error } = await svc
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
      transaction_type: data.transaction_type ?? null,
      expected_price: data.expected_price,
      budget_min: data.budget_min,
      monthly_rent_max: data.monthly_rent_max,
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

-- ============================================================================
-- A1-SMART v2.0 - Inquiries 테이블 (M7 후속)
-- 작성일: 2026-05-17
-- 의존성: 0001_initial_schema.sql, 0002_rls_policies.sql
-- ============================================================================
-- 공개 페이지(/contact, /intake)에서 받은 문의 데이터 저장.
-- - inquiry_type = 'contact'  : 일반 문의 (/contact 폼)
-- - inquiry_type = 'sell'     : 매도 의뢰 (/intake 폼)
-- - inquiry_type = 'property' : 특정 매물 문의 (asr_code 연결)
--
-- 접근 정책:
--   - 누구나 INSERT (비로그인·anon 포함) — 공개 문의 폼 수신
--   - admin SELECT/UPDATE/DELETE (담당자 처리)
--   - member 는 본인이 작성한 문의 SELECT (이메일·로그인 사용자 id 매칭)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.inquiries (
  id              BIGSERIAL PRIMARY KEY,
  inquiry_type    TEXT NOT NULL
                    CHECK (inquiry_type IN ('contact', 'sell', 'property')),

  -- 의뢰인 정보
  name            TEXT NOT NULL,
  phone           TEXT,
  email           TEXT,

  -- 문의 본문
  subject         TEXT,
  message         TEXT NOT NULL,

  -- 매도 의뢰용 (sell)
  property_type   TEXT,                 -- 아파트/빌라/오피스텔/상가/단독상가
  region          TEXT,                 -- 시군구·동 자유 입력
  expected_price  BIGINT,               -- 희망 매매가 (원)
  area_m2         NUMERIC(10,4),        -- 매물 면적

  -- 특정 매물 문의용 (property)
  asr_code        TEXT REFERENCES public.properties(asr_code) ON DELETE SET NULL,

  -- 처리 상태
  status          TEXT NOT NULL DEFAULT 'new'
                    CHECK (status IN ('new', 'reviewing', 'replied', 'closed')),
  agent_id        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reply_note      TEXT,                 -- 담당자 내부 메모

  -- 동의 사항
  consent_privacy BOOLEAN NOT NULL DEFAULT false,
  consent_marketing BOOLEAN NOT NULL DEFAULT false,

  -- 메타
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- 로그인 사용자 추적
  user_agent      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  replied_at      TIMESTAMPTZ
);

COMMENT ON TABLE public.inquiries IS
  '공개 페이지(/contact, /intake)에서 받은 문의 데이터';

CREATE INDEX IF NOT EXISTS idx_inquiries_type    ON public.inquiries(inquiry_type);
CREATE INDEX IF NOT EXISTS idx_inquiries_status  ON public.inquiries(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inquiries_asr     ON public.inquiries(asr_code);
CREATE INDEX IF NOT EXISTS idx_inquiries_user    ON public.inquiries(user_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_recent  ON public.inquiries(created_at DESC);


-- ─── RLS 활성화 ────────────────────────────────────────────────────────
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

-- (1) anon + authenticated 모두 INSERT 가능 (공개 문의 폼)
DROP POLICY IF EXISTS "inquiries_public_insert" ON public.inquiries;
CREATE POLICY "inquiries_public_insert" ON public.inquiries
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    -- 기본 검증: 비어있지 않은 이름·메시지·연락처 중 하나
    length(coalesce(name, '')) > 0
    AND length(coalesce(message, '')) > 0
    AND (length(coalesce(phone, '')) > 0 OR length(coalesce(email, '')) > 0)
    -- 상태는 항상 'new' 로만 INSERT 허용 (악성 사용자가 다른 상태로 못 넣게)
    AND status = 'new'
  );

-- (2) admin 은 모든 행 SELECT/UPDATE/DELETE
DROP POLICY IF EXISTS "inquiries_admin_all" ON public.inquiries;
CREATE POLICY "inquiries_admin_all" ON public.inquiries
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- (3) 회원은 본인이 작성한 문의 (user_id 매칭) 만 SELECT
DROP POLICY IF EXISTS "inquiries_owner_read" ON public.inquiries;
CREATE POLICY "inquiries_owner_read" ON public.inquiries
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());


-- ─── replied_at 자동 갱신 트리거 ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_inquiry_replied_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'replied' AND OLD.status <> 'replied' THEN
    NEW.replied_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_inquiries_replied_at ON public.inquiries;
CREATE TRIGGER trg_inquiries_replied_at
  BEFORE UPDATE ON public.inquiries
  FOR EACH ROW EXECUTE FUNCTION public.set_inquiry_replied_at();


-- ─── 검증 쿼리 (선택) ─────────────────────────────────────────────────
-- SELECT * FROM information_schema.tables WHERE table_name = 'inquiries';
-- SELECT * FROM pg_policies WHERE tablename = 'inquiries';

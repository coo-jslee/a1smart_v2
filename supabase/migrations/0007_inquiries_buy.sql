-- ============================================================================
-- A1-SMART v2.0 - Inquiries 매수 의뢰 확장 (M7 후속2)
-- 작성일: 2026-05-17
-- 의존성: 0006_inquiries.sql
-- ============================================================================
-- 매수 의뢰(`/buy-request`) 폼 지원을 위한 inquiries 테이블 확장:
--   1) inquiry_type CHECK 제약에 'buy' 추가
--   2) transaction_type   : 매매 / 전세 / 월세
--   3) budget_min         : 예산 하한 (원)  (기존 expected_price 는 상한으로 사용)
--   4) monthly_rent_max   : 월세 한도 (원/월) — 월세 의뢰에만 사용
--
-- 안전: ALTER TABLE … IF NOT EXISTS … ADD COLUMN — 이미 컬럼 있어도 에러 없음
-- ============================================================================

-- 1) inquiry_type CHECK 제약 갱신 (drop → recreate)
ALTER TABLE public.inquiries
  DROP CONSTRAINT IF EXISTS inquiries_inquiry_type_check;

ALTER TABLE public.inquiries
  ADD CONSTRAINT inquiries_inquiry_type_check
  CHECK (inquiry_type IN ('contact', 'sell', 'property', 'buy'));

-- 2) 거래 형태 (매매/전세/월세) — 매수 의뢰 분기 핵심
ALTER TABLE public.inquiries
  ADD COLUMN IF NOT EXISTS transaction_type TEXT
    CHECK (transaction_type IS NULL OR transaction_type IN ('매매', '전세', '월세'));

-- 3) 예산 하한 (상한은 기존 expected_price 재사용)
ALTER TABLE public.inquiries
  ADD COLUMN IF NOT EXISTS budget_min BIGINT;

-- 4) 월세 한도 — 월세 의뢰에만 사용
ALTER TABLE public.inquiries
  ADD COLUMN IF NOT EXISTS monthly_rent_max BIGINT;


COMMENT ON COLUMN public.inquiries.transaction_type IS
  '매수 의뢰의 거래 형태 (매매/전세/월세). NULL 허용 (매도·일반 문의에서는 미사용).';
COMMENT ON COLUMN public.inquiries.budget_min IS
  '매수 예산 하한 (원). expected_price 는 상한으로 사용.';
COMMENT ON COLUMN public.inquiries.monthly_rent_max IS
  '월세 의뢰의 월세 한도 (원/월).';


-- 검색 인덱스 (매수 의뢰 필터링 자주 발생 가정)
CREATE INDEX IF NOT EXISTS idx_inquiries_transaction_type
  ON public.inquiries(transaction_type)
  WHERE transaction_type IS NOT NULL;


-- ─── 검증 쿼리 (선택) ─────────────────────────────────────────────────
-- SELECT column_name, data_type, is_nullable
--   FROM information_schema.columns
--  WHERE table_schema='public' AND table_name='inquiries'
--  ORDER BY ordinal_position;
--
-- SELECT pg_get_constraintdef(oid) FROM pg_constraint
--  WHERE conrelid = 'public.inquiries'::regclass AND contype = 'c';

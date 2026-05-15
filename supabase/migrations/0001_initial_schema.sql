-- ============================================================================
-- A1-SMART v2.0 - Initial Schema (M1)
-- 작성일: 2026-05-16
-- 참고: PRD_v2.md §4.2, CLAUDE.md v1.7 6개 노션 DB 매핑
-- ============================================================================
-- 적용 순서:
--   1) 이 파일 (0001_initial_schema.sql)
--   2) 0002_rls_policies.sql
--   3) 0003_storage_buckets.sql
--   4) 0004_seed_admin.sql
-- ============================================================================

-- ─── 확장 ────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";          -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── 1) profiles ── auth.users 1:1 확장 (role 보유) ──────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email        TEXT,
  full_name    TEXT,
  role         TEXT NOT NULL DEFAULT 'member'
                 CHECK (role IN ('admin', 'member')),
  phone        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE  public.profiles IS 'auth.users 와 1:1 매핑, 역할/메타데이터';
COMMENT ON COLUMN public.profiles.role IS 'admin = 중개사/대표, member = 일반 회원';

-- auth.users 새 행 생성 시 profiles 자동 생성
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NULL)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 역할 헬퍼 (RLS 정책에서 반복 사용)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;


-- ─── 2) customers ── 매수/매도/임차/임대 통합 고객 DB ────────────────────
CREATE TABLE IF NOT EXISTS public.customers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_no     TEXT UNIQUE,                        -- CUS-N
  name            TEXT NOT NULL,
  is_corp         BOOLEAN NOT NULL DEFAULT false,
  biz_number      TEXT,                               -- 사업자번호
  customer_type   TEXT[] NOT NULL DEFAULT '{}',       -- 매수/매도/임차/임대 다중
  classification  TEXT,                               -- 매수희망/소유주/...
  grade           TEXT CHECK (grade IN ('A','B','C', NULL)),
  phone           TEXT,                               -- 향후 pgcrypto 암호화 검토
  email           TEXT,
  budget_min      BIGINT,
  budget_max      BIGINT,
  preferred_area  TEXT,
  status          TEXT NOT NULL DEFAULT '신규',
  last_contact_at TIMESTAMPTZ,
  is_multi_owner  BOOLEAN,
  memo            TEXT,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_classification ON public.customers(classification);


-- ─── 3) properties ── 매물 마스터 (54속성 → Postgres 컬럼) ──────────────
CREATE TABLE IF NOT EXISTS public.properties (
  asr_code         TEXT PRIMARY KEY,                  -- ASR-{시군구5}-{시퀀스6}
  pnu              CHAR(19) NOT NULL UNIQUE,
  property_type    TEXT,                              -- 아파트/빌라/오피스텔/상가
  transaction_type TEXT,                              -- 매매/전세/월세
  status           TEXT NOT NULL DEFAULT '신규',
  workflow_stage   TEXT NOT NULL DEFAULT '01_입수'
    CHECK (workflow_stage IN (
      '01_입수','02_발급','03_저장','04_발췌','05_입력',
      '06_시세조사','07_분석보고서','완료','99_오류'
    )),

  -- 위치
  address_road     TEXT,                              -- 도로명
  address_jibun    TEXT,                              -- 지번
  lawd_cd          CHAR(5) GENERATED ALWAYS AS (substring(pnu, 1, 5)) STORED,

  -- 건물
  building_name    TEXT,                              -- 단지/건물명
  exclusive_m2     NUMERIC(10,4),
  supply_m2        NUMERIC(10,4),
  floor_no         INT,
  total_floors     INT,
  built_year       INT,
  structure        TEXT,
  violation        BOOLEAN NOT NULL DEFAULT false,

  -- 가격 (원 단위)
  sale_price       BIGINT,
  jeonse_deposit   BIGINT,
  monthly_deposit  BIGINT,
  monthly_rent     BIGINT,
  unit_price_m2    BIGINT GENERATED ALWAYS AS
    (CASE WHEN exclusive_m2 IS NOT NULL AND exclusive_m2 > 0
          THEN (sale_price / exclusive_m2)::BIGINT
          ELSE NULL END) STORED,

  -- 등기 권리
  mortgage_total   BIGINT,                            -- 근저당 합계
  senior_creditor  TEXT,                              -- 1순위 채권자 (외부 보고서에서 제거)
  is_distressed    BOOLEAN NOT NULL DEFAULT false,    -- 압류/경매 여부
  risk_grade       TEXT CHECK (risk_grade IN ('안전','주의','위험', NULL)),
  risk_summary     TEXT,

  -- 토지
  land_use_zone    TEXT,
  land_m2          NUMERIC(10,4),
  gongsi_jiga      BIGINT,                            -- 공시지가 (원/㎡)

  -- CRM
  owner_id         UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  internal_note    TEXT,                              -- append-only 정책 적용
  source           TEXT,                              -- 매물 출처
  agent_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- 미디어 (Storage 경로 배열)
  image_paths      TEXT[] NOT NULL DEFAULT '{}',
  attachment_paths TEXT[] NOT NULL DEFAULT '{}',      -- DOCX/PDF 보고서

  -- 일정
  list_date        DATE,
  desired_close_by DATE,
  next_review_date DATE,

  -- 공개
  is_public        BOOLEAN NOT NULL DEFAULT false,

  -- 메타
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_properties_workflow   ON public.properties(workflow_stage);
CREATE INDEX IF NOT EXISTS idx_properties_lawd       ON public.properties(lawd_cd);
CREATE INDEX IF NOT EXISTS idx_properties_pnu        ON public.properties(pnu);
CREATE INDEX IF NOT EXISTS idx_properties_owner      ON public.properties(owner_id);
CREATE INDEX IF NOT EXISTS idx_properties_agent      ON public.properties(agent_id);
CREATE INDEX IF NOT EXISTS idx_properties_public     ON public.properties(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_properties_distressed ON public.properties(is_distressed) WHERE is_distressed = true;


-- ─── 4) gongbu_documents ── 공부 PDF + 메타 ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.gongbu_documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asr_code        TEXT NOT NULL REFERENCES public.properties(asr_code) ON DELETE CASCADE,
  doc_type        TEXT NOT NULL CHECK (doc_type IN (
                    'deungki', 'toji', 'geonchuk', 'toji_iyong', 'gamjeong'
                  )),
  storage_path    TEXT NOT NULL,                      -- gongbu 버킷 경로
  issued_date     DATE,
  issue_number    TEXT,
  cost            INT,                                -- 700원 등
  attempts        INT NOT NULL DEFAULT 1,
  success         BOOLEAN NOT NULL DEFAULT true,
  uploaded_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gongbu_asr ON public.gongbu_documents(asr_code);
CREATE INDEX IF NOT EXISTS idx_gongbu_type ON public.gongbu_documents(doc_type);


-- ─── 5) extractions ── OCR Raw + JSON 발췌 ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.extractions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gongbu_id         UUID NOT NULL REFERENCES public.gongbu_documents(id) ON DELETE CASCADE,
  asr_code          TEXT NOT NULL REFERENCES public.properties(asr_code) ON DELETE CASCADE,
  doc_type          TEXT NOT NULL,                    -- gongbu_documents.doc_type 사본
  ocr_text          TEXT,                             -- 마스킹 완료된 텍스트
  extracted_json    JSONB NOT NULL,                   -- Claude 추출 결과
  confidence        INT CHECK (confidence BETWEEN 0 AND 100),
  llm_model         TEXT DEFAULT 'claude-opus-4-7',
  prompt_version    TEXT,                             -- 프롬프트 버전 추적
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_extractions_asr ON public.extractions(asr_code);
CREATE INDEX IF NOT EXISTS idx_extractions_gongbu ON public.extractions(gongbu_id);
CREATE INDEX IF NOT EXISTS idx_extractions_json ON public.extractions USING GIN (extracted_json);


-- ─── 6) price_history ── 시세 이력 (append-only) ─────────────────────────
CREATE TABLE IF NOT EXISTS public.price_history (
  id              BIGSERIAL PRIMARY KEY,
  asr_code        TEXT NOT NULL REFERENCES public.properties(asr_code) ON DELETE CASCADE,
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  trade_type      TEXT NOT NULL,                      -- 매매/전세/월세/AI추정
  price           BIGINT,
  monthly_rent    BIGINT,
  area_m2         NUMERIC(10,4),
  floor_no        INT,
  contract_date   DATE,
  source          TEXT,                               -- 국토부실거래/경매/AI추정/...
  confidence      INT CHECK (confidence BETWEEN 0 AND 100),
  unit_price_m2   BIGINT,
  is_consensus    BOOLEAN NOT NULL DEFAULT false,     -- 합의시세 row 여부
  consensus_meta  JSONB,                              -- 환산 구성 등 추적 정보
  raw_payload     JSONB
);
CREATE INDEX IF NOT EXISTS idx_ph_asr_recorded ON public.price_history(asr_code, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_ph_consensus ON public.price_history(asr_code, is_consensus)
  WHERE is_consensus = true;
CREATE INDEX IF NOT EXISTS idx_ph_source ON public.price_history(source);


-- ─── 7) error_logs ── 자동화 실패 기록 ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.error_logs (
  id              BIGSERIAL PRIMARY KEY,
  asr_code        TEXT,                               -- nullable: ASR 부여 전 단계 오류
  stage           TEXT NOT NULL,                      -- 01_입수 ~ 99_오류
  severity        TEXT NOT NULL DEFAULT 'ERROR'
                    CHECK (severity IN ('INFO','WARN','ERROR','CRITICAL')),
  error_code      TEXT,
  message         TEXT NOT NULL,
  payload         JSONB,                              -- 입력 데이터 (PII 마스킹된)
  stack_trace     TEXT,
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_errors_asr ON public.error_logs(asr_code);
CREATE INDEX IF NOT EXISTS idx_errors_recent ON public.error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_errors_severity ON public.error_logs(severity);


-- ─── 8) uploads ── 단계 4 처리 전 임시 업로드 큐 ─────────────────────────
CREATE TABLE IF NOT EXISTS public.uploads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uploader_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asr_code        TEXT REFERENCES public.properties(asr_code) ON DELETE SET NULL,
  file_type       TEXT NOT NULL CHECK (file_type IN (
                    'deungki','toji','geonchuk','toji_iyong','gamjeong','image'
                  )),
  storage_path    TEXT NOT NULL,
  original_name   TEXT,
  size_bytes      INT,
  mime_type       TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','processing','done','error')),
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_uploads_uploader ON public.uploads(uploader_id, status);
CREATE INDEX IF NOT EXISTS idx_uploads_asr ON public.uploads(asr_code);


-- ─── 9) audit_logs ── 감사 추적 ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          BIGSERIAL PRIMARY KEY,
  actor_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,                          -- 'property.update', 'report.generate' 등
  target_type TEXT NOT NULL,
  target_id   TEXT NOT NULL,
  before      JSONB,
  after       JSONB,
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_target ON public.audit_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_recent ON public.audit_logs(created_at DESC);


-- ─── updated_at 자동 갱신 트리거 ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_properties_updated_at
  BEFORE UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ─── internal_note append-only 보호 함수 (v1.7 §7.1 정책) ───────────────
-- 사용 예: SELECT public.append_internal_note('ASR-11650-000001', '[06갱신|2026-05-16] 합의시세 3.06억');
CREATE OR REPLACE FUNCTION public.append_internal_note(
  p_asr_code TEXT,
  p_note     TEXT
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.properties
  SET internal_note = COALESCE(internal_note || E'\n', '') || p_note
  WHERE asr_code = p_asr_code;
END;
$$;

COMMENT ON FUNCTION public.append_internal_note IS
  '매물 internal_note에 한 줄 append. 기존 메모 보존 (v1.7 §7.1 정책).';


-- ─── 검증 쿼리 (선택 실행) ─────────────────────────────────────────────
-- SELECT table_name FROM information_schema.tables
--   WHERE table_schema = 'public' ORDER BY table_name;
-- 기대 결과: audit_logs, customers, error_logs, extractions, gongbu_documents,
--             price_history, profiles, properties, uploads

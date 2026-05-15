-- ============================================================================
-- A1-SMART v2.0 - RLS Policies (M1)
-- 의존성: 0001_initial_schema.sql 먼저 적용
-- ============================================================================
-- 역할:
--   admin    : 모든 테이블 전권 (matchcondition: public.is_admin())
--   member   : 자신의 프로필, 공개 매물(is_public=true) SELECT, 자신이 업로드한 uploads
--   guest    : 공개 매물 SELECT만 (anon 키로 접근)
-- ============================================================================

-- ─── 모든 테이블 RLS 활성화 ────────────────────────────────────────────
ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gongbu_documents  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extractions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_history     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_logs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uploads           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs        ENABLE ROW LEVEL SECURITY;


-- ────────────────────────────────────────────────────────────────────────
-- profiles
-- ────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "profiles_self_read"   ON public.profiles;
DROP POLICY IF EXISTS "profiles_self_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_all"   ON public.profiles;

CREATE POLICY "profiles_self_read" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_admin());

CREATE POLICY "profiles_self_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()));
  -- 본인 프로필 수정 가능하되 role 컬럼은 변경 못 함 (admin만 변경 가능)

CREATE POLICY "profiles_admin_all" ON public.profiles
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- ────────────────────────────────────────────────────────────────────────
-- customers (관리자 전용)
-- ────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "customers_admin_only" ON public.customers;

CREATE POLICY "customers_admin_only" ON public.customers
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- ────────────────────────────────────────────────────────────────────────
-- properties
-- ────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "properties_public_read"    ON public.properties;
DROP POLICY IF EXISTS "properties_admin_all"      ON public.properties;

-- 비로그인(anon) + 로그인 회원: 공개 매물만 SELECT
CREATE POLICY "properties_public_read" ON public.properties
  FOR SELECT TO anon, authenticated
  USING (is_public = true OR public.is_admin());

-- 관리자: 전권
CREATE POLICY "properties_admin_all" ON public.properties
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- ────────────────────────────────────────────────────────────────────────
-- gongbu_documents (관리자 전용 - PII 포함)
-- ────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "gongbu_admin_only" ON public.gongbu_documents;

CREATE POLICY "gongbu_admin_only" ON public.gongbu_documents
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- ────────────────────────────────────────────────────────────────────────
-- extractions (관리자 전용 - OCR 텍스트는 마스킹 후에도 권리정보 포함)
-- ────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "extractions_admin_only" ON public.extractions;

CREATE POLICY "extractions_admin_only" ON public.extractions
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- ────────────────────────────────────────────────────────────────────────
-- price_history
-- ────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "price_history_public_read" ON public.price_history;
DROP POLICY IF EXISTS "price_history_admin_all"   ON public.price_history;

-- 공개 매물의 합의시세 row만 일반 사용자가 조회 가능 (외부 보고서 노출용)
CREATE POLICY "price_history_public_read" ON public.price_history
  FOR SELECT TO anon, authenticated
  USING (
    is_consensus = true
    AND EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.asr_code = price_history.asr_code AND p.is_public = true
    )
    OR public.is_admin()
  );

CREATE POLICY "price_history_admin_all" ON public.price_history
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- ────────────────────────────────────────────────────────────────────────
-- error_logs (관리자 전용)
-- ────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "error_logs_admin_only" ON public.error_logs;

CREATE POLICY "error_logs_admin_only" ON public.error_logs
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- ────────────────────────────────────────────────────────────────────────
-- uploads (본인 업로드 + 관리자 전권)
-- ────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "uploads_self_read"   ON public.uploads;
DROP POLICY IF EXISTS "uploads_self_insert" ON public.uploads;
DROP POLICY IF EXISTS "uploads_admin_all"   ON public.uploads;

CREATE POLICY "uploads_self_read" ON public.uploads
  FOR SELECT TO authenticated
  USING (uploader_id = auth.uid() OR public.is_admin());

CREATE POLICY "uploads_self_insert" ON public.uploads
  FOR INSERT TO authenticated
  WITH CHECK (uploader_id = auth.uid());

CREATE POLICY "uploads_admin_all" ON public.uploads
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- ────────────────────────────────────────────────────────────────────────
-- audit_logs (관리자 SELECT만 - INSERT는 SECURITY DEFINER 트리거)
-- ────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "audit_logs_admin_read" ON public.audit_logs;

CREATE POLICY "audit_logs_admin_read" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.is_admin());


-- ─── 검증 쿼리 (선택) ─────────────────────────────────────────────────
-- SELECT schemaname, tablename, rowsecurity
--   FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
-- 기대: 9개 테이블 모두 rowsecurity = t

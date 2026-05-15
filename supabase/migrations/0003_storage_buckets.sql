-- ============================================================================
-- A1-SMART v2.0 - Storage Buckets (M1)
-- 의존성: 0001_initial_schema.sql, 0002_rls_policies.sql
-- ============================================================================
-- 3개 버킷:
--   gongbu          : 등기·토지·건축 PDF (PII 포함) - 관리자만 signed URL
--   property-images : 매물 사진 - 공개 매물은 public URL
--   reports         : 분석보고서 DOCX/PDF - 관리자 + (외부용은 회원/게스트도)
-- ============================================================================

-- ─── 버킷 생성 ─────────────────────────────────────────────────────────
-- public 컬럼 = true이면 anon 키로 직접 URL 접근 가능 (단, 객체별 RLS 정책도 확인됨)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('gongbu', 'gongbu', false, 20971520,
    ARRAY['application/pdf']),                            -- 20 MB, PDF만
  ('property-images', 'property-images', true, 5242880,
    ARRAY['image/jpeg','image/png','image/webp']),        -- 5 MB, 일반 이미지
  ('reports', 'reports', false, 31457280,
    ARRAY['application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
                                                          -- 30 MB, DOCX/PDF
ON CONFLICT (id) DO UPDATE SET
  public              = EXCLUDED.public,
  file_size_limit     = EXCLUDED.file_size_limit,
  allowed_mime_types  = EXCLUDED.allowed_mime_types;


-- ─── 버킷별 객체 정책 ──────────────────────────────────────────────────

-- gongbu: 관리자만 (PII 포함이므로 비공개 + RLS 엄격)
DROP POLICY IF EXISTS "gongbu_admin_select" ON storage.objects;
DROP POLICY IF EXISTS "gongbu_admin_insert" ON storage.objects;
DROP POLICY IF EXISTS "gongbu_admin_update" ON storage.objects;
DROP POLICY IF EXISTS "gongbu_admin_delete" ON storage.objects;

CREATE POLICY "gongbu_admin_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'gongbu' AND public.is_admin());

CREATE POLICY "gongbu_admin_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'gongbu' AND public.is_admin());

CREATE POLICY "gongbu_admin_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'gongbu' AND public.is_admin())
  WITH CHECK (bucket_id = 'gongbu' AND public.is_admin());

CREATE POLICY "gongbu_admin_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'gongbu' AND public.is_admin());


-- property-images: 공개 읽기, 관리자만 쓰기/삭제
DROP POLICY IF EXISTS "property_images_public_read" ON storage.objects;
DROP POLICY IF EXISTS "property_images_admin_write" ON storage.objects;
DROP POLICY IF EXISTS "property_images_admin_update" ON storage.objects;
DROP POLICY IF EXISTS "property_images_admin_delete" ON storage.objects;

CREATE POLICY "property_images_public_read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'property-images');

CREATE POLICY "property_images_admin_write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'property-images' AND public.is_admin());

CREATE POLICY "property_images_admin_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'property-images' AND public.is_admin())
  WITH CHECK (bucket_id = 'property-images' AND public.is_admin());

CREATE POLICY "property_images_admin_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'property-images' AND public.is_admin());


-- reports: 비공개 버킷, 파일명에 'investor_' 포함 시 회원도 SELECT, 'internal_'은 관리자만
-- (storage_path 컨벤션: reports/{YYYY-MM}/{ASR}/{version}_{timestamp}.{docx|pdf})
DROP POLICY IF EXISTS "reports_investor_read"   ON storage.objects;
DROP POLICY IF EXISTS "reports_admin_internal"  ON storage.objects;
DROP POLICY IF EXISTS "reports_admin_write"     ON storage.objects;
DROP POLICY IF EXISTS "reports_admin_update"    ON storage.objects;
DROP POLICY IF EXISTS "reports_admin_delete"    ON storage.objects;

-- 외부용(investor) 보고서: 로그인한 회원도 SELECT 가능
CREATE POLICY "reports_investor_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'reports'
    AND (
      public.is_admin()
      OR position('/investor_' IN name) > 0
    )
  );

CREATE POLICY "reports_admin_write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'reports' AND public.is_admin());

CREATE POLICY "reports_admin_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'reports' AND public.is_admin())
  WITH CHECK (bucket_id = 'reports' AND public.is_admin());

CREATE POLICY "reports_admin_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'reports' AND public.is_admin());


-- ─── 검증 쿼리 (선택) ─────────────────────────────────────────────────
-- SELECT id, name, public, file_size_limit FROM storage.buckets ORDER BY name;
-- 기대: gongbu(private), property-images(public), reports(private)

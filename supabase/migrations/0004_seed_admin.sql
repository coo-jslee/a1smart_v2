-- ============================================================================
-- A1-SMART v2.0 - Seed: 첫 관리자 자동 부여 (M1)
-- 의존성: 0001, 0002, 0003 모두 적용 후
-- ============================================================================
-- 목적:
--   1) 환경변수 ADMIN_INITIAL_EMAIL 에 해당하는 사용자가 회원가입하면 자동 admin 승격
--   2) 기존에 이미 가입했다면 즉시 admin 으로 갱신
-- ============================================================================

-- ─── 함수: 회원가입 시 ADMIN_INITIAL_EMAIL 매칭하면 admin 부여 ─────────
CREATE OR REPLACE FUNCTION public.handle_admin_promotion()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_admin_email TEXT;
BEGIN
  -- Supabase는 GUC custom.* 변수로 환경변수를 노출하지 않으므로
  -- 하드코딩 또는 별도 settings 테이블 권장.
  -- 여기서는 직접 하드코딩 (변경 시 함수 재정의 필요):
  v_admin_email := 'sm@sunmyung.kr';

  IF NEW.email = v_admin_email THEN
    UPDATE public.profiles SET role = 'admin' WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

-- profiles INSERT 직후 트리거 (0001의 handle_new_user 이후 실행)
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_admin_promotion();


-- ─── 이미 가입한 사용자가 있으면 즉시 admin 승격 ──────────────────────
-- (이 마이그레이션 실행 시점에 sm@sunmyung.kr 가 이미 회원이라면)
UPDATE public.profiles
SET    role = 'admin'
WHERE  id IN (
  SELECT id FROM auth.users WHERE email = 'sm@sunmyung.kr'
);


-- ─── 시드 데이터: 자주 쓰는 시군구 코드 매핑 (참고용 view) ───────────
-- v1.7 CLAUDE.md §5 ASR 코드 매핑
CREATE OR REPLACE VIEW public.v_lawd_code_map AS
SELECT * FROM (VALUES
  ('11680', '서울특별시 강남구'),
  ('11650', '서울특별시 서초구'),
  ('11440', '서울특별시 마포구'),
  ('11710', '서울특별시 송파구'),
  ('41135', '경기도 성남시 분당구'),
  ('43114', '충청북도 청주시 흥덕구')
) AS t(lawd_cd, sigungu_name);

COMMENT ON VIEW public.v_lawd_code_map IS
  'LAWD_CD(시군구 5자리) → 명칭 매핑 참고용. 필요 시 확장.';


-- ─── 검증 쿼리 ────────────────────────────────────────────────────────
-- SELECT id, email, role FROM public.profiles WHERE role = 'admin';
-- 기대: sm@sunmyung.kr (이미 가입한 경우)

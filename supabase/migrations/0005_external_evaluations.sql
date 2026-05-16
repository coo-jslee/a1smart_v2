-- ============================================================================
-- M4.1: properties.external_evaluations JSONB[] 컬럼 추가
-- ============================================================================
-- 단독건물·특이매물처럼 일반 RTMS 거래로 시세 산출이 어려운 경우,
-- 관리자가 직접 외부 평가값(감정평가서·집품·KB·직접 견적 등)을 추가할 수 있게 한다.
--
-- 각 원소 형태:
--   {
--     "id": "uuid",
--     "source": "감정평가서 | 집품 AI | KB시세 | 직접견적 | ...",
--     "value": 5400000000,
--     "weight": 0.70,
--     "is_appraisal": true,        // true면 시세 환산 시 ×0.85 적용
--     "notes": "법원감정 2025-08 OO평가법인",
--     "created_at": "2026-05-16T13:45:00Z",
--     "created_by": "uuid-of-user"
--   }
-- ============================================================================

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS external_evaluations JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.properties.external_evaluations IS
  '외부 평가값 배열. 단독건물·특이매물 시세 산출 보강용. 감정평가서/집품/KB/직접 견적 등.';

-- GIN 인덱스 (검색용, 선택적)
CREATE INDEX IF NOT EXISTS idx_properties_external_evals
  ON public.properties USING GIN (external_evaluations);

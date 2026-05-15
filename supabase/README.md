# Supabase 마이그레이션 적용 가이드

A1-SMART v2.0의 데이터베이스 스키마는 `supabase/migrations/` 폴더의 SQL 파일들로 관리됩니다.

## 📑 파일 순서

| 순서 | 파일 | 내용 |
|---|---|---|
| 1 | `0001_initial_schema.sql` | 9개 테이블 + 트리거 + 함수 (profiles, customers, properties, gongbu_documents, extractions, price_history, error_logs, uploads, audit_logs) |
| 2 | `0002_rls_policies.sql` | 모든 테이블 RLS 활성화 + admin/member/guest 정책 |
| 3 | `0003_storage_buckets.sql` | 3개 버킷 (gongbu, property-images, reports) + 객체 정책 |
| 4 | `0004_seed_admin.sql` | sm@sunmyung.kr 자동 admin 승격 트리거 + 시군구 코드 view |

⚠️ **반드시 번호 순서대로 적용**하세요. 외래키 참조 때문에 순서가 어긋나면 실패합니다.

---

## 🚀 적용 방법 (두 가지 중 택 1)

### 방법 A — Supabase 대시보드 SQL Editor (간편, 권장)

가장 빠른 방법. CLI 설치 불필요.

1. <https://supabase.com/dashboard/project/xlewfccwzwjqxwhfoyoq> 접속
2. 왼쪽 사이드바 → **SQL Editor** 클릭
3. **New query** 클릭
4. `0001_initial_schema.sql` 파일 내용 전체 복사 → SQL Editor에 붙여넣기
5. **Run** 클릭 (또는 `Ctrl+Enter`)
6. 성공 메시지 확인 → 다음 파일로
7. `0002_rls_policies.sql` 반복
8. `0003_storage_buckets.sql` 반복
9. `0004_seed_admin.sql` 반복

각 파일 실행 후 하단 결과 패널에서 **에러 없음** 확인 필수.

### 방법 B — Supabase CLI (정석, 마이그레이션 추적용)

장기 운영에는 CLI 방식이 깔끔하지만 첫 셋업은 30분 정도 걸립니다.

```powershell
# 1. Supabase CLI 설치
scoop install supabase
# 또는
npm install -g supabase

# 2. 프로젝트 링크
cd C:\Users\juncp\00_claudecode\03_A1_Smart_v2
supabase login                                  # 브라우저 OAuth
supabase link --project-ref xlewfccwzwjqxwhfoyoq

# 3. 마이그레이션 적용
supabase db push
```

---

## ✅ 적용 후 검증

SQL Editor에서 다음 쿼리 실행:

```sql
-- 1) 테이블 9개 존재?
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' ORDER BY table_name;
-- 기대: audit_logs, customers, error_logs, extractions, gongbu_documents,
--       price_history, profiles, properties, uploads (+ v_lawd_code_map view)

-- 2) RLS 모두 활성화?
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public' ORDER BY tablename;
-- 기대: rowsecurity = t 모두

-- 3) Storage 버킷 3개?
SELECT id, name, public FROM storage.buckets ORDER BY name;
-- 기대: gongbu (private), property-images (public), reports (private)

-- 4) is_admin() 함수 작동?
SELECT public.is_admin();
-- 기대: 비로그인 상태에서 false (SQL Editor는 service_role로 동작하므로
--       이 함수 결과가 true일 수도 있음 — 실제 검증은 앱에서)
```

---

## 🔄 마이그레이션 수정 시 주의

- 한 번 적용한 마이그레이션 파일은 **수정 금지** (DB와 불일치 발생)
- 변경이 필요하면 **새 번호의 파일을 추가**: `0005_add_xxx_column.sql` 등
- 개발 초기 단계에서 전면 리셋이 필요하면: Supabase 대시보드 → Settings → **Reset database** (위험: 모든 데이터 삭제)

---

## 📌 시드 데이터 (관리자 초기 부여)

`0004_seed_admin.sql`은 `sm@sunmyung.kr` 이메일로 회원가입한 사용자를 자동으로 `admin` 으로 승격합니다.

회원가입 흐름:
1. 사용자가 앱에서 회원가입 (`POST /api/auth/signup` 또는 Supabase Auth UI)
2. `auth.users` INSERT → 트리거가 `public.profiles` 생성
3. 이메일이 `sm@sunmyung.kr` 이면 `role = 'admin'` 자동 부여
4. 로그인 후 `/admin/*` 페이지 접근 가능

⚠️ **다른 이메일로 admin을 추가하려면** SQL Editor에서 직접:
```sql
UPDATE public.profiles SET role = 'admin'
WHERE id = (SELECT id FROM auth.users WHERE email = '직원이메일@example.com');
```

---

## 🛟 트러블슈팅

| 증상 | 원인 | 해결 |
|---|---|---|
| `permission denied for schema storage` | `0003` 실행 시 storage 스키마 접근 권한 부족 | Supabase 대시보드 SQL Editor는 자동으로 `postgres` 권한으로 실행되므로 정상 동작. CLI 사용 시 service_role 키 사용. |
| `relation "auth.users" does not exist` | Supabase Auth 미초기화 (드문 경우) | 대시보드 → Authentication → 한 번 활성화 후 재실행 |
| `policy ... already exists` | 같은 파일을 두 번 실행 | 각 `CREATE POLICY` 앞에 `DROP POLICY IF EXISTS` 가 있어 멱등성 OK. 무시. |
| RLS 때문에 클라이언트에서 INSERT 실패 | anon 키로 INSERT 시도 | service_role 키 또는 authenticated 세션에서 시도 |

# A1-SMART v2.0 진행 상황

> 마지막 작업: 2026-05-16 (M1 완료)
> 다음 작업: **M2 단계 1 업로드 UI + 단계 2 로그인**

---

## 🎯 마일스톤 진행

- [x] **M0** 환경 셋업·리포 초기화·자산 정리 (커밋 `e2ef7bf`, `e29ccc1`, `3e45006`)
- [x] **M1** Supabase 스키마·RLS·Auth 구축 (커밋 `19d8c46`, `bdc54d1`)
- [ ] **M2** 단계 1·2 (업로드 + 로그인) ← **다음 시작점**
- [ ] M3 단계 4 (파이프라인 포팅)
- [ ] M4 단계 5 (시세 평가 TS 포팅)
- [ ] M5 노션 → Supabase 마이그레이션
- [ ] M6 단계 6 (보고서 DOCX·PDF)
- [ ] M7 단계 7 (홈페이지·대시보드)
- [ ] M8 통합 QA·도메인 연결

---

## 📌 핵심 식별자

| 항목 | 값 |
|---|---|
| 로컬 작업 폴더 | `C:\Users\juncp\00_claudecode\03_A1_Smart_v2` |
| GitHub 레포 | https://github.com/coo-jslee/a1smart_v2 |
| Supabase 프로젝트 | `iaanyxyrwjbinbrzwcuv` (a1-smart-v2, Seoul) |
| Supabase 대시보드 | https://supabase.com/dashboard/project/iaanyxyrwjbinbrzwcuv |
| 도메인 (운영 예정) | https://aonesmart.biz |
| PRD | `C:\Users\juncp\00_claudework\09_a1_smart\docs\PRD_v2.md` |

---

## 🔁 다음 세션 시작 방법 (외출 후 복귀 시)

1. **Claude Code를 작업 폴더에서 실행**:
   ```powershell
   cd C:\Users\juncp\00_claudecode\03_A1_Smart_v2
   claude
   ```

2. **첫 메시지로 한 줄만**:
   > "PROGRESS.md 읽고 M2 시작하자"

   또는 더 구체적으로:
   > "M2 단계 1 업로드 + 단계 2 로그인 시작"

3. Claude가 이 파일을 자동 읽고 컨텍스트 복구 후 M2 작업 시작.

---

## 🛠 M2 작업 예정 내역 (다음 세션에서 자동 실행)

```
src/middleware.ts                         인증 세션 미들웨어
src/app/(auth)/login/page.tsx             로그인 폼
src/app/(auth)/signup/page.tsx            회원가입 폼
src/app/(admin)/dashboard/page.tsx        관리자 대시보드 스켈레톤
src/app/(admin)/properties/new/page.tsx   ★ 단계 1 자료수집 UI
src/app/api/upload/route.ts               Storage 업로드 endpoint
+ shadcn/ui 컴포넌트 설치 (Button, Input, Card, Toast 등)
+ 로컬 dev 서버 실행 + 회원가입·로그인·업로드 흐름 검증
+ 커밋·푸시
```

예상 소요: 30~60분 (사용자 입력 0회)

---

## 🔐 보안 체크리스트

- [x] `.env` 가 `.gitignore` 에 포함됨 (커밋 안 됨)
- [x] `branding/business_registration.pdf` 사업자등록증 보관
- [x] Supabase service_role 키는 서버 코드에서만 사용
- [ ] **M5 완료 후 PAT (`sbp_f2f7...4c3d`) revoke** — https://supabase.com/dashboard/account/tokens
- [ ] 운영 배포 전 service_role 키 회전

---

## 📂 현재 폴더 구조 (M1 완료 시점)

```
03_A1_Smart_v2/
├── .env                                  # gitignored
├── .env.example
├── .gitignore
├── README.md
├── PROGRESS.md                           # ← 이 파일
├── package.json, tsconfig.json, ...
├── branding/
│   ├── logo_v1.png
│   └── business_registration.pdf
├── public/                               # Next.js 정적 자산
├── src/
│   ├── app/
│   │   ├── layout.tsx, page.tsx          # 기본 페이지 (M2에서 교체)
│   │   └── globals.css
│   └── lib/
│       ├── utils.ts                      # cn() 헬퍼
│       └── supabase/
│           ├── client.ts                 # 브라우저 클라이언트
│           ├── server.ts                 # 서버 + service-role 클라이언트
│           └── types.ts                  # Supabase 자동 생성 타입 (21KB)
├── supabase/
│   ├── README.md                         # 마이그레이션 적용 가이드
│   └── migrations/
│       ├── 0001_initial_schema.sql       ✓ 적용
│       ├── 0002_rls_policies.sql         ✓ 적용
│       ├── 0003_storage_buckets.sql      ✓ 적용
│       └── 0004_seed_admin.sql           ✓ 적용
└── node_modules/                         # gitignored
```

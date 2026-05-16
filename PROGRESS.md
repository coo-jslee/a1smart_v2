# A1-SMART v2.0 진행 상황

> 마지막 작업: 2026-05-16 (M4 + M4.1 완료. 합의시세 + 외부 평가 입력 UI)
> 다음 작업: **M4.2 단독건물 시세 보강 (B: 공시지가 fallback) → M5 노션 마이그레이션**

---

## 🎯 마일스톤 진행

- [x] **M0** 환경 셋업·리포 초기화·자산 정리 (커밋 `e2ef7bf`, `e29ccc1`, `3e45006`)
- [x] **M1** Supabase 스키마·RLS·Auth 구축 (커밋 `19d8c46`, `bdc54d1`)
- [x] **M2** 단계 1 업로드 UI + 단계 2 로그인/회원가입 (커밋 `be43ba8`)
- [x] **M3** 단계 4 분석 파이프라인 (Claude PDF 직접 추출). ASR-11710-000001
- [x] **M4** 단계 5 시세 평가 (6개 평가방법 + 합의시세 + MOLIT API). `1e80373`
- [x] **M4.1** A+D: 외부 평가값 입력 UI (감정평가서·집품·KB·직접견적)
- [ ] **M4.2** B: 공시지가 기반 토지 평가 + 건물 감가상각 fallback
- [ ] **M5** 노션 → Supabase 마이그레이션 (← **다음 우선순위**)
- [ ] M4 단계 5 (시세 평가 TS 포팅)
- [ ] M5 노션 → Supabase 마이그레이션
- [ ] M6 단계 6 (보고서 DOCX·PDF)
- [ ] M7 단계 7 (홈페이지·대시보드 확장)
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

## ✅ M2 완료 산출물 (요약)

### 라우트 (7개, 모두 빌드 통과)
- `/` 홈 — 로고·히어로·강점 3분할·푸터
- `/login`, `/signup` — Supabase Auth + Server Actions
- `/admin/dashboard` — KPI 카드 4분할
- `/admin/properties/new` — ★ 단계 1 자료수집 UI (수동/자동, 공부 5종, 이미지 5장)
- `/api/upload` — Storage 업로드 endpoint (인증·MIME/크기·rollback)
- Proxy (Middleware) — 세션 새로고침 + 경로 가드

### 보안 게이트 4중 방어
1. Next.js middleware (세션 + 경로 가드)
2. admin/layout.tsx 서버 가드 (role 재확인)
3. `/api/upload`에서 admin role 검증
4. Supabase RLS 정책 (DB·Storage 마지막 방어선)

---

## 🔁 오후/다음 세션 시작 방법

1. PowerShell 열고:
   ```powershell
   cd C:\Users\juncp\00_claudecode\03_A1_Smart_v2
   claude
   ```

2. Claude에 첫 메시지로:
   > **"PROGRESS.md 읽고 M3 시작하자"**

   또는 먼저 로컬 테스트하고 싶으면:
   > **"PROGRESS.md 읽고, 먼저 dev 서버로 M2 테스트하자"**

---

## 🧪 (선택) M3 들어가기 전 M2 로컬 테스트 시나리오

dev 서버 실행:
```powershell
cd C:\Users\juncp\00_claudecode\03_A1_Smart_v2
npm run dev
```

→ <http://localhost:3000> 접속

테스트 순서 (5분):
1. 홈에서 "회원가입" 클릭 → `/signup`
2. `sm@sunmyung.kr` + 비번 8자 이상으로 가입 (자동 admin 부여)
3. Supabase가 보낸 인증 메일 확인 → 링크 클릭 (받은편지함 또는 스팸함)
4. `/login` 으로 다시 로그인
5. 자동으로 `/admin/dashboard` 진입 (사이드바 + KPI 카드)
6. `매물 신규 등록` → 단계 1 UI
7. 공부 PDF 3종(등기·토지·건축) + 이미지 1~2장 첨부 → `업로드 시작`
8. 토스트 "모든 파일 업로드 완료" ✓
9. Supabase 대시보드 → Storage `gongbu` / `property-images` 버킷에 파일 확인
10. Database → Table Editor → `uploads` 테이블에 status='pending' row 확인

### 다른 이메일로 가입했다면
SQL Editor에서:
```sql
UPDATE public.profiles SET role = 'admin'
WHERE id = (SELECT id FROM auth.users WHERE email = '본인이메일');
```
또는 Claude에 "내 이메일 X로 admin 권한 줘" 요청.

---

## 🛠 M3 작업 예정 내역 (다음 세션 자동 진행)

### 모듈 작성
```
src/lib/pdf/parse.ts            pdf-parse로 PDF 텍스트 추출
src/lib/ocr/clova.ts            Clova OCR fallback (텍스트 200자 미만 시)
src/lib/pii/mask.ts             주민번호 뒷자리 마스킹 (v1.7 정규식)
src/lib/llm/extract.ts          Claude Opus 4.7 호출 + JSON 파싱
src/lib/property/mapper.ts      JSON → properties + customers + gongbu props
src/lib/asr.ts                  derive_asr_code() + 시퀀스 채번
src/lib/property/risk.ts        위험등급 자동 판정 (가압류·근저당 룰)
prompts/{deungki,toji,geonchuk}.md   v1.7에서 복사
```

### API
```
src/app/api/pipeline/extract/route.ts
   uploads(pending) → PDF 다운로드 → OCR/PDF parse → Claude → property INSERT
   매물DB workflow_stage = '05_입력' 설정
   에러 시 error_logs INSERT
```

### UI 갱신
```
src/app/admin/properties/new/page.tsx
   업로드 완료 후 "분석 시작" 버튼 추가 → /api/pipeline/extract 호출
   Supabase Realtime으로 진행률 표시
```

### 검증
- 양재 삼익이오이 케이스 시나리오로 1건 분석 → properties row 정상 생성 확인

### 의존성 추가 (예상)
```bash
npm install pdf-parse
npm install --save-dev @types/pdf-parse
```

예상 소요: 1.5~2시간 (사용자 입력 거의 없음, 단 Clova/Anthropic API 키 입력 필요)

---

## 🔑 M3에서 필요한 API 키 (사용자가 발급해주실 것)

| 키 | 발급 위치 | 어디 저장 |
|---|---|---|
| `ANTHROPIC_API_KEY` | https://console.anthropic.com/settings/keys | `.env` |
| `CLOVA_OCR_URL`, `CLOVA_OCR_SECRET` | https://www.ncloud.com (네이버 클라우드) → CLOVA OCR Custom 서비스 신청 | `.env` |

> 둘 다 없어도 M3 코드 작성·로컬 PDF 텍스트 추출은 가능. 다만 실제 매물 분석 검증을 하려면 두 키 모두 필요.
> Clova OCR이 어려우면 일단 ANTHROPIC만 발급하고, pdf-parse만으로 진행 (스캔본 PDF는 일단 보류).

---

## 🔐 보안 체크리스트

- [x] `.env` 가 `.gitignore` 에 포함됨 (커밋 안 됨)
- [x] `branding/business_registration.pdf` 사업자등록증 보관
- [x] Supabase RLS 9개 테이블 + Storage 3개 버킷 활성화
- [x] 인증·관리자 가드 4중 방어
- [ ] **M5 완료 후 PAT (`sbp_f2f7...4c3d`) revoke** — https://supabase.com/dashboard/account/tokens
- [ ] 운영 배포 전 service_role 키 회전

---

## 📂 현재 폴더 구조 (M2 완료 시점)

```
03_A1_Smart_v2/
├── .env                              # gitignored
├── .env.example, .gitignore, README.md, PROGRESS.md
├── components.json                   # shadcn 설정
├── package.json, tsconfig.json, next.config.ts
├── branding/
│   ├── logo_v1.png
│   └── business_registration.pdf
├── public/
│   ├── logo_v1.png                   # Next/Image용 사본
│   └── *.svg                         # 기본 자산
├── src/
│   ├── middleware.ts                 # 인증·경로 가드 진입점
│   ├── app/
│   │   ├── layout.tsx                # Toaster 마운트
│   │   ├── page.tsx                  # 홈
│   │   ├── globals.css               # shadcn 변수
│   │   ├── (auth)/                   # route group (URL에 안 나타남)
│   │   │   ├── layout.tsx            # 가운데 정렬 + 로고
│   │   │   ├── actions.ts            # loginAction, signupAction, logoutAction
│   │   │   ├── login/page.tsx
│   │   │   └── signup/page.tsx
│   │   ├── admin/                    # /admin/* 경로 (관리자 전용)
│   │   │   ├── layout.tsx            # 사이드바 + admin 가드
│   │   │   ├── dashboard/page.tsx
│   │   │   └── properties/new/page.tsx   # ★ 단계 1 자료수집 UI
│   │   └── api/
│   │       └── upload/route.ts       # Storage 업로드 endpoint
│   ├── components/ui/                # shadcn UI 9종
│   │   ├── alert.tsx, button.tsx, card.tsx, checkbox.tsx,
│   │   ├── input.tsx, label.tsx, radio-group.tsx, separator.tsx, sonner.tsx
│   └── lib/
│       ├── utils.ts                  # cn()
│       ├── uploads.ts                # 업로드 상수·유틸
│       └── supabase/
│           ├── client.ts             # 브라우저 클라이언트
│           ├── server.ts             # 서버 + service-role 클라이언트
│           ├── middleware.ts         # updateSession()
│           └── types.ts              # 자동 생성 타입 (21KB)
├── supabase/
│   ├── README.md                     # 마이그레이션 적용 가이드
│   └── migrations/
│       ├── 0001_initial_schema.sql   ✓ 적용
│       ├── 0002_rls_policies.sql     ✓ 적용
│       ├── 0003_storage_buckets.sql  ✓ 적용
│       └── 0004_seed_admin.sql       ✓ 적용
└── node_modules/                     # gitignored
```

# A1-SMART v2.0 진행 상황

> 마지막 작업: 2026-05-16 22:30 (M4 + M4.1 완료. 외부 평가 입력 UI 운영 가능)
> 다음 작업 (택일):
>   ① 외부 평가 추가 테스트 + 시세 갱신 재실행 (사용자 검증)
>   ② **M4.2 공시지가 fallback** (단독건물 시세 보강, B 옵션)
>   ③ **M5 노션 → Supabase 마이그레이션** (v1.7 데이터 이관, 검증용 매물 확보)
>   ④ **M6 분석보고서 (DOCX/PDF 자동 생성)** — 단계 6

---

## 🎯 마일스톤 진행

- [x] **M0** 환경 셋업·리포 초기화·자산 정리 (`e2ef7bf` `e29ccc1` `3e45006`)
- [x] **M1** Supabase 스키마·RLS·Auth 구축 (`19d8c46` `bdc54d1`)
- [x] **M2** 단계 1 업로드 UI + 단계 2 로그인/회원가입 (`be43ba8`)
- [x] **M3** 단계 4 분석 파이프라인 (Claude PDF 직접 추출). ASR-11710-000001 검증
- [x] **M4** 단계 5 시세 평가 (6개 평가방법 + 합의시세 + MOLIT API). `1e80373`
- [x] **M4.1** A+D: 외부 평가값 입력 UI + 상가 nrg_trade 면적 fix (`a9a2236`)
- [ ] **M4.2** B: 공시지가 기반 토지 평가 + 건물 감가상각 fallback
- [ ] **M5** 노션 → Supabase 마이그레이션
- [ ] **M6** 단계 6 분석보고서 (DOCX/PDF 자동 생성)
- [ ] **M7** 단계 7 홈페이지·대시보드 확장
- [ ] **M8** 통합 QA·도메인 연결

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

## ✅ M3 + M4 + M4.1 산출물

### M3 결과 (단계 4)
- **첫 매물 등록 성공**: ASR-11710-000001
- 매물: 송파구 중길로 463 (거여동), 단독상가건물
- 면적 813.2㎡, 지상 4층 + 지하 1층, 1992년 준공, 철근콘크리트조
- 소유자: 제이에스미라클주식회사 (법인등록번호 110111-0543052)
- 권리: 근저당 78.65억, 임의경매 2023타경51257, 가압류 1건 → 위험등급 "위험"
- mapper.ts v2-fallback 으로 단독건물·집합건물 양쪽 처리

### M4 결과 (단계 5)
- 6개 평가방법 + 합의시세 + MOLIT RTMS API (9 endpoints)
- 가중치·층보정·전세가율·디스카운트 v1.7 동일
- 정책 보존: 덮어쓰기 금지, append-only 메모, 시세이력DB append-only

### M4.1 결과 (외부 평가 입력)
- `properties.external_evaluations` JSONB 컬럼 (감정평가서·집품·KB·직접견적)
- 매물 상세 페이지에 "외부 평가 추가" 모달 + 목록·삭제 표
- 시세 갱신 시 자동으로 가중평균에 반영
- 송파 거여 매물 첫 시세 산출: **합의 49.76억** (정상 71.08억 × -30% 디스카운트, 3개 방법)
  ※ 외부 평가 추가 시 더 정확한 산출 기대

---

## 🔁 내일 새벽 재개 방법

### 1) PowerShell 열기

```powershell
cd C:\Users\juncp\00_claudecode\03_A1_Smart_v2
claude
```

### 2) Claude 에게 첫 메시지 — 4가지 옵션 중 택일

**① 사용자 직접 검증 후 다음 단계**
> "PROGRESS.md 읽어줘. 외부 평가 추가해서 시세 갱신부터 다시 해볼게."
> → dev 서버 켜드리고 사용자 테스트 → 결과 보고 다음 단계 결정

**② M4.2 (공시지가 fallback) 시작**
> "PROGRESS.md 읽고 M4.2 공시지가 fallback 시작"
> → toji.공시지가 × land_m2 + 건물 감가상각 자동 계산 fallback 추가 (~30분)

**③ M5 노션 마이그레이션 시작**
> "PROGRESS.md 읽고 M5 노션 마이그레이션 시작"
> → v1.7 노션 6 DB → Supabase 일괄 이관 (~1시간, 사용자 입력 0)

**④ M6 분석보고서 시작**
> "PROGRESS.md 읽고 M6 분석보고서 시작"
> → docx.js + Puppeteer 로 DOCX/PDF 자동 생성 (~1.5~2시간)

권장: **①** (방금 만든 외부 평가 UI 한 번 써보시고) → 다음에 **③ M5** (실데이터 확보) 또는 **④ M6** (사용자 가치 큰 산출물 빠르게).

---

## 🚪 빠져나가는 법

그냥 터미널/창 닫으시면 됩니다. 모든 코드는 디스크 + GitHub에 저장됨, dev 서버 종료됨, 임시 파일 정리됨.

---

## 🛠 신규 라우트 (M4.1 완료 시점, 총 10개)

```
○ /                              홈
○ /login, /signup                인증
ƒ /admin/dashboard               관리자 대시보드
ƒ /admin/properties/new          단계 1 자료수집
ƒ /admin/properties/[asr]        매물 상세 + 시세 갱신 + 외부 평가 입력
ƒ /api/upload                    Storage 업로드
ƒ /api/pipeline/extract          M3 단계 4 분석 (Claude PDF 직접)
ƒ /api/pipeline/price            M4 단계 5 시세 평가
ƒ /api/properties/[asr]/external-evals  M4.1 외부 평가 CRUD
ƒ Proxy (Middleware)             세션·경로 가드
```

---

## 🔐 보안 체크리스트

- [x] `.env` 가 `.gitignore` 에 포함
- [x] Supabase RLS 9개 테이블 + Storage 3개 버킷 활성화
- [x] 인증·관리자 가드 4중 방어
- [ ] M5 완료 후 PAT (`sbp_f2f7...4c3d`) revoke 검토
- [ ] 운영 배포 전 service_role 키 회전

---

## 📂 폴더 구조 (M4.1 완료)

```
03_A1_Smart_v2/
├── .env (gitignored), .env.example
├── README.md, PROGRESS.md (이 파일)
├── package.json (Next.js 16, Tailwind v4, shadcn/ui, Supabase SSR, Anthropic SDK)
├── branding/{logo_v1.png, business_registration.pdf}
├── prompts/{deungki,toji,geonchuk}.md   v1.7 그대로
├── public/{logo_v1.png, *.svg}
├── src/
│   ├── middleware.ts                     세션 + 경로 가드
│   ├── app/
│   │   ├── (auth)/{layout,login,signup,actions}.tsx
│   │   ├── admin/
│   │   │   ├── layout.tsx, dashboard/page.tsx
│   │   │   └── properties/
│   │   │       ├── new/page.tsx           [단계 1] 업로드 UI + 분석 시작
│   │   │       └── [asr]/
│   │   │           ├── page.tsx           매물 상세 (Server Component)
│   │   │           ├── price-refresh-client.tsx
│   │   │           └── external-evals-client.tsx  ★ M4.1 신규
│   │   ├── api/
│   │   │   ├── upload/route.ts
│   │   │   ├── pipeline/{extract,price}/route.ts
│   │   │   └── properties/[asr]/external-evals/route.ts  ★ M4.1 신규
│   │   ├── layout.tsx (Toaster 마운트), page.tsx (홈)
│   │   └── globals.css
│   ├── components/ui/                    shadcn 12종 (button/input/dialog/select/textarea/...)
│   └── lib/
│       ├── utils.ts, uploads.ts
│       ├── pdf/parse.ts, pii/mask.ts, llm/extract.ts, asr.ts
│       ├── property/{mapper,risk}.ts
│       ├── price/
│       │   ├── types.ts, floor-adj.ts, match.ts
│       │   ├── molit.ts (RTMS 9 endpoints, 면적 다중 fallback)
│       │   ├── estimate.ts (6 methods), consensus.ts, update.ts
│       └── supabase/{client,server,middleware,types}.ts
└── supabase/migrations/0001~0005_*.sql
```

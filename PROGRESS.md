# A1-SMART v2.0 진행 상황

> 마지막 작업: 2026-05-17 (M7 후속 완료. /about /contact /intake /privacy /terms 5개 페이지 + inquiries 테이블 + 문의 폼 Server Actions)
> 다음 작업 (택일):
>   ① **호스팅 결정 후 Vercel/Cafe24 배포** (선택)
>   ② **M6 후속 (PDF 변환)** — LibreOffice headless 또는 Puppeteer 도입
>   ③ **admin inquiries 일람 페이지** — 들어온 문의·매도 의뢰 처리용 (~30분)
>   ④ **매물 사진 추가 UI** — 매물 상세(admin)에서 image_paths 수동 업로드
>   ⑤ **M4.2 공시지가 fallback** (단독건물 시세 보강)
>   ⑥ **M5 노션 → Supabase 마이그레이션** (v1.7 데이터 이관)

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
- [x] **M6** 단계 7 분석보고서 — DOCX 자동 생성 + Storage 영구 저장 + 3열 이미지 행 + 딥블루 톤 + 풀폭 본문 + 재생성 자동 삭제 + 수동 삭제 (PDF는 후속)
- [x] **M7 (1차)** 공개 홈 + 매물 리스트 + 매물 상세 (3페이지). 시드 매물 7건. 회원 외부용 보고서 다운로드.
- [x] **M7 (후속)** 회사 소개·문의·매도 의뢰 + 약관/개인정보 (5페이지) + inquiries 테이블 + 문의 Server Actions
- [ ] **M8** 통합 QA·도메인 연결 (호스팅 계약 후)

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

### M6 최종 결과 (분석보고서 DOCX — 단계 7)

송파 거여 매물(ASR-11710-000001)로 실데이터 E2E 검증 완료. 사용자가 다운로드한 DOCX 표지 스크린샷에서 KPI · 3열 이미지 · 기본정보 표가 모두 정상 렌더링되는 것 확인.

**파이프라인 11단계** (`POST /api/pipeline/report?asr=...&version=investor|full`):
1. 매물 + 소유자 + 최신 합의시세 조회
2. 매물 사진 3장 Storage 다운로드 (`image_paths[0..2]`) — 없으면 슬롯 공란
3. `ReportPayload` 빌드 — investor 버전은 PNU·내부메모·1순위 채권자 실명 제거
4. 전문가 종합의견 생성 (Claude `claude-sonnet-4-5` 또는 룰 기반 템플릿 fallback)
5. DOCX 빌드 — `docx@9.6.1` 라이브러리로 v1.7 `make_docx.js` 디자인 포팅
6. **같은 버전 기존 보고서 자동 삭제** — 파일명 `${version}_` prefix 매칭, Storage 일괄 remove
7. Storage `reports` 버킷 업로드 — 경로 `{YYYY-MM}/{ASR}/{version}_{stamp}.docx`
8. `properties.attachment_paths` 갱신 — stale 제거 + 새 경로 append
9. workflow_stage `05_입력 | 06_시세조사 | 07_분석보고서` → `완료` 자동 전이
10. `internal_note` 한 줄 append (`[07분석보고서|YYYY-MM-DD] ...`)
11. 1시간 signed URL 반환 → UI 에서 즉시 다운로드

**문서 디자인** (A4, 0.7" 여백, Pretendard, 페이지브레이크 없음):
- **본문 너비**: `TW = 9890 DXA` — 콘텐츠 영역 풀폭 사용 (헤더·푸터 가로선과 정확히 일치)
- **컬러 팔레트**: 딥 네이비 톤 (금융·회계 보고서 신뢰감)
  - `BRAND_DARK 0B1F4D` — 표지 띠 / 헤더·푸터 라인 / KPI 값 / 섹션 제목
  - `BRAND_MID 1A3D7A` — KPI 테두리 / 섹션 굵은 상단선 / 의견박스 좌선
  - `HDR_BG A3BCDB` / `LBL_BG D6E4F5` / `KPI_BG EAF0F9` / `OP_BG F0F4FA`
- **구조** (표지 → 본문 자연 연결):
  - 표지: 회사 strip + 제목 + 주소 + 압류·경매 경고 배너(조건부)
  - KPI 4분할 (합의시세 / 위험등급 / ㎡단가 / 발행일)
  - **3열 이미지 행** — 대상 부동산 / 위치도(광역) / 위치도(인근), 200×150px, 슬롯 빈 곳은 `—`
  - ① 물건 기본정보 / ② 권리분석 / ③ 시세분석 (외부 평가값 포함) / ④ 취득비용·세무 추정 (워터마크 필수)
  - ⑤ 합의시세 구성 (평가방법별 4열 표) / ⑥ 전문가 종합의견 (좌측 굵은 네이비 테두리 박스)
  - 내부용 한정: ⚙ "내부용 추가정보" (외부 배포 금지)
  - 푸터: 발행일 + ASR + 페이지번호

**삭제 정책** (자동/수동 모두 지원):
- **자동**: 재생성 시 같은 매물의 **같은 버전** 기존 파일만 자동 정리 (다른 버전 보존)
- **수동**: 매물 상세 → 보고서 행마다 🗑 삭제 버튼 → `window.confirm` → Storage + `attachment_paths` + 감사 로그 (`[07분석보고서삭제|...]`) 일괄 정리
- Path traversal 차단: 삭제·다운로드 모두 해당 매물의 `attachment_paths` 안에 있는 경로만 허용

**이미지 파이프라인** (`src/lib/report/images.ts`):
- `loadReportImages()` — `property-images` 버킷에서 service role 다운로드
- 매직 바이트 자동 감지: PNG / JPG / GIF / BMP. WebP 등 미지원 포맷은 슬롯 공란
- 슬롯 라벨 고정: `["대상 부동산", "위치도 (광역)", "위치도 (인근)"]`

**Storage RLS** (기존 `0003_storage_buckets.sql` 활용 — 신규 마이그레이션 불필요):
- 경로에 `investor_` prefix → 로그인 회원도 SELECT (배포용 링크 공유 가능)
- `full_` 또는 그 외 → admin 전용

**검증 결과**:
- ✅ TypeScript `tsc --noEmit` 0 에러
- ✅ `next build` 성공 — M6 신규 3개 API 라우트 (`report`, `report-download`, `report-delete`)
- ✅ 단위 스모크 (`scripts/smoke-docx.ts`) 4가지 케이스 통과:
  - investor + 사진 0/1/3장 (14.1 ~ 14.9KB)
  - full + 사진 0장 (14.4KB)
- ✅ **실데이터 E2E** (ASR-11710-000001): 외부용 보고서 생성 → DOCX 다운로드 → 표지·KPI·이미지·기본정보 정상 렌더링 확인

**검증 방법** (재현):
```powershell
cd C:\Users\juncp\00_claudecode\03_A1_Smart_v2
npm run dev
# 브라우저 → http://localhost:3000/login 로그인
# → /admin/properties/ASR-11710-000001
# → "분석보고서 (M6 — 단계 7)" 카드 → 버전 선택 → "분석보고서 생성"
# 5~15초 후 signed URL 발급 → DOCX 다운로드
# 동일 버전 재생성 시 "기존 동일 버전 보고서 정리: 삭제 1/1건" 스텝 표시 확인
# 각 보고서 행에서 [⬇ 다운로드] / [🗑 삭제] 버튼 동작
```

### 시드 매물 7건 (홈페이지 M7 출시 전 더미 데이터)

ASR-11710-000001 (송파 거여 단독상가)을 6번 복제 → 총 7건. PNU 부번 / 도로명 번지(+2씩) / 가격 ±10% / 면적 ±5% 자동 변형. 모두 `is_public=true`, `workflow_stage=완료`, 사진 6장 공유. `scripts/seed-clone-properties.ts` 로 재실행 가능.

### M7 1차 결과 (공개 홈페이지 — 3페이지)

**페이지 구성**:
- `/` — Hero + 최신 공개 매물 6건 카드 그리드 + 강점 3박스 + 푸터
- `/properties` — 매물 리스트, 필터(지역/유형/가격대/위험등급), 정렬(최신/가격↑/가격↓), 12건씩 페이지네이션
- `/properties/[asr]` — 공개 매물 상세 (로그인 회원만, middleware 가드). 사진 갤러리 + KPI 4분할 + 기본정보·권리분석 + 합의시세 구성 + 분석보고서 다운로드 (외부용 한정)

**접근 정책**:
- `/`, `/properties` : 누구나 (anon)
- `/properties/[asr]` : 로그인 필요 (member/admin) — middleware redirect to `/login?redirectedFrom=...`
- 보고서 다운로드 (`/api/properties/[asr]/report-download`) :
  - admin → 모든 보고서 (investor + full)
  - member → 매물 `is_public=true` + 파일명 `investor_` prefix 인 경우만 (Storage RLS와 일치)

**민감 정보 차단**:
- 공개 상세에서 PNU·소유자 실명·1순위 채권자·내부 메모 노출 안 함
- "1순위 채권자 실명·PNU 등 상세 권리관계는 분석보고서에서 확인하세요" 안내 문구

**컴포넌트 재사용**:
- `PublicNavbar` + `PublicFooter` : 3페이지 공유
- `PropertyCard` : 홈 / 리스트 공유. 썸네일 + 배지 + 면적·층·준공 + 합의시세 + ㎡당
- `PublicGallery` : 매물 상세 사진 갤러리 (메인 + 썸네일 가로 스크롤)
- `ReportDownloadList` : 회원 외부용 보고서 다운로드

**Storage public URL 헬퍼** (`src/lib/storage/public-url.ts`):
- `publicStorageUrl(bucket, path)` — 공개 버킷 URL 조립
- `firstPropertyImageUrl(image_paths)` — 카드 썸네일용
- `propertyImageUrls(image_paths)` — 상세 갤러리용

**검증 결과**:
- ✅ TypeScript `tsc --noEmit` 0 에러
- ✅ `next build` 성공 — 신규 2개 페이지 라우트 (`/properties`, `/properties/[asr]`) + 기존 `/` 갱신
- ⏳ 실제 브라우저 검증 (필터·페이지네이션·로그인 가드·회원 보고서 다운로드): 사용자가 dev 서버에서 확인

**검증 방법** (재현):
```powershell
# 비로그인 상태
http://localhost:3000/                          # 홈, 매물 6건 표시
http://localhost:3000/properties                # 리스트 7건
http://localhost:3000/properties/ASR-11710-000001  # → 자동 redirect /login

# 회원 로그인 후
http://localhost:3000/properties/ASR-11710-000001  # 상세 접근 OK
# 외부용 분석보고서 다운로드 가능 (관리자 페이지에서 생성한 investor_*.docx)
```

---

## 🔁 내일 새벽 재개 방법

### 1) PowerShell 열기

```powershell
cd C:\Users\juncp\00_claudecode\03_A1_Smart_v2
claude
```

### 2) Claude 에게 첫 메시지 — 4가지 옵션 중 택일

**① M6 후속 — PDF 변환 추가**
> "PROGRESS.md 읽고 M6 PDF 변환 추가"
> → LibreOffice headless 또는 Puppeteer로 DOCX → PDF 자동 생성, Storage 같이 저장 (~30~60분)

**② 매물 사진 추가 UI**
> "PROGRESS.md 읽고 매물 상세에서 사진 추가 UI 만들어줘"
> → property-images 버킷 업로드 + image_paths 갱신 + drag-drop UI (~45분)

**③ M4.2 (공시지가 fallback) 시작**
> "PROGRESS.md 읽고 M4.2 공시지가 fallback 시작"
> → toji.공시지가 × land_m2 + 건물 감가상각 자동 계산 fallback 추가 (~30분)

**④ M5 노션 마이그레이션 시작**
> "PROGRESS.md 읽고 M5 노션 마이그레이션 시작"
> → v1.7 노션 6 DB → Supabase 일괄 이관 (~1시간, 사용자 입력 0)

권장: **②** (사진 추가 UI — 다른 매물에 보고서 만들 때 즉시 필요) → 다음에 **③ M5** (실데이터 확보) 또는 **①** (PDF 변환).

---

## 🚪 빠져나가는 법

그냥 터미널/창 닫으시면 됩니다. 모든 코드는 디스크 + GitHub에 저장됨, dev 서버 종료됨, 임시 파일 정리됨.

---

## 🛠 신규 라우트 (M7 후속, 총 20개)

```
ƒ /                              홈 (Hero + 최신 매물 6건)               ★ M7
○ /login, /signup                인증
ƒ /properties                    공개 매물 리스트 + 필터 + 페이지네이션  ★ M7
ƒ /properties/[asr]              공개 매물 상세 (로그인 회원만)           ★ M7
ƒ /about                         회사 소개 + 사업자 정보                  ★ M7 후속
ƒ /contact                       일반 문의 폼                              ★ M7 후속
ƒ /intake                        매도 의뢰 폼                              ★ M7 후속
ƒ /privacy                       개인정보처리방침 (초안)                   ★ M7 후속
ƒ /terms                         이용약관 (초안)                            ★ M7 후속
ƒ /admin/dashboard               관리자 대시보드
ƒ /admin/properties/new          단계 1 자료수집
ƒ /admin/properties/[asr]        매물 상세 + 시세 갱신 + 외부 평가 입력 + 분석보고서 생성/관리
ƒ /api/upload                    Storage 업로드
ƒ /api/pipeline/extract          M3 단계 4 분석 (Claude PDF 직접)
ƒ /api/pipeline/price            M4 단계 5 시세 평가
ƒ /api/pipeline/report           M6 단계 7 분석보고서 생성 (DOCX + Storage + attachment_paths + auto-cleanup)
ƒ /api/properties/[asr]/external-evals    M4.1 외부 평가 CRUD
ƒ /api/properties/[asr]/report-download   M6/M7 보고서 signed URL 발급 (admin: 모든 보고서, member: investor_ 만)
ƒ /api/properties/[asr]/report-delete     M6 보고서 수동 삭제 (Storage + DB)
ƒ Proxy (Middleware)             세션·경로 가드 (admin/member/properties[asr] 로그인 요구)
```

---

## 🔐 보안 체크리스트

- [x] `.env` 가 `.gitignore` 에 포함
- [x] Supabase RLS 9개 테이블 + Storage 3개 버킷 활성화
- [x] 인증·관리자 가드 4중 방어
- [ ] M5 완료 후 PAT (`sbp_f2f7...4c3d`) revoke 검토
- [ ] 운영 배포 전 service_role 키 회전

---

## 📂 폴더 구조 (M6 1차 완료)

```
03_A1_Smart_v2/
├── .env (gitignored), .env.example
├── README.md, PROGRESS.md (이 파일)
├── package.json (Next.js 16, Tailwind v4, shadcn/ui, Supabase SSR, Anthropic SDK, docx@9.6.1)
├── branding/{logo_v1.png, business_registration.pdf}
├── prompts/{deungki,toji,geonchuk}.md   v1.7 그대로
├── public/{logo_v1.png, *.svg}
├── scripts/
│   └── smoke-docx.ts                     ★ M6 DOCX 빌더 단위 스모크 (npx tsx 실행)
├── src/
│   ├── middleware.ts                     세션 + 경로 가드
│   ├── app/
│   │   ├── (auth)/{layout,login,signup,actions}.tsx
│   │   ├── admin/
│   │   │   ├── layout.tsx, dashboard/page.tsx
│   │   │   └── properties/
│   │   │       ├── new/page.tsx           [단계 1] 업로드 UI + 분석 시작
│   │   │       └── [asr]/
│   │   │           ├── page.tsx           매물 상세 (Server Component) + 보고서 카드
│   │   │           ├── price-refresh-client.tsx
│   │   │           ├── external-evals-client.tsx    ★ M4.1
│   │   │           └── report-generate-client.tsx   ★ M6 신규
│   │   ├── api/
│   │   │   ├── upload/route.ts
│   │   │   ├── pipeline/{extract,price,report}/route.ts   ★ report = M6
│   │   │   └── properties/[asr]/{external-evals,report-download,report-delete}/route.ts
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
│       ├── report/                       ★ M6 신규
│       │   ├── tax.ts        취득세·교육세·인지세 추정 (업무시설/주거)
│       │   ├── opinion.ts    Claude API 의견 + 룰 템플릿 fallback
│       │   ├── images.ts     property-images 다운로드 + 매직바이트 포맷 감지 (PNG/JPG/GIF/BMP)
│       │   ├── build.ts      매물 + 최신 합의시세 → ReportPayload (이미지 슬롯 3개 포함)
│       │   └── docx.ts       v1.7 make_docx.js 디자인 포팅 (Pretendard, 4열 KV, 3열 이미지, 딥블루 톤, TW 9890 풀폭)
│       └── supabase/{client,server,middleware,types}.ts
└── supabase/migrations/0001~0005_*.sql   (reports 버킷·attachment_paths 컬럼은 0001/0003에 기존)
```

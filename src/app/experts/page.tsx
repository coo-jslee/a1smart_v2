/**
 * 전문가 소개 페이지 `/experts` — 다크 톤.
 *
 *  - 공인회계사·세무사·변호사 등 전문가 집단 소개
 *  - 6명까지 (1행 2명 × 3행) 카드 그리드
 *  - 각 카드: 이미지(또는 직군 아이콘 placeholder) / 약력 개요 / 이메일 / 핸드폰
 *
 *  사진 추가 방법: public/experts/{파일명}.jpg 저장 후 아래 EXPERTS[].image 에 경로 입력.
 */
import {
  Mail,
  Phone,
  Calculator,
  Scale,
  Landmark,
  Home,
  TrendingUp,
  BrainCircuit,
} from "lucide-react";
import { PublicNavbar } from "@/components/public/public-navbar";
import { PublicFooter } from "@/components/public/public-footer";

type Expert = {
  name: string;
  title: string;
  bio: string;
  email: string;
  phone: string;
  image?: string; // public/ 기준 경로 — 없으면 직군 아이콘 표시
  icon: React.ComponentType<{ className?: string }>;
};

// ── 전문가 데이터 (실제 정보로 교체) ──────────────────────────
const EXPERTS: Expert[] = [
  {
    name: "강창구",
    title: "대표이사 · 공인회계사",
    bio: "30년 경력 금융·회계·구조조정 전문가(CPA). 부동산 취득·법인전환·세무 전략을 총괄합니다.",
    email: "coo@aonesmart.biz",
    phone: "(추후 안내)",
    icon: Calculator,
  },
  {
    name: "(성명 입력)",
    title: "세무사",
    bio: "부동산 취득세·양도소득세·상속세 및 법인 절세 전략 자문. 다각적 세무 시뮬레이션 담당.",
    email: "(추후 안내)",
    phone: "(추후 안내)",
    icon: Landmark,
  },
  {
    name: "(성명 입력)",
    title: "변호사",
    bio: "부동산 권리분석·계약 검토·등기 실무 및 법률 리스크 자문. 경공매·NPL 트랙 법률 검토.",
    email: "(추후 안내)",
    phone: "(추후 안내)",
    icon: Scale,
  },
  {
    name: "(성명 입력)",
    title: "공인중개사",
    bio: "매물 발굴·현장 실사·거래 중개 실무 총괄. 의뢰 접수부터 계약까지 책임 관리.",
    email: "(추후 안내)",
    phone: "(추후 안내)",
    icon: Home,
  },
  {
    name: "(성명 입력)",
    title: "감정평가사",
    bio: "시세 평가·담보 평가·투자 가치 분석. 합의시세 산정의 정확도를 검증합니다.",
    email: "(추후 안내)",
    phone: "(추후 안내)",
    icon: TrendingUp,
  },
  {
    name: "(성명 입력)",
    title: "AI · 데이터 분석",
    bio: "AI 매물 매칭·합의시세 모델·데이터 파이프라인 운영. 기술과 부동산을 연결합니다.",
    email: "(추후 안내)",
    phone: "(추후 안내)",
    icon: BrainCircuit,
  },
];

export default function ExpertsPage() {
  return (
    <div className="dark flex flex-col flex-1 min-h-screen bg-[#0B1F4D] text-white">
      <PublicNavbar />

      {/* 헤더 */}
      <section className="bg-[#081633] border-b border-white/10">
        <div className="max-w-5xl mx-auto px-6 py-14 text-center">
          <p className="text-cyan-300 text-xs md:text-sm font-semibold tracking-[0.22em] uppercase mb-3">
            Our Experts
          </p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
            부동산 의사결정을 함께 설계하는
            <br />
            <span className="text-yellow-300">전문가 집단</span>
          </h1>
          <p className="mt-5 text-sm md:text-base text-blue-100/80 leading-relaxed max-w-2xl mx-auto">
            공인회계사·세무사·변호사·공인중개사·감정평가사 — 각 분야 자격
            보유 전문가가 매물 발굴부터 권리·세무·법률 전략까지 직접 검토하고
            자문합니다.
          </p>
        </div>
      </section>

      {/* 전문가 카드 그리드 (1행 2명 × 3행) */}
      <section className="flex-1">
        <div className="max-w-5xl mx-auto px-6 py-14">
          <div className="grid sm:grid-cols-2 gap-6">
            {EXPERTS.map((e, i) => (
              <ExpertCard key={i} expert={e} />
            ))}
          </div>

          <p className="mt-10 text-center text-xs text-blue-300/50">
            ※ 전문가 사진·약력·연락처는 순차적으로 업데이트됩니다.
          </p>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}

function ExpertCard({ expert }: { expert: Expert }) {
  const Icon = expert.icon;
  return (
    <div className="flex gap-5 p-6 rounded-xl bg-blue-950/40 border border-white/10 hover:border-cyan-400/40 hover:bg-blue-900/40 transition-colors backdrop-blur-sm">
      {/* 이미지 / 직군 아이콘 */}
      <div className="flex-shrink-0">
        {expert.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={expert.image}
            alt={expert.name}
            className="w-24 h-24 rounded-xl object-cover ring-1 ring-white/15"
          />
        ) : (
          <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-cyan-400/90 to-blue-600 flex items-center justify-center ring-1 ring-white/15">
            <Icon className="h-10 w-10 text-blue-950" />
          </div>
        )}
      </div>

      {/* 정보 */}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2 flex-wrap">
          <h3 className="text-lg font-bold text-white">{expert.name}</h3>
          <span className="text-xs font-medium text-cyan-300">
            {expert.title}
          </span>
        </div>
        <p className="mt-2 text-sm text-blue-100/80 leading-relaxed">
          {expert.bio}
        </p>
        <div className="mt-3 pt-3 border-t border-white/10 space-y-1.5 text-xs">
          <div className="flex items-center gap-2 text-blue-100/85">
            <Mail className="h-3.5 w-3.5 text-cyan-300 flex-shrink-0" />
            {expert.email.startsWith("(") ? (
              <span className="text-blue-300/60">{expert.email}</span>
            ) : (
              <a
                href={`mailto:${expert.email}`}
                className="hover:text-yellow-300 hover:underline truncate"
              >
                {expert.email}
              </a>
            )}
          </div>
          <div className="flex items-center gap-2 text-blue-100/85">
            <Phone className="h-3.5 w-3.5 text-cyan-300 flex-shrink-0" />
            {expert.phone.startsWith("(") ? (
              <span className="text-blue-300/60">{expert.phone}</span>
            ) : (
              <a
                href={`tel:${expert.phone.replace(/[^0-9+]/g, "")}`}
                className="hover:text-yellow-300 hover:underline"
              >
                {expert.phone}
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

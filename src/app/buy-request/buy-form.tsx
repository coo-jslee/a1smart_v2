"use client";

/**
 * 매수 의뢰 폼 (Client Component).
 *
 *  - inquiry_type='buy' 로 submitInquiry Server Action 호출
 *  - transaction_type(매매/전세/월세) 에 따라 입력 필드 분기:
 *      매매: budget_min ~ expected_price (예산 하한·상한)
 *      전세: expected_price (전세 보증금 한도)
 *      월세: expected_price (월세 보증금) + monthly_rent_max (월세 한도)
 *  - 공통: name, phone/email, property_type, region, area_m2, message, 동의
 */
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { submitInquiry } from "../(public-actions)/inquiry-actions";

type TxType = "매매" | "전세" | "월세";

const PROPERTY_TYPES = [
  "아파트",
  "오피스텔",
  "빌라",
  "단독상가",
  "상가",
  "꼬마빌딩",
  "단독주택",
  "토지",
  "기타",
];

export function BuyRequestForm() {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [txType, setTxType] = useState<TxType>("매매");
  const [propertyType, setPropertyType] = useState<string>("아파트");

  function handleSubmit(formData: FormData) {
    setErrorMsg(null);
    formData.set("inquiry_type", "buy");
    formData.set("transaction_type", txType);
    formData.set("property_type", propertyType);
    formData.set("subject", `매수 의뢰 — ${txType} / ${propertyType}`);
    startTransition(async () => {
      const res = await submitInquiry(formData);
      if (res.ok) {
        toast.success("매수 의뢰가 정상 접수되었습니다.");
        setDone(true);
      } else {
        setErrorMsg(res.error);
        toast.error(res.error);
      }
    });
  }

  if (done) {
    return (
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle2 className="h-5 w-5 text-green-700" />
        <AlertDescription className="text-green-900">
          <div className="font-medium">매수 의뢰 접수 완료</div>
          <div className="text-sm mt-1 leading-relaxed">
            영업일 1~3일 이내 담당자가 조건에 맞는 매물을 추천하여
            연락드립니다. 추천 매물별 분석보고서도 함께 제공해 드립니다.
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <form action={handleSubmit} className="space-y-5">
      {/* honeypot */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
      />

      {/* 거래 형태 — 핵심 분기 */}
      <div>
        <Label className="text-sm font-medium text-neutral-700 mb-2 block">
          거래 형태 <span className="text-red-600">*</span>
        </Label>
        <RadioGroup
          value={txType}
          onValueChange={(v) => v && setTxType(v as TxType)}
          className="grid grid-cols-3 gap-2"
        >
          {(["매매", "전세", "월세"] as TxType[]).map((t) => {
            const active = txType === t;
            return (
              <label
                key={t}
                htmlFor={`tx-${t}`}
                className={
                  "border rounded-lg p-3 text-center cursor-pointer transition-colors " +
                  (active
                    ? "border-blue-900 bg-blue-50 text-blue-900 ring-1 ring-blue-200"
                    : "border-neutral-200 bg-white text-neutral-700 hover:border-blue-200")
                }
              >
                <RadioGroupItem
                  value={t}
                  id={`tx-${t}`}
                  className="sr-only"
                />
                <div className="font-bold text-sm">{t}</div>
                <div className="text-xs text-neutral-500 mt-0.5">
                  {t === "매매"
                    ? "예산 상·하한"
                    : t === "전세"
                    ? "보증금 상한"
                    : "보증금 + 월세"}
                </div>
              </label>
            );
          })}
        </RadioGroup>
      </div>

      {/* 의뢰인 정보 */}
      <div className="pt-4 border-t">
        <div className="text-sm font-medium text-neutral-700 mb-2">
          1. 의뢰인 정보
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="name" className="text-xs mb-1.5 block">
              이름 / 법인명 <span className="text-red-600">*</span>
            </Label>
            <Input
              id="name"
              name="name"
              required
              maxLength={60}
              placeholder="홍길동 또는 (주)○○"
            />
          </div>
          <div>
            <Label htmlFor="phone" className="text-xs mb-1.5 block">
              전화번호
            </Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              placeholder="010-1234-5678"
              maxLength={40}
            />
          </div>
        </div>
        <div className="mt-3">
          <Label htmlFor="email" className="text-xs mb-1.5 block">
            이메일
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            maxLength={120}
          />
        </div>
        <p className="text-xs text-neutral-500 mt-2">
          ※ 전화번호 또는 이메일 중 하나는 필수입니다.
        </p>
      </div>

      {/* 희망 매물 조건 */}
      <div className="pt-4 border-t">
        <div className="text-sm font-medium text-neutral-700 mb-2">
          2. 희망 매물 조건
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="property_type" className="text-xs mb-1.5 block">
              매물 종류 <span className="text-red-600">*</span>
            </Label>
            <Select
              value={propertyType}
              onValueChange={(v) => v && setPropertyType(v)}
            >
              <SelectTrigger id="property_type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROPERTY_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="region" className="text-xs mb-1.5 block">
              희망 지역 (시군구·동) <span className="text-red-600">*</span>
            </Label>
            <Input
              id="region"
              name="region"
              required
              maxLength={120}
              placeholder="예: 서울 송파구, 강남구 일대"
            />
          </div>
        </div>
        <div className="mt-3">
          <Label htmlFor="area_m2" className="text-xs mb-1.5 block">
            희망 전용면적 (㎡)
          </Label>
          <Input
            id="area_m2"
            name="area_m2"
            type="number"
            step="0.01"
            placeholder="예: 84.95 (생략 가능)"
          />
        </div>
      </div>

      {/* 예산 — 거래 형태별 분기 */}
      <div className="pt-4 border-t">
        <div className="text-sm font-medium text-neutral-700 mb-2">
          3. 예산 ({txType})
        </div>

        {txType === "매매" && (
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="budget_min" className="text-xs mb-1.5 block">
                예산 하한 (원)
              </Label>
              <Input
                id="budget_min"
                name="budget_min"
                type="text"
                inputMode="numeric"
                placeholder="예: 300000000 (3억)"
              />
            </div>
            <div>
              <Label htmlFor="expected_price" className="text-xs mb-1.5 block">
                예산 상한 (원)
              </Label>
              <Input
                id="expected_price"
                name="expected_price"
                type="text"
                inputMode="numeric"
                placeholder="예: 500000000 (5억)"
              />
            </div>
          </div>
        )}

        {txType === "전세" && (
          <div>
            <Label htmlFor="expected_price" className="text-xs mb-1.5 block">
              전세 보증금 상한 (원)
            </Label>
            <Input
              id="expected_price"
              name="expected_price"
              type="text"
              inputMode="numeric"
              placeholder="예: 300000000 (3억)"
            />
            <p className="text-xs text-neutral-500 mt-1">
              ※ 전세가율을 고려해 매매가 ÷ 0.78 이내 매물도 함께 추천드립니다.
            </p>
          </div>
        )}

        {txType === "월세" && (
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="expected_price" className="text-xs mb-1.5 block">
                월세 보증금 (원)
              </Label>
              <Input
                id="expected_price"
                name="expected_price"
                type="text"
                inputMode="numeric"
                placeholder="예: 10000000 (1천만원)"
              />
            </div>
            <div>
              <Label
                htmlFor="monthly_rent_max"
                className="text-xs mb-1.5 block"
              >
                월세 한도 (원/월)
              </Label>
              <Input
                id="monthly_rent_max"
                name="monthly_rent_max"
                type="text"
                inputMode="numeric"
                placeholder="예: 700000 (70만원)"
              />
            </div>
          </div>
        )}

        <p className="text-xs text-neutral-400 mt-2">숫자만 입력 (원 단위)</p>
      </div>

      {/* 상세 요청사항 */}
      <div className="pt-4 border-t">
        <div className="text-sm font-medium text-neutral-700 mb-2">
          4. 상세 요청사항
        </div>
        <Textarea
          id="message"
          name="message"
          required
          rows={6}
          maxLength={2000}
          placeholder={`예시:
- 지하철 역세권 (도보 10분 이내)
- 즉시 입주 가능 매물 우선
- 권리관계 깨끗한 매물 (근저당 없거나 정리 가능)
- 학군: 잠실○○초/중 배정 가능
- 주차: 1대 이상 필수
- 매수 희망 시기: 2~3개월 내`}
        />
        <p className="text-xs text-neutral-500 mt-1">
          희망 입지·층·구조·시기 등을 자유롭게 적어 주세요. (5자 이상)
        </p>
      </div>

      {/* 동의 사항 */}
      <div className="pt-4 border-t space-y-2">
        <div className="flex items-start gap-2">
          <Checkbox id="consent_privacy" name="consent_privacy" required />
          <Label
            htmlFor="consent_privacy"
            className="text-xs leading-relaxed text-neutral-700"
          >
            <span className="text-red-600">*</span> 개인정보 수집·이용에
            동의합니다. (수집 항목: 이름·연락처·매수 조건 / 보유 기간: 1년
            또는 동의 철회 시까지 / 거부 시 의뢰 진행 불가)
          </Label>
        </div>
        <div className="flex items-start gap-2">
          <Checkbox id="consent_marketing" name="consent_marketing" />
          <Label
            htmlFor="consent_marketing"
            className="text-xs leading-relaxed text-neutral-700"
          >
            (선택) 매물 추천·서비스 안내·뉴스레터 수신에 동의합니다.
          </Label>
        </div>
      </div>

      {errorMsg && (
        <Alert variant="destructive">
          <AlertDescription className="text-sm">{errorMsg}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            접수 중…
          </>
        ) : (
          <>
            <Send className="h-4 w-4 mr-1" />
            매수 의뢰 보내기
          </>
        )}
      </Button>
    </form>
  );
}

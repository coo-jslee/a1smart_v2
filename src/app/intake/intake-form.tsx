"use client";

/**
 * 매도 의뢰 폼 (Client Component).
 *
 *  - inquiry_type='sell' 로 submitInquiry Server Action 호출
 *  - 매물 정보: property_type, region, expected_price, area_m2
 *  - 의뢰인: name, phone, email
 *  - 동의: privacy(필수), marketing(선택), 매도위임(동의 내용 안내)
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { submitInquiry } from "../(public-actions)/inquiry-actions";

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

export function IntakeForm() {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [propertyType, setPropertyType] = useState<string>("아파트");

  function handleSubmit(formData: FormData) {
    setErrorMsg(null);
    formData.set("inquiry_type", "sell");
    formData.set("property_type", propertyType);
    formData.set("subject", `매도 의뢰 — ${propertyType}`);
    startTransition(async () => {
      const res = await submitInquiry(formData);
      if (res.ok) {
        toast.success("매도 의뢰가 정상 접수되었습니다.");
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
          <div className="font-medium">매도 의뢰 접수 완료</div>
          <div className="text-sm mt-1 leading-relaxed">
            영업일 1일 이내 담당자가 연락드립니다. AI 자동 분석 및 합의시세
            산출 후 결과를 회원 페이지 또는 이메일로 안내드립니다.
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

      {/* 의뢰인 정보 */}
      <div>
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

      {/* 매물 정보 */}
      <div className="pt-3 border-t">
        <div className="text-sm font-medium text-neutral-700 mb-2">
          2. 매물 정보
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
              소재지 (시군구·동) <span className="text-red-600">*</span>
            </Label>
            <Input
              id="region"
              name="region"
              required
              maxLength={120}
              placeholder="예: 서울 송파구 거여동"
            />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4 mt-3">
          <div>
            <Label htmlFor="area_m2" className="text-xs mb-1.5 block">
              전용면적 (㎡)
            </Label>
            <Input
              id="area_m2"
              name="area_m2"
              type="number"
              step="0.01"
              placeholder="예: 84.95"
            />
          </div>
          <div>
            <Label htmlFor="expected_price" className="text-xs mb-1.5 block">
              희망 매매가 (원)
            </Label>
            <Input
              id="expected_price"
              name="expected_price"
              type="text"
              inputMode="numeric"
              placeholder="예: 500000000 (5억)"
            />
            <p className="text-xs text-neutral-400 mt-1">숫자만 입력 (원 단위)</p>
          </div>
        </div>
      </div>

      {/* 상세 내용 */}
      <div className="pt-3 border-t">
        <div className="text-sm font-medium text-neutral-700 mb-2">
          3. 매물 상세 / 요청사항
        </div>
        <Textarea
          id="message"
          name="message"
          required
          rows={6}
          maxLength={2000}
          placeholder={`예시:
- 5층 건물 중 3층 사무실
- 임대차 계약 만료일 2026-12-31
- 권리관계: 근저당 1.5억 (○○은행)
- 특이사항: 엘리베이터 있음, 주차 1대
- 매도 희망 시기: 6개월 내`}
        />
        <p className="text-xs text-neutral-500 mt-1">
          매물 특성·권리관계·희망 거래 시기를 자유롭게 적어 주세요. (5자 이상)
        </p>
      </div>

      {/* 동의 사항 */}
      <div className="pt-3 border-t space-y-2">
        <div className="flex items-start gap-2">
          <Checkbox id="consent_privacy" name="consent_privacy" required />
          <Label
            htmlFor="consent_privacy"
            className="text-xs leading-relaxed text-neutral-700"
          >
            <span className="text-red-600">*</span> 개인정보 수집·이용에
            동의합니다. (수집 항목: 이름·연락처·매물 정보 / 보유 기간: 1년 또는
            동의 철회 시까지 / 거부 시 의뢰 진행 불가)
          </Label>
        </div>
        <div className="flex items-start gap-2">
          <Checkbox id="consent_marketing" name="consent_marketing" />
          <Label
            htmlFor="consent_marketing"
            className="text-xs leading-relaxed text-neutral-700"
          >
            (선택) 매물 및 서비스 안내·뉴스레터 수신에 동의합니다.
          </Label>
        </div>
        <p className="text-xs text-neutral-400 leading-relaxed pl-6 pt-1">
          ※ 등기부등본 등 공부 자동 발급은 별도 매도위임 동의 후 진행됩니다.
          (관련 법규 준수)
        </p>
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
            매도 의뢰 보내기
          </>
        )}
      </Button>
    </form>
  );
}

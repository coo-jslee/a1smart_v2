"use client";

/**
 * 일반 문의 폼 (Client Component).
 *
 *  - submitInquiry Server Action 호출
 *  - 성공 시 폼 리셋 + 성공 메시지 표시
 *  - 실패 시 토스트 + Alert
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

export function ContactForm() {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [subjectType, setSubjectType] = useState<
    "매물 문의" | "분석보고서 문의" | "기타 일반 문의"
  >("매물 문의");

  function handleSubmit(formData: FormData) {
    setErrorMsg(null);
    // subject 는 select 값 직접 주입
    formData.set("subject", subjectType);
    formData.set("inquiry_type", "contact");
    startTransition(async () => {
      const res = await submitInquiry(formData);
      if (res.ok) {
        toast.success("문의가 정상 접수되었습니다.");
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
          <div className="font-medium">문의 접수 완료</div>
          <div className="text-sm mt-1">
            담당자가 확인 후 영업일 24시간 이내 답변 드립니다. 추가 문의는
            전화로도 가능합니다.
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      {/* honeypot */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
      />

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name" className="text-xs mb-1.5 block">
            이름 <span className="text-red-600">*</span>
          </Label>
          <Input id="name" name="name" required maxLength={60} placeholder="홍길동" />
        </div>
        <div>
          <Label htmlFor="subject" className="text-xs mb-1.5 block">
            문의 유형 <span className="text-red-600">*</span>
          </Label>
          <Select
            value={subjectType}
            onValueChange={(v) =>
              v && setSubjectType(v as typeof subjectType)
            }
          >
            <SelectTrigger id="subject">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="매물 문의">매물 문의</SelectItem>
              <SelectItem value="분석보고서 문의">분석보고서 문의</SelectItem>
              <SelectItem value="기타 일반 문의">기타 일반 문의</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
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
        <div>
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
      </div>
      <p className="text-xs text-neutral-500 -mt-2">
        ※ 전화번호 또는 이메일 중 하나는 필수입니다.
      </p>

      <div>
        <Label htmlFor="message" className="text-xs mb-1.5 block">
          문의 내용 <span className="text-red-600">*</span>
        </Label>
        <Textarea
          id="message"
          name="message"
          required
          rows={6}
          placeholder="문의하실 내용을 자세히 작성해 주세요. (5자 이상)"
          maxLength={2000}
        />
      </div>

      <div className="space-y-2 pt-2 border-t">
        <div className="flex items-start gap-2">
          <Checkbox id="consent_privacy" name="consent_privacy" required />
          <Label
            htmlFor="consent_privacy"
            className="text-xs leading-relaxed text-neutral-700"
          >
            <span className="text-red-600">*</span> 개인정보 수집·이용에
            동의합니다. (수집 항목: 이름·연락처·문의 내용 / 보유 기간: 1년 또는
            동의 철회 시까지)
          </Label>
        </div>
        <div className="flex items-start gap-2">
          <Checkbox id="consent_marketing" name="consent_marketing" />
          <Label
            htmlFor="consent_marketing"
            className="text-xs leading-relaxed text-neutral-700"
          >
            (선택) 매물·서비스 안내를 받습니다.
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
            문의 보내기
          </>
        )}
      </Button>
    </form>
  );
}

"use client";

/**
 * 의뢰 상세 다이얼로그 (Client Component).
 *
 *  - URL ?detail=<id> 기반 — 새로고침해도 다이얼로그 유지
 *  - 닫기: closeHref 로 이동
 *  - 액션:
 *      [상태 변경] 4개 버튼 (new / reviewing / replied / closed)
 *      [내부 메모 저장] reply_note textarea
 *  - 서버 액션 updateInquiry 호출 → revalidatePath 로 일람 자동 새로고침
 */
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Mail,
  Phone,
  User,
  MapPin,
  Calendar,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { updateInquiry } from "./actions";
import type { Tables } from "@/lib/supabase/types";

type Inquiry = Tables<"inquiries">;

const STATUS_FLOW: {
  value: "new" | "reviewing" | "replied" | "closed";
  label: string;
  color: string;
}[] = [
  { value: "new", label: "신규", color: "bg-red-100 text-red-700 border-red-200" },
  { value: "reviewing", label: "검토중", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { value: "replied", label: "답변완료", color: "bg-green-100 text-green-700 border-green-200" },
  { value: "closed", label: "종료", color: "bg-neutral-200 text-neutral-600 border-neutral-300" },
];

const TYPE_LABELS: Record<string, string> = {
  contact: "일반 문의",
  sell: "매도 의뢰",
  buy: "매수 의뢰",
  property: "매물 문의",
};

function won(n: number | null | undefined): string {
  if (!n) return "—";
  if (n >= 1e8) return `${(n / 1e8).toFixed(2)}억원`;
  if (n >= 1e4) return `${(n / 1e4).toFixed(0)}만원`;
  return `${n.toLocaleString()}원`;
}

function formatDate(s: string | null | undefined): string {
  if (!s) return "—";
  return new Date(s).toLocaleString("ko-KR");
}

export function InquiryDetailDialog({
  inquiry,
  closeHref,
}: {
  inquiry: Inquiry;
  closeHref: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [replyNote, setReplyNote] = useState<string>(inquiry.reply_note ?? "");

  function close() {
    router.push(closeHref);
  }

  function setStatus(next: typeof STATUS_FLOW[number]["value"]) {
    const fd = new FormData();
    fd.set("id", String(inquiry.id));
    fd.set("status", next);
    // reply_note는 따로 변경하지 않음
    startTransition(async () => {
      const res = await updateInquiry(fd);
      if (res.ok) {
        toast.success(
          `상태 변경: ${STATUS_FLOW.find((s) => s.value === next)?.label}`,
        );
      } else {
        toast.error(res.error);
      }
    });
  }

  function saveNote() {
    const fd = new FormData();
    fd.set("id", String(inquiry.id));
    fd.set("reply_note", replyNote);
    startTransition(async () => {
      const res = await updateInquiry(fd);
      if (res.ok) {
        toast.success("내부 메모 저장 완료");
      } else {
        toast.error(res.error);
      }
    });
  }

  const isBuy = inquiry.inquiry_type === "buy";

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle className="text-lg">
              #{inquiry.id} · {TYPE_LABELS[inquiry.inquiry_type] ?? inquiry.inquiry_type}
              {isBuy && inquiry.transaction_type && (
                <span className="ml-2 text-sm text-neutral-500">
                  ({inquiry.transaction_type})
                </span>
              )}
            </DialogTitle>
          </div>
          <DialogDescription>
            <span className="text-xs">
              접수 {formatDate(inquiry.created_at)}
              {inquiry.replied_at && (
                <span className="ml-2 text-green-700">
                  · 답변 {formatDate(inquiry.replied_at)}
                </span>
              )}
            </span>
          </DialogDescription>
        </DialogHeader>

        {/* 의뢰인 정보 */}
        <section className="space-y-2 border rounded p-3 bg-neutral-50/50">
          <div className="text-xs font-semibold text-neutral-500 uppercase">
            의뢰인 정보
          </div>
          <Row icon={User} label="이름">
            {inquiry.name}
          </Row>
          {inquiry.phone && (
            <Row icon={Phone} label="전화">
              <a
                href={`tel:${inquiry.phone}`}
                className="text-blue-700 hover:underline"
              >
                {inquiry.phone}
              </a>
            </Row>
          )}
          {inquiry.email && (
            <Row icon={Mail} label="이메일">
              <a
                href={`mailto:${inquiry.email}`}
                className="text-blue-700 hover:underline"
              >
                {inquiry.email}
              </a>
            </Row>
          )}
          {inquiry.user_id && (
            <Row icon={User} label="회원 ID">
              <span className="font-mono text-xs">{inquiry.user_id}</span>
            </Row>
          )}
        </section>

        {/* 매물 조건 */}
        <section className="space-y-2 border rounded p-3 bg-neutral-50/50">
          <div className="text-xs font-semibold text-neutral-500 uppercase">
            매물 조건
          </div>
          {inquiry.property_type && (
            <Row label="종류">{inquiry.property_type}</Row>
          )}
          {inquiry.region && (
            <Row icon={MapPin} label={isBuy ? "희망 지역" : "소재지"}>
              {inquiry.region}
            </Row>
          )}
          {inquiry.area_m2 && (
            <Row label="면적">
              {Number(inquiry.area_m2).toFixed(2)}㎡
              <span className="text-neutral-400 ml-1">
                ({(Number(inquiry.area_m2) / 3.305).toFixed(1)}평)
              </span>
            </Row>
          )}
          {inquiry.asr_code && (
            <Row label="관련 매물">
              <a
                href={`/admin/properties/${inquiry.asr_code}`}
                className="text-blue-700 hover:underline font-mono text-xs"
              >
                {inquiry.asr_code}
              </a>
            </Row>
          )}
        </section>

        {/* 예산 */}
        {(inquiry.expected_price || inquiry.budget_min || inquiry.monthly_rent_max) && (
          <section className="space-y-2 border rounded p-3 bg-blue-50/40">
            <div className="text-xs font-semibold text-neutral-500 uppercase">
              예산
            </div>
            {isBuy && inquiry.transaction_type === "월세" ? (
              <>
                <Row label="보증금">{won(inquiry.expected_price)}</Row>
                <Row label="월세 한도">{won(inquiry.monthly_rent_max)}</Row>
              </>
            ) : isBuy && inquiry.transaction_type === "매매" ? (
              <Row label="예산">
                {won(inquiry.budget_min)} ~ {won(inquiry.expected_price)}
              </Row>
            ) : isBuy && inquiry.transaction_type === "전세" ? (
              <Row label="보증금 상한">{won(inquiry.expected_price)}</Row>
            ) : (
              <Row label="희망가">{won(inquiry.expected_price)}</Row>
            )}
          </section>
        )}

        {/* 메시지 */}
        <section className="space-y-2 border rounded p-3">
          <div className="text-xs font-semibold text-neutral-500 uppercase">
            메시지 / 상세 요청
          </div>
          {inquiry.subject && (
            <div className="text-sm font-medium text-neutral-800">
              {inquiry.subject}
            </div>
          )}
          <pre className="text-sm whitespace-pre-wrap font-sans text-neutral-700 leading-relaxed">
            {inquiry.message}
          </pre>
          <div className="text-xs text-neutral-400 pt-2 border-t mt-2 flex gap-3">
            <span>
              개인정보 동의 {inquiry.consent_privacy ? "✓" : "✗"}
            </span>
            <span>
              마케팅 동의 {inquiry.consent_marketing ? "✓" : "✗"}
            </span>
          </div>
        </section>

        {/* 상태 변경 */}
        <section className="space-y-2 border rounded p-3">
          <div className="text-xs font-semibold text-neutral-500 uppercase">
            상태 변경
          </div>
          <div className="flex flex-wrap gap-2">
            {STATUS_FLOW.map((s) => {
              const active = inquiry.status === s.value;
              return (
                <Button
                  key={s.value}
                  type="button"
                  size="sm"
                  variant={active ? "default" : "outline"}
                  disabled={pending || active}
                  onClick={() => setStatus(s.value)}
                  className={
                    active
                      ? ""
                      : "border " + s.color
                  }
                >
                  {pending && (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  )}
                  {s.label}
                </Button>
              );
            })}
          </div>
          {inquiry.status === "new" && (
            <Alert className="border-red-200 bg-red-50 mt-2">
              <AlertCircle className="h-4 w-4 text-red-700" />
              <AlertDescription className="text-xs text-red-900">
                아직 미처리 신규 의뢰입니다. 검토 시작 시 "검토중"으로 전환해 주세요.
              </AlertDescription>
            </Alert>
          )}
          {inquiry.status === "replied" && inquiry.replied_at && (
            <Alert className="border-green-200 bg-green-50 mt-2">
              <CheckCircle2 className="h-4 w-4 text-green-700" />
              <AlertDescription className="text-xs text-green-900">
                답변 완료 — {formatDate(inquiry.replied_at)}
              </AlertDescription>
            </Alert>
          )}
        </section>

        {/* 내부 메모 */}
        <section className="space-y-2 border rounded p-3">
          <div className="text-xs font-semibold text-neutral-500 uppercase">
            내부 메모 (담당자 전용)
          </div>
          <Textarea
            value={replyNote}
            onChange={(e) => setReplyNote(e.target.value)}
            rows={4}
            maxLength={2000}
            placeholder="처리 결과, 통화 내역, 다음 액션 등을 적어 주세요. (의뢰자에게 보이지 않음)"
            disabled={pending}
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={saveNote}
              disabled={pending || replyNote === (inquiry.reply_note ?? "")}
            >
              {pending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
              메모 저장
            </Button>
          </div>
        </section>

        <DialogFooter>
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <Calendar className="h-3 w-3" />
            User-Agent: {inquiry.user_agent?.slice(0, 60) ?? "—"}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <div className="w-24 text-neutral-500 flex items-center gap-1 flex-shrink-0">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </div>
      <div className="flex-1 text-neutral-800 break-all">{children}</div>
    </div>
  );
}

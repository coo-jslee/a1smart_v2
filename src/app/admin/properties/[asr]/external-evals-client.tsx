"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type ExternalEvaluation = {
  id: string;
  source: string;
  value: number;
  weight: number;
  is_appraisal: boolean;
  notes: string | null;
  created_at: string;
  created_by: string | null;
};

const SOURCES = [
  "감정평가서",
  "집품 AI",
  "KB시세",
  "디스코",
  "직접견적",
  "기타",
];

function won(n: number): string {
  if (!n) return "—";
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(2)}억`;
  return n.toLocaleString();
}

export function ExternalEvalsCard({
  asrCode,
  initialEvals,
}: {
  asrCode: string;
  initialEvals: ExternalEvaluation[];
}) {
  const router = useRouter();
  const [evals, setEvals] = useState<ExternalEvaluation[]>(initialEvals);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // form state
  const [source, setSource] = useState("감정평가서");
  const [valueEok, setValueEok] = useState(""); // 입력은 억 단위
  const [weight, setWeight] = useState("0.7");
  const [isAppraisal, setIsAppraisal] = useState(true);
  const [notes, setNotes] = useState("");

  async function submit() {
    const eok = parseFloat(valueEok);
    if (!Number.isFinite(eok) || eok <= 0) {
      toast.error("평가액 (억) 은 양의 숫자여야 합니다.");
      return;
    }
    const w = parseFloat(weight);
    if (!Number.isFinite(w) || w < 0.1 || w > 1.0) {
      toast.error("가중치는 0.1 ~ 1.0 사이여야 합니다.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/properties/${encodeURIComponent(asrCode)}/external-evals`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source,
            value: Math.round(eok * 100_000_000),
            weight: w,
            is_appraisal: isAppraisal,
            notes: notes.trim() || null,
          }),
        },
      );
      const json = await res.json();
      if (!res.ok) {
        toast.error("추가 실패: " + (json?.error ?? "Unknown"));
        return;
      }
      setEvals(json.evals);
      toast.success(`${source} 평가 추가됨 (${won(Math.round(eok * 100_000_000))})`);
      setOpen(false);
      // 초기화
      setValueEok("");
      setNotes("");
      router.refresh();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("네트워크 오류: " + msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("이 외부 평가값을 삭제하시겠습니까?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(
        `/api/properties/${encodeURIComponent(asrCode)}/external-evals?id=${id}`,
        { method: "DELETE" },
      );
      const json = await res.json();
      if (!res.ok) {
        toast.error("삭제 실패: " + (json?.error ?? "Unknown"));
        return;
      }
      setEvals(json.evals);
      toast.success("삭제됨");
      router.refresh();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("네트워크 오류: " + msg);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-neutral-500">
          현재 {evals.length}건 등록.
          {evals.length > 0 && " 시세 갱신 실행 시 자동으로 합의시세에 반영됩니다."}
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          외부 평가 추가
        </Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>외부 평가값 추가</DialogTitle>
              <DialogDescription>
                감정평가서·집품·KB·중개사 직접 견적 등을 입력하면 시세 갱신 시
                합의시세에 가중평균으로 반영됩니다.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="source">출처</Label>
                <Select value={source} onValueChange={(v) => v && setSource(v)}>
                  <SelectTrigger id="source">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SOURCES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="value">평가액 (억원)</Label>
                <Input
                  id="value"
                  type="number"
                  step="0.01"
                  placeholder="예: 54.0"
                  value={valueEok}
                  onChange={(e) => setValueEok(e.target.value)}
                />
                {valueEok && (
                  <p className="text-xs text-neutral-500">
                    = {Math.round(parseFloat(valueEok) * 100_000_000).toLocaleString()}원
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight">
                  가중치 (0.1 ~ 1.0, 일반적으로 0.5~0.7)
                </Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.05"
                  min="0.1"
                  max="1.0"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                />
                <p className="text-xs text-neutral-500">
                  감정평가서: 0.70 / 집품·KB: 0.50 / 직접견적: 0.60 권장
                </p>
              </div>
              <div className="flex items-start gap-2">
                <Checkbox
                  id="is_appraisal"
                  checked={isAppraisal}
                  onCheckedChange={(v) => setIsAppraisal(!!v)}
                />
                <div>
                  <Label htmlFor="is_appraisal" className="cursor-pointer">
                    감정가 → 시세 환산 (×0.85 적용)
                  </Label>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    법원 감정가는 보통 시세의 ~85% 수준이라 환산이 필요.
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">메모 (선택)</Label>
                <Textarea
                  id="notes"
                  placeholder="예: 법원감정 2025-08 ○○평가법인, 토지 38억 + 건물 16억"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
                취소
              </Button>
              <Button onClick={submit} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    추가 중…
                  </>
                ) : (
                  "추가"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {evals.length === 0 ? (
        <div className="text-sm text-neutral-400 border border-dashed rounded p-4 text-center">
          등록된 외부 평가값이 없습니다.
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-xs text-neutral-500">
              <th className="text-left py-2">출처</th>
              <th className="text-right py-2">평가액</th>
              <th className="text-right py-2 w-16">가중치</th>
              <th className="text-center py-2 w-16">감정가</th>
              <th className="text-left py-2 pl-3">메모</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {evals.map((e) => (
              <tr key={e.id} className="border-b border-neutral-100">
                <td className="py-2 font-medium">{e.source}</td>
                <td className="py-2 text-right">{won(e.value)}</td>
                <td className="py-2 text-right">{e.weight.toFixed(2)}</td>
                <td className="py-2 text-center">{e.is_appraisal ? "✓" : "—"}</td>
                <td className="py-2 pl-3 text-xs text-neutral-500">
                  {e.notes ?? ""}
                </td>
                <td className="py-2 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(e.id)}
                    disabled={deletingId === e.id}
                    className="h-7 w-7 p-0"
                  >
                    {deletingId === e.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    )}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

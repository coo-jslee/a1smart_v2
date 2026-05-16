"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle, RefreshCw } from "lucide-react";

type StepLog = { step: string; ok: boolean; detail?: string; ms?: number };
type ConsensusComponent = { method: string; value: number; weight: number; 근거: string };
type Consensus = {
  normal_price: number;
  final_price: number;
  distress_discount: number;
  weight_sum: number;
  components: ConsensusComponent[];
};

type ApiResult = {
  ok: boolean;
  asrCode?: string;
  consensus?: Consensus;
  tradeCount?: number;
  neighborhoodUnit?: number | null;
  distressSeverity?: number;
  totalMs?: number;
  steps?: StepLog[];
  error?: string;
};

export function PriceRefreshButton({ asrCode }: { asrCode: string }) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ApiResult | null>(null);

  async function handleClick() {
    setRunning(true);
    setResult(null);
    try {
      const res = await fetch(
        `/api/pipeline/price?asr=${encodeURIComponent(asrCode)}`,
        { method: "POST" },
      );
      const json = (await res.json()) as ApiResult;
      setResult(json);
      if (json.ok) {
        toast.success(
          `시세 갱신 완료. 합의시세 ${won(json.consensus?.final_price ?? 0)}`,
        );
        // 0.8s 후 새로고침해서 server-side 최신 데이터 로드
        setTimeout(() => window.location.reload(), 800);
      } else {
        toast.error("시세 갱신 실패: " + (json.error ?? "Unknown"));
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("네트워크 오류: " + msg);
      setResult({ ok: false, error: msg });
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <Button onClick={handleClick} disabled={running} size="lg">
          {running ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              시세 갱신 중…
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              시세 갱신 시작
            </>
          )}
        </Button>
        {result?.totalMs && (
          <div className="self-center text-xs text-neutral-500">
            전체 소요: {result.totalMs}ms
          </div>
        )}
      </div>

      {result?.steps && result.steps.length > 0 && (
        <div className="border rounded p-3 space-y-1.5 text-sm">
          {result.steps.map((s, i) => (
            <div key={i} className="flex items-start gap-2">
              {s.ok ? (
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1">
                <div className="font-medium">{s.step}</div>
                {s.detail && (
                  <div className="text-xs text-neutral-500">{s.detail}</div>
                )}
              </div>
              {s.ms !== undefined && (
                <div className="text-xs text-neutral-400">{s.ms}ms</div>
              )}
            </div>
          ))}
        </div>
      )}

      {result?.error && (
        <Alert variant="destructive">
          <AlertDescription>{result.error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}

function won(n: number): string {
  if (!n) return "—";
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(2)}억`;
  return n.toLocaleString();
}

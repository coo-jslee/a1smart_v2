"use client";

/**
 * 분석보고서 생성 카드 (M6 클라이언트).
 *
 *  - 버전 선택 (외부용/내부용)
 *  - 생성 버튼 → POST /api/pipeline/report
 *  - 진행 스텝 표시 + 결과 signed URL 다운로드 링크
 *  - 기존 보고서 목록 (attachment_paths) + 개별 signed URL 발급
 */
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  FileText,
  Download,
  Loader2,
  Sparkles,
  Trash2,
} from "lucide-react";

type StepLog = { step: string; ok: boolean; detail?: string; ms?: number };

type ApiResult = {
  ok: boolean;
  asrCode?: string;
  version?: "investor" | "full";
  storage_path?: string;
  signed_url?: string | null;
  size_bytes?: number;
  attachment_paths?: string[];
  consensus_price?: number;
  tax_total?: number;
  opinion_source?: "claude" | "template";
  totalMs?: number;
  steps?: StepLog[];
  error?: string;
};

export function ReportGenerateCard({
  asrCode,
  initialAttachments,
}: {
  asrCode: string;
  initialAttachments: string[];
}) {
  const [version, setVersion] = useState<"investor" | "full">("investor");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ApiResult | null>(null);
  const [attachments, setAttachments] = useState<string[]>(initialAttachments);
  const [deletingPath, setDeletingPath] = useState<string | null>(null);
  const [, startRefresh] = useTransition();

  async function handleGenerate() {
    setRunning(true);
    setResult(null);
    try {
      const url = `/api/pipeline/report?asr=${encodeURIComponent(asrCode)}&version=${version}`;
      const res = await fetch(url, { method: "POST" });
      const json = (await res.json()) as ApiResult;
      setResult(json);
      if (json.ok) {
        toast.success(
          `${version === "investor" ? "외부용" : "내부용"} 분석보고서 생성 완료 (${json.size_bytes ? Math.round(json.size_bytes / 1024) : "?"}KB)`,
        );
        if (json.attachment_paths) setAttachments(json.attachment_paths);
        // 페이지 다른 영역(워크플로우 단계 표시 등)도 새로고침
        startRefresh(() => {
          setTimeout(() => window.location.reload(), 1200);
        });
      } else {
        toast.error("분석보고서 생성 실패: " + (json.error ?? "Unknown"));
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("네트워크 오류: " + msg);
      setResult({ ok: false, error: msg });
    } finally {
      setRunning(false);
    }
  }

  async function handleDownload(storagePath: string) {
    try {
      const res = await fetch(
        `/api/properties/${encodeURIComponent(asrCode)}/report-download?path=${encodeURIComponent(storagePath)}`,
        { method: "POST" },
      );
      const json = (await res.json()) as { ok: boolean; signed_url?: string; error?: string };
      if (!json.ok || !json.signed_url) {
        toast.error("다운로드 링크 발급 실패: " + (json.error ?? "Unknown"));
        return;
      }
      window.open(json.signed_url, "_blank", "noopener");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("네트워크 오류: " + msg);
    }
  }

  async function handleDelete(storagePath: string) {
    const filename = storagePath.split("/").pop() ?? storagePath;
    if (
      !window.confirm(
        `이 분석보고서를 영구 삭제합니다.\n\n${filename}\n\nStorage 파일과 매물 첨부 기록이 모두 제거됩니다. 계속하시겠습니까?`,
      )
    ) {
      return;
    }
    setDeletingPath(storagePath);
    try {
      const res = await fetch(
        `/api/properties/${encodeURIComponent(asrCode)}/report-delete?path=${encodeURIComponent(storagePath)}`,
        { method: "POST" },
      );
      const json = (await res.json()) as {
        ok: boolean;
        attachment_paths?: string[];
        error?: string;
      };
      if (!json.ok) {
        toast.error("삭제 실패: " + (json.error ?? "Unknown"));
        return;
      }
      toast.success("보고서를 삭제했습니다.");
      setAttachments(json.attachment_paths ?? []);
      // 만약 방금 생성한 보고서를 바로 삭제했다면 result도 비우기
      if (result?.storage_path === storagePath) setResult(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("네트워크 오류: " + msg);
    } finally {
      setDeletingPath(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-neutral-600">배포 버전</span>
          <Select
            value={version}
            onValueChange={(v) => setVersion(v as "investor" | "full")}
            disabled={running}
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="investor">외부용 (투자자 배포)</SelectItem>
              <SelectItem value="full">내부용 (중개사 검토)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleGenerate} disabled={running} size="lg">
          {running ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              생성 중…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              분석보고서 생성
            </>
          )}
        </Button>
        {result?.totalMs && (
          <div className="self-center text-xs text-neutral-500">
            전체 소요: {result.totalMs}ms · 의견 소스: {result.opinion_source}
          </div>
        )}
      </div>

      {result?.signed_url && (
        <Alert>
          <AlertDescription className="flex items-center justify-between gap-3 text-sm">
            <div>
              방금 생성된 보고서 (1시간 유효):{" "}
              <span className="font-mono text-xs text-neutral-600">
                {result.storage_path}
              </span>
            </div>
            <a
              href={result.signed_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-blue-700 hover:underline whitespace-nowrap"
            >
              <Download className="h-4 w-4" /> 다운로드
            </a>
          </AlertDescription>
        </Alert>
      )}

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
                  <div className="text-xs text-neutral-500 break-all">
                    {s.detail}
                  </div>
                )}
              </div>
              {s.ms !== undefined && (
                <div className="text-xs text-neutral-400">{s.ms}ms</div>
              )}
            </div>
          ))}
        </div>
      )}

      {result?.error && !result.signed_url && (
        <Alert variant="destructive">
          <AlertDescription>{result.error}</AlertDescription>
        </Alert>
      )}

      <div>
        <div className="text-sm font-medium mb-2 flex items-center gap-2">
          <FileText className="h-4 w-4" />
          저장된 보고서 ({attachments.length}개)
          <span className="text-xs text-neutral-500 font-normal ml-1">
            · 재생성 시 같은 버전(외부용/내부용)의 기존 파일은 자동 삭제됩니다
          </span>
        </div>
        {attachments.length === 0 ? (
          <div className="text-sm text-neutral-500 italic">
            아직 생성된 보고서가 없습니다.
          </div>
        ) : (
          <ul className="space-y-1 text-sm">
            {attachments.map((p) => {
              const isDeleting = deletingPath === p;
              return (
                <li
                  key={p}
                  className={
                    "flex items-center justify-between gap-3 p-2 rounded border " +
                    (isDeleting
                      ? "bg-red-50 border-red-200 opacity-60"
                      : "bg-neutral-50")
                  }
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-xs text-neutral-700 truncate">
                      {p}
                    </div>
                    <div className="text-xs text-neutral-500">
                      {parseBadges(p)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 whitespace-nowrap">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownload(p)}
                      disabled={isDeleting}
                    >
                      <Download className="h-3 w-3 mr-1" />
                      다운로드
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(p)}
                      disabled={isDeleting}
                      className="text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
                    >
                      {isDeleting ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3 mr-1" />
                      )}
                      삭제
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function parseBadges(path: string): string {
  // {YYYY-MM}/{ASR}/{version}_{timestamp}.docx
  const parts = path.split("/");
  const filename = parts[parts.length - 1] ?? path;
  const isInvestor = filename.startsWith("investor_");
  const isFull = filename.startsWith("full_");
  const m = filename.match(/(\d{14})/);
  let ts = "";
  if (m) {
    const s = m[1];
    ts = `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)} ${s.slice(8, 10)}:${s.slice(10, 12)}`;
  }
  return [
    isInvestor ? "외부용" : isFull ? "내부용" : "—",
    ts,
  ]
    .filter(Boolean)
    .join("  ·  ");
}

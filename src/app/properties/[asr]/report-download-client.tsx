"use client";

/**
 * 공개 매물 상세에서 회원이 외부용 분석보고서를 다운로드하는 컴포넌트.
 *
 *  - 기존 /api/properties/[asr]/report-download endpoint 재사용
 *  - 다운로드 버튼만 노출 (관리자 페이지의 삭제 기능은 없음)
 */
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Download, Loader2, FileText } from "lucide-react";

export function ReportDownloadList({
  asrCode,
  paths,
}: {
  asrCode: string;
  paths: string[];
}) {
  const [pending, setPending] = useState<string | null>(null);

  async function handleDownload(path: string) {
    setPending(path);
    try {
      const res = await fetch(
        `/api/properties/${encodeURIComponent(asrCode)}/report-download?path=${encodeURIComponent(path)}`,
        { method: "POST" },
      );
      const json = (await res.json()) as {
        ok?: boolean;
        signed_url?: string;
        error?: string;
      };
      if (!json.ok || !json.signed_url) {
        toast.error("다운로드 링크 발급 실패: " + (json.error ?? "Unknown"));
        return;
      }
      window.open(json.signed_url, "_blank", "noopener");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("네트워크 오류: " + msg);
    } finally {
      setPending(null);
    }
  }

  return (
    <ul className="space-y-1.5 text-sm">
      {paths.map((p) => {
        const filename = p.split("/").pop() ?? p;
        const m = filename.match(/(\d{14})/);
        const ts = m
          ? `${m[1].slice(0, 4)}-${m[1].slice(4, 6)}-${m[1].slice(6, 8)}`
          : "";
        const isPending = pending === p;
        return (
          <li
            key={p}
            className="flex items-center justify-between gap-3 p-3 rounded border bg-neutral-50"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <FileText className="h-5 w-5 text-blue-900 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-neutral-900 truncate">
                  외부용 분석보고서 (DOCX)
                </div>
                <div className="text-xs text-neutral-500">{ts}</div>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => handleDownload(p)}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <Download className="h-3 w-3 mr-1" />
              )}
              다운로드
            </Button>
          </li>
        );
      })}
    </ul>
  );
}

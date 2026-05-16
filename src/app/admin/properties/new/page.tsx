"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  GONGBU_LABELS,
  GONGBU_ORDER,
  MAX_IMAGES,
  MAX_PDF_BYTES,
  MAX_IMAGE_BYTES,
  humanFileSize,
  type GongbuType,
  type FileSlotType,
} from "@/lib/uploads";
import { Upload, CheckCircle2, XCircle, Loader2 } from "lucide-react";

type GongbuSlot = {
  enabled: boolean;
  file: File | null;
  status: "idle" | "uploading" | "done" | "error";
  message?: string;
};

type ImageSlot = {
  file: File | null;
  status: "idle" | "uploading" | "done" | "error";
  message?: string;
};

const INITIAL_GONGBU: Record<GongbuType, GongbuSlot> = GONGBU_ORDER.reduce(
  (acc, t) => ({
    ...acc,
    [t]: {
      enabled: t === "deungki" || t === "toji" || t === "geonchuk", // 권장 3종 기본 활성
      file: null,
      status: "idle",
    },
  }),
  {} as Record<GongbuType, GongbuSlot>,
);

const INITIAL_IMAGES: ImageSlot[] = Array.from({ length: MAX_IMAGES }, () => ({
  file: null,
  status: "idle",
}));

type AnalyzeStep = { step: string; ok: boolean; detail?: string; ms?: number };

export default function NewPropertyPage() {
  const [mode, setMode] = useState<"manual" | "auto">("manual");
  const [gongbu, setGongbu] =
    useState<Record<GongbuType, GongbuSlot>>(INITIAL_GONGBU);
  const [images, setImages] = useState<ImageSlot[]>(INITIAL_IMAGES);
  const [submitting, setSubmitting] = useState(false);
  const [uploadDone, setUploadDone] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeSteps, setAnalyzeSteps] = useState<AnalyzeStep[]>([]);
  const [analyzeResult, setAnalyzeResult] = useState<{
    asrCode?: string;
    pnu?: string;
    error?: string;
  } | null>(null);

  function updateGongbu(t: GongbuType, patch: Partial<GongbuSlot>) {
    setGongbu((prev) => ({ ...prev, [t]: { ...prev[t], ...patch } }));
  }

  function updateImage(idx: number, patch: Partial<ImageSlot>) {
    setImages((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
    );
  }

  async function uploadOne(file: File, type: FileSlotType) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("file_type", type);

    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const json = await res.json();

    if (!res.ok) {
      throw new Error(json?.error ?? "Unknown upload error");
    }

    return json as {
      uploadId: string;
      storagePath: string;
      bucket: string;
      fileType: FileSlotType;
    };
  }

  async function handleSubmit() {
    // 검증
    const enabledGongbu = GONGBU_ORDER.filter((t) => gongbu[t].enabled);
    if (enabledGongbu.length === 0) {
      toast.error("최소 1개의 공부 종류를 선택해주세요.");
      return;
    }
    const missingFiles = enabledGongbu.filter((t) => !gongbu[t].file);
    if (missingFiles.length > 0) {
      toast.error(
        "선택한 공부에 파일을 모두 첨부해주세요: " +
          missingFiles.map((t) => GONGBU_LABELS[t]).join(", "),
      );
      return;
    }

    setSubmitting(true);

    try {
      // 공부 PDF 업로드 (순차)
      for (const t of enabledGongbu) {
        const slot = gongbu[t];
        if (!slot.file) continue;
        updateGongbu(t, { status: "uploading" });
        try {
          await uploadOne(slot.file, t);
          updateGongbu(t, { status: "done" });
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          updateGongbu(t, { status: "error", message: msg });
          throw e;
        }
      }

      // 이미지 업로드 (순차)
      for (let i = 0; i < images.length; i++) {
        const slot = images[i];
        if (!slot.file) continue;
        updateImage(i, { status: "uploading" });
        try {
          await uploadOne(slot.file, "image");
          updateImage(i, { status: "done" });
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          updateImage(i, { status: "error", message: msg });
          throw e;
        }
      }

      toast.success("업로드 완료! 아래 [분석 시작] 버튼을 눌러 단계 4 분석을 실행하세요.");
      setUploadDone(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("업로드 실패: " + msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAnalyze() {
    setAnalyzing(true);
    setAnalyzeSteps([]);
    setAnalyzeResult(null);

    try {
      const res = await fetch("/api/pipeline/extract", { method: "POST" });
      const json = await res.json();

      if (json.steps) setAnalyzeSteps(json.steps as AnalyzeStep[]);

      if (!res.ok) {
        setAnalyzeResult({ error: json?.error ?? "분석 실패" });
        toast.error("분석 실패: " + (json?.error ?? "Unknown"));
      } else {
        setAnalyzeResult({ asrCode: json.asrCode, pnu: json.pnu });
        toast.success(`분석 완료! ASR ${json.asrCode}`);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setAnalyzeResult({ error: msg });
      toast.error("네트워크 오류: " + msg);
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold">매물 신규 등록 — 단계 1: 자료수집</h1>
        <p className="text-sm text-neutral-500 mt-1">
          공부 PDF 1~5개와 매물 이미지 최대 5개를 업로드합니다.
        </p>
      </div>

      {/* (1) 자료수집 방식 */}
      <Card>
        <CardHeader>
          <CardTitle>① 자료수집 방식</CardTitle>
          <CardDescription>
            직접 업로드는 즉시 가능. 자동 수집은 PRD v2.1에서 활성화됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={mode}
            onValueChange={(v) => setMode(v as "manual" | "auto")}
            className="space-y-3"
          >
            <div className="flex items-start gap-3 p-3 border rounded">
              <RadioGroupItem value="manual" id="m-manual" className="mt-1" />
              <Label htmlFor="m-manual" className="cursor-pointer flex-1">
                <div className="font-medium">직접 업로드 (수동)</div>
                <div className="text-xs text-neutral-500 mt-1">
                  PDF·이미지를 직접 업로드합니다.
                </div>
              </Label>
            </div>
            <div className="flex items-start gap-3 p-3 border rounded opacity-50">
              <RadioGroupItem value="auto" id="m-auto" disabled className="mt-1" />
              <Label htmlFor="m-auto" className="cursor-not-allowed flex-1">
                <div className="font-medium">
                  자동 수집{" "}
                  <span className="text-xs text-neutral-500">(장래확장)</span>
                </div>
                <div className="text-xs text-neutral-500 mt-1">
                  주소만 입력하면 정부24·인터넷등기소에서 자동 발급.
                  PRD v2.1에서 활성화 예정.
                </div>
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* (2) 공부 PDF 업로드 */}
      <Card>
        <CardHeader>
          <CardTitle>② 공부 PDF 업로드 (1~5개)</CardTitle>
          <CardDescription>
            등기·토지·건축 3종은 권장. 각 파일 최대 20MB, PDF 형식만 허용.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {GONGBU_ORDER.map((t) => {
            const slot = gongbu[t];
            return (
              <div
                key={t}
                className="flex items-center gap-3 p-3 border rounded"
              >
                <Checkbox
                  id={`g-${t}`}
                  checked={slot.enabled}
                  onCheckedChange={(v) =>
                    updateGongbu(t, { enabled: !!v, file: null, status: "idle" })
                  }
                />
                <Label
                  htmlFor={`g-${t}`}
                  className="w-32 cursor-pointer font-medium"
                >
                  {GONGBU_LABELS[t]}
                </Label>
                <input
                  type="file"
                  accept="application/pdf"
                  disabled={!slot.enabled || submitting}
                  className="flex-1 text-sm file:mr-3 file:py-1 file:px-3 file:rounded file:border file:bg-neutral-50 file:cursor-pointer disabled:opacity-50"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    if (f && f.size > MAX_PDF_BYTES) {
                      toast.error(
                        `${GONGBU_LABELS[t]}: 파일 크기 초과 (${humanFileSize(f.size)} > 20MB)`,
                      );
                      e.target.value = "";
                      return;
                    }
                    updateGongbu(t, { file: f, status: "idle" });
                  }}
                />
                <StatusBadge status={slot.status} />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* (3) 매물 이미지 업로드 */}
      <Card>
        <CardHeader>
          <CardTitle>③ 매물 이미지 (0~5개)</CardTitle>
          <CardDescription>
            각 이미지 최대 5MB, JPG/PNG/WebP 허용. 분석보고서에 그대로 노출됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {images.map((slot, i) => (
            <div key={i} className="flex items-center gap-3 p-3 border rounded">
              <Label className="w-24 font-medium">사진 #{i + 1}</Label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={submitting}
                className="flex-1 text-sm file:mr-3 file:py-1 file:px-3 file:rounded file:border file:bg-neutral-50 file:cursor-pointer disabled:opacity-50"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  if (f && f.size > MAX_IMAGE_BYTES) {
                    toast.error(
                      `사진 #${i + 1}: 파일 크기 초과 (${humanFileSize(f.size)} > 5MB)`,
                    );
                    e.target.value = "";
                    return;
                  }
                  updateImage(i, { file: f, status: "idle" });
                }}
              />
              <StatusBadge status={slot.status} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Separator />

      <Alert>
        <AlertDescription className="text-xs">
          업로드 즉시 Supabase Storage 에 보관되고, 분석 시작 버튼을 누르면
          단계 4 (pdf-parse → PII 마스킹 → Claude LLM 추출 → properties INSERT)가
          자동 실행됩니다. 처리 시간 약 30~60초.
        </AlertDescription>
      </Alert>

      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          disabled={submitting || analyzing}
          onClick={() => location.reload()}
        >
          초기화
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={submitting || analyzing || mode === "auto" || uploadDone}
          size="lg"
          variant={uploadDone ? "outline" : "default"}
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              업로드 중…
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              {uploadDone ? "업로드 완료" : "업로드 시작"}
            </>
          )}
        </Button>
        <Button
          onClick={handleAnalyze}
          disabled={analyzing || submitting}
          size="lg"
          title="현재 로그인 계정의 pending 업로드를 모두 분석합니다 (등기·토지·건축 PDF 3종 필요)"
        >
          {analyzing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              분석 중…
            </>
          ) : (
            <>🤖 분석 시작</>
          )}
        </Button>
      </div>

      {/* 분석 진행 / 결과 */}
      {(analyzeSteps.length > 0 || analyzeResult) && (
        <Card>
          <CardHeader>
            <CardTitle>단계 4 분석 진행</CardTitle>
            <CardDescription>
              pdf-parse → PII 마스킹 → Claude → properties INSERT
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {analyzeSteps.map((s, i) => (
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
            {analyzeResult?.asrCode && (
              <Alert className="mt-4">
                <AlertDescription>
                  <div className="font-medium text-green-700">
                    ✅ 분석 완료: {analyzeResult.asrCode}
                  </div>
                  <div className="text-xs text-neutral-500 mt-1">
                    PNU {analyzeResult.pnu} · workflow_stage = 05_입력
                  </div>
                </AlertDescription>
              </Alert>
            )}
            {analyzeResult?.error && (
              <Alert variant="destructive" className="mt-4">
                <AlertDescription>{analyzeResult.error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: GongbuSlot["status"] }) {
  if (status === "done")
    return <CheckCircle2 className="h-5 w-5 text-green-600" />;
  if (status === "error") return <XCircle className="h-5 w-5 text-red-600" />;
  if (status === "uploading")
    return <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />;
  return <span className="w-5" />;
}

/**
 * Claude Opus 4.7 호출 + JSON 파싱 (v1.7 llm_extractor.py 포팅).
 *
 * v2 핵심 변경: Claude 의 native PDF 지원을 활용해서 pdf-parse 우회.
 * - PDF buffer 를 base64 로 인코딩해서 document content block 으로 직접 전송
 * - 텍스트 추출 + 구조화 JSON 생성 + 스캔본 OCR 까지 한 번에
 * - 한국어 인터넷등기소 PDF, 정부24 PDF 모두 안정적으로 처리
 */
import Anthropic from "@anthropic-ai/sdk";
import { promises as fs, readFileSync } from "fs";
import path from "path";

export type GongbuKind = "deungki" | "toji" | "geonchuk";

const PROMPT_FILE_MAP: Record<GongbuKind, string> = {
  deungki: "deungki.md",
  toji: "toji.md",
  geonchuk: "geonchuk.md",
};

const promptCache: Map<GongbuKind, string> = new Map();

async function loadPrompt(kind: GongbuKind): Promise<string> {
  if (promptCache.has(kind)) return promptCache.get(kind)!;
  const file = PROMPT_FILE_MAP[kind];
  const fullPath = path.join(process.cwd(), "prompts", file);
  const text = await fs.readFile(fullPath, "utf-8");
  promptCache.set(kind, text);
  return text;
}

function stripCodeFence(s: string): string {
  let t = s.trim();
  t = t.replace(/^```(?:json)?\s*/i, "");
  t = t.replace(/\s*```\s*$/i, "");
  return t.trim();
}

/**
 * `.env` 파일에서 키 직접 추출 (OS 환경변수가 빈 값으로 막혀있을 때 fallback).
 * Claude Code CLI 환경에서 ANTHROPIC_API_KEY 가 빈 값으로 사전 설정되는 이슈 대응.
 */
function readKeyFromDotenv(key: string): string | null {
  try {
    const envText = readFileSync(path.join(process.cwd(), ".env"), "utf-8");
    const re = new RegExp(`^${key}=(.+)$`, "m");
    const m = envText.match(re);
    if (!m) return null;
    return m[1].trim().replace(/^["']|["']$/g, "");
  } catch {
    return null;
  }
}

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (_client) return _client;
  let apiKey = (process.env.ANTHROPIC_API_KEY ?? "").trim();
  if (!apiKey) {
    apiKey = readKeyFromDotenv("ANTHROPIC_API_KEY") ?? "";
  }
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY 환경변수가 비어 있습니다. .env 또는 OS 환경변수에 설정해주세요.",
    );
  }
  _client = new Anthropic({ apiKey });
  return _client;
}

/**
 * 공통: Claude 응답 → JSON 파싱
 */
function parseClaudeJsonResponse(
  textBlocks: { type: string; text?: string }[],
): Record<string, unknown> {
  const block = textBlocks.find(
    (c): c is { type: "text"; text: string } =>
      c.type === "text" && typeof (c as { text?: unknown }).text === "string",
  );
  if (!block) {
    throw new Error("Claude 응답에 text 블록이 없습니다");
  }
  const raw = stripCodeFence(block.text);
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(
      "[llm/extract] JSON 파싱 실패:",
      msg,
      "\nraw[0:500]:",
      raw.slice(0, 500),
    );
    throw new Error(`Claude 응답 JSON 파싱 실패: ${msg}`);
  }
}

/**
 * PDF buffer 를 Claude 에 직접 전송해서 구조화 JSON 추출.
 *
 * Anthropic Document API (claude-3.5-sonnet+ / claude-opus 지원):
 *   document content block { type: "document", source: { type: "base64", media_type: "application/pdf", data } }
 *
 * @param pdfBuffer PDF 파일의 원본 Buffer (마스킹 전, Claude 내부에서 PII 마스킹 지시 따라 처리)
 * @param kind 공부 종류
 */
export async function extractFromPdf(
  pdfBuffer: Buffer,
  kind: GongbuKind,
): Promise<Record<string, unknown>> {
  const promptTemplate = await loadPrompt(kind);
  // {text} 자리에 "첨부된 PDF를 그대로 분석하세요"
  const prompt =
    promptTemplate.replace(
      "{text}",
      "(첨부된 PDF 문서를 직접 분석하세요. 모든 페이지를 읽고 구조화 JSON으로 변환하세요.)",
    ) +
    "\n\n## PII 마스킹 정책 (필수 준수)\n\n" +
    "- 주민등록번호 뒷자리 6자리는 반드시 `******` 으로 마스킹.\n" +
    "  예: `901120-1234567` → `901120-1******`.\n" +
    "- 법인등록번호, 채권자 성명·주소·금액은 그대로 추출 (권리분석 핵심).\n";

  const base64Pdf = pdfBuffer.toString("base64");

  const client = getClient();
  const resp = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: base64Pdf,
            },
          },
          { type: "text", text: prompt },
        ],
      },
    ],
  });

  return parseClaudeJsonResponse(resp.content);
}

/**
 * (구버전 호환용) 텍스트 기반 추출. 현재는 사용 안 함.
 */
export async function extractWithClaude(
  text: string,
  kind: GongbuKind,
): Promise<Record<string, unknown>> {
  const promptTemplate = await loadPrompt(kind);
  const prompt = promptTemplate.replace("{text}", text);

  const client = getClient();
  const resp = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  return parseClaudeJsonResponse(resp.content);
}

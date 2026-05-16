/**
 * PDF 텍스트 추출 (v1.7 pdf_extractor.py 의 pdfplumber 부분 포팅).
 *
 * pdf-parse v2 (PDFParse 클래스 + getText) 사용.
 * Clova OCR fallback 은 별도 모듈 (clova.ts).
 *
 * 임계값: MIN_TEXT_LEN = 200자 → 미만 시 OCR fallback 필요
 */
import { PDFParse } from "pdf-parse";

export const MIN_TEXT_LEN = 200;

export type PdfExtractResult = {
  text: string;
  pages: number;
  /** 텍스트가 너무 짧아서 OCR fallback이 필요한지 여부 */
  needsOcr: boolean;
};

/**
 * PDF Buffer 에서 텍스트 추출.
 * pdf-parse가 실패하거나 텍스트가 200자 미만이면 needsOcr=true.
 */
export async function extractPdfText(buf: Buffer): Promise<PdfExtractResult> {
  let parser: PDFParse | null = null;
  try {
    // Node Buffer → Uint8Array (PDFParse는 TypedArray 권장)
    const data = new Uint8Array(buf);
    parser = new PDFParse({ data });
    const result = await parser.getText();
    const cleaned = (result.text ?? "").trim();
    return {
      text: cleaned,
      pages: result.total ?? result.pages?.length ?? 0,
      needsOcr: cleaned.length < MIN_TEXT_LEN,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[pdf/parse] PDFParse failed:", msg);
    return {
      text: "",
      pages: 0,
      needsOcr: true,
    };
  } finally {
    if (parser) {
      try {
        await parser.destroy();
      } catch {
        // ignore
      }
    }
  }
}

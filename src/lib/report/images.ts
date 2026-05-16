/**
 * 매물 사진 Storage 다운로드 + 포맷 감지 (M6 분석보고서 이미지용).
 *
 * 흐름:
 *   1) properties.image_paths[0..2] 경로를 property-images 버킷에서 받음
 *   2) 파일 시그니처로 PNG/JPG/GIF/BMP 감지
 *   3) WebP 등 docx 미지원 포맷이면 null 반환 (해당 슬롯 공란 처리)
 *
 * property-images 버킷은 public 이므로 service role 로 download 가능.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../supabase/types";
import type { ReportImage } from "./build";

const SLOT_LABELS = ["대상 부동산", "위치도 (광역)", "위치도 (인근)"] as const;

type SupportedType = "png" | "jpg" | "gif" | "bmp";

/**
 * 파일 매직 바이트로 이미지 포맷 감지. 미지원 포맷은 null.
 */
function detectImageType(bytes: Uint8Array): SupportedType | null {
  if (bytes.length < 4) return null;
  // PNG: 89 50 4E 47
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  )
    return "png";
  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  // GIF: 47 49 46 38
  if (
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38
  )
    return "gif";
  // BMP: 42 4D
  if (bytes[0] === 0x42 && bytes[1] === 0x4d) return "bmp";
  // WEBP: 52 49 46 46 ... 57 45 42 50  (RIFF....WEBP)
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  )
    return null; // docx ImageRun은 webp 미지원 → 공란 처리
  return null;
}

/**
 * 매물 image_paths 의 앞 3장을 Storage 에서 받아 ReportImage 슬롯 3개로 반환.
 * 슬롯 부족 / 다운로드 실패 / 미지원 포맷 → null.
 */
export async function loadReportImages(
  supabase: SupabaseClient<Database>,
  imagePaths: string[],
): Promise<[ReportImage, ReportImage, ReportImage]> {
  const slots: [ReportImage, ReportImage, ReportImage] = [null, null, null];
  for (let i = 0; i < 3; i++) {
    const path = imagePaths[i];
    if (!path) continue;
    try {
      const { data, error } = await supabase.storage
        .from("property-images")
        .download(path);
      if (error || !data) continue;
      const arrayBuf = await data.arrayBuffer();
      const bytes = new Uint8Array(arrayBuf);
      const type = detectImageType(bytes);
      if (!type) continue; // webp 등 미지원
      slots[i] = {
        buffer: Buffer.from(bytes),
        type,
        label: SLOT_LABELS[i],
      };
    } catch {
      // 개별 슬롯 실패는 non-fatal — 해당 슬롯만 null
    }
  }
  return slots;
}

export const REPORT_IMAGE_LABELS = SLOT_LABELS;

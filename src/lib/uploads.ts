/**
 * 단계 1 자료수집 UI / 업로드 API 공용 상수 + 유틸.
 */

export type GongbuType =
  | "deungki"
  | "toji"
  | "geonchuk"
  | "toji_iyong"
  | "gamjeong";

export type FileSlotType = GongbuType | "image";

export const GONGBU_LABELS: Record<GongbuType, string> = {
  deungki: "등기부등본",
  toji: "토지대장",
  geonchuk: "건축물대장",
  toji_iyong: "토지이용계획안",
  gamjeong: "감정평가서",
};

export const GONGBU_ORDER: GongbuType[] = [
  "deungki",
  "toji",
  "geonchuk",
  "toji_iyong",
  "gamjeong",
];

export const MAX_GONGBU = 5;
export const MAX_IMAGES = 5;
export const MAX_PDF_BYTES = 20 * 1024 * 1024; // 20MB
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB

export const ALLOWED_PDF_MIME = ["application/pdf"];
export const ALLOWED_IMAGE_MIME = ["image/jpeg", "image/png", "image/webp"];

export function bucketForType(t: FileSlotType): "gongbu" | "property-images" {
  return t === "image" ? "property-images" : "gongbu";
}

export function maxBytesForType(t: FileSlotType): number {
  return t === "image" ? MAX_IMAGE_BYTES : MAX_PDF_BYTES;
}

export function allowedMimeForType(t: FileSlotType): string[] {
  return t === "image" ? ALLOWED_IMAGE_MIME : ALLOWED_PDF_MIME;
}

export function humanFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1024 / 1024).toFixed(2) + " MB";
}

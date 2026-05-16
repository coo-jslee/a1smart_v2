/**
 * Supabase Storage public URL 빌더 (anon 접근 가능한 버킷용).
 *
 *  - property-images 버킷은 0003_storage_buckets.sql 에서 public = true
 *  - 따라서 path 만 알면 URL 조립 가능
 *  - URL 형식: {NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/{bucket}/{path}
 */
export function publicStorageUrl(bucket: string, path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return "";
  // path 가 / 로 시작하면 중복 방지
  const clean = path.startsWith("/") ? path.slice(1) : path;
  return `${base}/storage/v1/object/public/${bucket}/${encodeURI(clean)}`;
}

/** 매물 이미지 첫 장 (썸네일용). 없으면 null. */
export function firstPropertyImageUrl(
  imagePaths: string[] | null | undefined,
): string | null {
  if (!imagePaths || imagePaths.length === 0) return null;
  return publicStorageUrl("property-images", imagePaths[0]);
}

/** 매물 이미지 전체 URL 배열. */
export function propertyImageUrls(
  imagePaths: string[] | null | undefined,
): string[] {
  if (!imagePaths || imagePaths.length === 0) return [];
  return imagePaths.map((p) => publicStorageUrl("property-images", p));
}

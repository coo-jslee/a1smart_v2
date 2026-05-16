import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  bucketForType,
  maxBytesForType,
  allowedMimeForType,
  type FileSlotType,
} from "@/lib/uploads";

const ALLOWED_TYPES: FileSlotType[] = [
  "deungki",
  "toji",
  "geonchuk",
  "toji_iyong",
  "gamjeong",
  "image",
];

/**
 * 단계 1 업로드 endpoint.
 *
 * multipart/form-data:
 *   file        : File (PDF 또는 이미지)
 *   file_type   : FileSlotType
 *
 * 응답: { uploadId, storagePath, bucket }
 *
 * 흐름:
 *   1. 인증 확인 (관리자만)
 *   2. 입력 검증 (file_type, MIME, size)
 *   3. Supabase Storage 업로드 (관리자 세션 → RLS 통과)
 *   4. public.uploads 테이블에 row INSERT (status='pending')
 */
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();

  // 1) 인증 + 관리자 확인
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 2) 입력 파싱·검증
  const formData = await req.formData();
  const file = formData.get("file");
  const fileTypeRaw = String(formData.get("file_type") ?? "");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "file 필드가 필요합니다" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(fileTypeRaw as FileSlotType)) {
    return NextResponse.json(
      { error: `file_type 이 올바르지 않습니다: ${fileTypeRaw}` },
      { status: 400 },
    );
  }

  const fileType = fileTypeRaw as FileSlotType;
  const maxBytes = maxBytesForType(fileType);
  const allowedMime = allowedMimeForType(fileType);

  if (file.size > maxBytes) {
    return NextResponse.json(
      { error: `파일 크기 초과 (최대 ${maxBytes / 1024 / 1024}MB)` },
      { status: 400 },
    );
  }
  if (!allowedMime.includes(file.type)) {
    return NextResponse.json(
      { error: `허용되지 않은 파일 형식: ${file.type}` },
      { status: 400 },
    );
  }

  // 3) Storage 업로드
  const bucket = bucketForType(fileType);
  const ext = (file.name.split(".").pop() ?? "bin").toLowerCase();
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 10);
  const storagePath = `pending/${user.id}/${ts}_${rand}_${fileType}.${ext}`;

  const arrayBuf = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuf);

  const { error: upErr } = await supabase.storage
    .from(bucket)
    .upload(storagePath, bytes, {
      contentType: file.type,
      upsert: false,
    });

  if (upErr) {
    return NextResponse.json(
      { error: "Storage 업로드 실패: " + upErr.message },
      { status: 500 },
    );
  }

  // 4) uploads row 생성
  const { data: row, error: insErr } = await supabase
    .from("uploads")
    .insert({
      uploader_id: user.id,
      file_type: fileType,
      storage_path: storagePath,
      original_name: file.name,
      size_bytes: file.size,
      mime_type: file.type,
      status: "pending",
    })
    .select("id")
    .single();

  if (insErr) {
    // rollback: Storage에서 삭제 시도
    await supabase.storage.from(bucket).remove([storagePath]);
    return NextResponse.json(
      { error: "DB INSERT 실패: " + insErr.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    uploadId: row.id,
    storagePath,
    bucket,
    fileType,
  });
}

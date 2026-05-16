/**
 * ASR 코드 / PNU 19자리 생성 (v1.7 property_mapper.py 포팅).
 *
 * ASR 코드: ASR-{시군구5}-{시퀀스6}
 * PNU 19자리: 시도(2) + 시군구(3) + 읍면동(3) + 리(2) + 산구분(1) + 본번(4) + 부번(4)
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./supabase/types";

export function derivePnu(toji: Record<string, unknown>): string {
  const raw = String(toji["고유번호"] ?? "").replace(/-/g, "");
  if (raw.length === 19) return raw;
  return raw.padEnd(19, "0").slice(0, 19);
}

export function deriveLawdCd(toji: Record<string, unknown>): string {
  const pnu = derivePnu(toji);
  return pnu.slice(0, 5);
}

/**
 * 시군구별 다음 시퀀스 번호 채번.
 * 동일 lawd_cd 매물 중 가장 큰 시퀀스 + 1 반환.
 */
export async function nextAsrSequence(
  supabase: SupabaseClient<Database>,
  lawdCd: string,
): Promise<number> {
  const prefix = `ASR-${lawdCd}-`;
  const { data, error } = await supabase
    .from("properties")
    .select("asr_code")
    .like("asr_code", `${prefix}%`)
    .order("asr_code", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(`시퀀스 채번 실패: ${error.message}`);
  }

  if (!data || data.length === 0) return 1;

  const lastCode = data[0].asr_code;
  const seqPart = lastCode.slice(prefix.length);
  const lastSeq = parseInt(seqPart, 10);
  return Number.isFinite(lastSeq) ? lastSeq + 1 : 1;
}

export function formatAsrCode(lawdCd: string, sequence: number): string {
  return `ASR-${lawdCd}-${String(sequence).padStart(6, "0")}`;
}

/**
 * 토지대장 JSON에서 신규 ASR 코드 생성.
 * Postgres에서 시퀀스 채번 후 포맷팅.
 */
export async function generateAsrCode(
  supabase: SupabaseClient<Database>,
  toji: Record<string, unknown>,
): Promise<{ asrCode: string; pnu: string; lawdCd: string }> {
  const pnu = derivePnu(toji);
  const lawdCd = pnu.slice(0, 5);
  const seq = await nextAsrSequence(supabase, lawdCd);
  return {
    asrCode: formatAsrCode(lawdCd, seq),
    pnu,
    lawdCd,
  };
}

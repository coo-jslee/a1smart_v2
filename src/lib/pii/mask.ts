/**
 * PII (개인정보) 마스킹 유틸 — v1.7 pdf_extractor.mask_pii() 그대로 포팅.
 *
 * 정책 (CLAUDE.md §7.2 / PRD §10.1):
 *   - 주민번호 뒷자리 6자리는 마스킹 (앞자리 + 첫자리는 보존)
 *   - 채권자 주소·성명은 권리분석에 필수이므로 보존
 *   - Claude API에 텍스트 전송하기 전 반드시 호출
 */

const RESIDENT_NUMBER_REGEX = /(\d{6})[-\s]?(\d)\d{6}/g;

/**
 * 주민번호 뒷자리 마스킹.
 * 예: 901120-1234567 → 901120-1******
 */
export function maskPii(text: string): string {
  if (!text) return text;
  return text.replace(RESIDENT_NUMBER_REGEX, "$1-$2******");
}

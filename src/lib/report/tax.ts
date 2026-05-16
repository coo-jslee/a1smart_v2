/**
 * 취득세·지방교육세·농어촌특별세·인지세 추정 (v1.7 pipeline_07.calc_acquisition_tax 포팅).
 *
 * ⚠️ AI 참고 추정값 — 세무사 확인 필요.
 *
 *   업무시설(오피스텔/상가): 취득세 4% + 지방교육세 0.4% + 농어촌특별세 0.2%
 *   주거(아파트/빌라):       취득세 1~3% + 지방교육세 0.1~0.3% + 농어촌특별세 0%
 *   인지세: 1억미만 7만 / 1억~10억 15만 / 10억이상 35만
 */
export type AcquisitionTax = {
  acquisition: number; // 취득세
  edu: number; // 지방교육세
  agri: number; // 농어촌특별세
  stamp: number; // 인지세
  total: number; // 합계
  effective_rate: number; // 실효세율 (합계/매매가)
  is_commercial: boolean;
  note: string;
};

export function calcAcquisitionTax(
  price: number,
  isCommercial: boolean,
): AcquisitionTax {
  if (price <= 0) {
    return {
      acquisition: 0,
      edu: 0,
      agri: 0,
      stamp: 0,
      total: 0,
      effective_rate: 0,
      is_commercial: isCommercial,
      note: "AI 참고 추정값 — 세무사 확인 필요",
    };
  }

  let acqRate: number;
  let eduRate: number;
  let agriRate: number;
  if (isCommercial) {
    acqRate = 0.04;
    eduRate = 0.004;
    agriRate = 0.002;
  } else if (price <= 600_000_000) {
    acqRate = 0.01;
    eduRate = 0.001;
    agriRate = 0;
  } else if (price <= 900_000_000) {
    acqRate = 0.02;
    eduRate = 0.002;
    agriRate = 0;
  } else {
    acqRate = 0.03;
    eduRate = 0.003;
    agriRate = 0;
  }

  const acq = Math.floor(price * acqRate);
  const edu = Math.floor(price * eduRate);
  const agri = Math.floor(price * agriRate);
  let stamp = 0;
  if (price >= 1_000_000_000) stamp = 350_000;
  else if (price >= 100_000_000) stamp = 150_000;
  else if (price >= 10_000_000) stamp = 70_000;

  const total = acq + edu + agri + stamp;
  return {
    acquisition: acq,
    edu,
    agri,
    stamp,
    total,
    effective_rate: total / price,
    is_commercial: isCommercial,
    note: "AI 참고 추정값 — 세무사 확인 필요",
  };
}

/** property_type에서 업무시설/상가 여부 추정. */
export function isCommercialProperty(propertyType: string | null | undefined): boolean {
  if (!propertyType) return false;
  return /오피스텔|상가|업무|단독상가|꼬마빌딩|빌딩|사무실/.test(propertyType);
}

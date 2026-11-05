/** 손님 연락처·이름 표기. 예약과 현장 대기가 함께 쓴다. */

/** 숫자만 남긴다. "010-1234-5678" → "01012345678" */
export const normalizePhone = (phone: string) => phone.replace(/\D/g, "");

/** 휴대전화(010~019)만 받는다. 숫자만 10~11자리 */
export const isMobilePhone = (digits: string) => /^01[016789]\d{7,8}$/.test(digits);

/** "01012345678" → "010-1234-5678" */
export function formatPhone(digits: string) {
  if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return digits;
}

/** 키오스크 조회용 전화번호 뒷자리 4자리 */
export const phoneLast4 = (digits: string) => digits.slice(-4);

/**
 * 키오스크처럼 다른 손님도 볼 수 있는 화면용 이름 가리기.
 * 김철수 → 김*수, 김수 → 김*, 남궁민수 → 남**수, A → A
 */
export function maskName(name: string) {
  const chars = [...name.trim()];
  if (chars.length <= 1) return chars.join("");
  if (chars.length === 2) return `${chars[0]}*`;
  return chars[0] + "*".repeat(chars.length - 2) + chars[chars.length - 1];
}

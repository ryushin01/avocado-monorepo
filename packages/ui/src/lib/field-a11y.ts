/** 칸 id에 붙는 오류 문구 id. 짝이 되는 FieldError의 id로 쓴다. */
export const errorIdOf = (fieldId: string) => `${fieldId}-error`;

/** 칸 id에 붙는 도움말 id. 짝이 되는 FieldDescription의 id로 쓴다. */
export const descriptionIdOf = (fieldId: string) => `${fieldId}-description`;

/**
 * 입력 칸에 붙이는 접근성 속성
 * - 도움말이 있으면(described) aria-describedby로 늘 잇는다.
 * - 잘못된 값일 때만 aria-invalid를 붙이고 오류 문구를 잇는다. 처음 값이나 빈 칸에는 붙이지 않는다.
 *   aria-errormessage는 화면 낭독기 지원이 고르지 않아 aria-describedby에도 함께 넣는다.
 */
export function fieldA11y(fieldId: string, invalid: boolean, { described = false } = {}) {
  const errorId = invalid ? errorIdOf(fieldId) : undefined;
  const describedBy = [described ? descriptionIdOf(fieldId) : undefined, errorId]
    .filter(Boolean)
    .join(" ");
  return {
    "aria-invalid": invalid || undefined,
    "aria-errormessage": errorId,
    "aria-describedby": describedBy || undefined,
  };
}

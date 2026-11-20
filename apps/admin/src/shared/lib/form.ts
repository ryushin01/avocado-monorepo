import { z } from "zod";

/** 폼 서버 액션의 결과. 실패하면 입력값을 돌려줘 폼을 복원한다. */
export type FormState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | {
      status: "error";
      formError?: string;
      fieldErrors: Partial<Record<string, string[]>>;
      values: Record<string, string | string[]>;
    };

/** 메뉴 등에서 바로 실행하는 액션의 결과 */
export type ActionResult = { ok: boolean; message: string };

/** FormData → 객체. 같은 이름이 여러 번 오면 배열로 모은다. */
export function formDataToObject(formData: FormData) {
  const result: Record<string, string | string[]> = {};
  for (const key of new Set(formData.keys())) {
    const values = formData.getAll(key).map(String);
    result[key] = values.length > 1 ? values : values[0];
  }
  return result;
}

export function formError(
  values: Record<string, string | string[]>,
  error: z.ZodError | string,
): FormState {
  return typeof error === "string"
    ? { status: "error", formError: error, fieldErrors: {}, values }
    : {
        status: "error",
        fieldErrors: z.flattenError(error).fieldErrors,
        values,
      };
}

/** 편집 폼이 숨은 칸(version)으로 보내는 행 버전. 폼을 연 시점의 값이다. 없거나 잘못되면 null */
export function parseVersion(values: Record<string, string | string[]>): number | null {
  const raw = values.version;
  const n = typeof raw === "string" && raw !== "" ? Number(raw) : NaN;
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

/** 버전 없이 온 편집 요청(배포 전에 연 화면 등) */
export const STALE_FORM_MESSAGE = "화면이 오래됐습니다. 새로고침한 뒤 다시 고쳐 주세요.";

/**
 * 편집 폼을 연 뒤 다른 직원이 같은 항목을 먼저 바꿨을 때(낙관적 잠금 충돌).
 * target은 조사까지 붙여 준다(예: "예약을", "재고를").
 */
export const editConflictMessage = (target: string) =>
  `이 창을 연 뒤 다른 직원이 ${target} 먼저 바꿨습니다. 창을 닫고 바뀐 내용을 확인한 뒤 다시 고쳐 주세요.`;

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

"use client";

import { useActionState } from "react";
import { toast } from "sonner";

import type { FormState } from "@/lib/form";

// attempt: 제출할 때마다 폼을 다시 마운트해 실패 시 입력값(defaultValue)을
// 복원한다. 별도 useState로 두면 await 이후 setState가 액션 결과와 따로
// 커밋되므로, 반드시 액션 상태 안에 함께 둔다.
type DialogFormState = FormState & { attempt: number };

const INITIAL: DialogFormState = { status: "idle", attempt: 0 };

type FormValues = Record<string, string | string[]>;

/**
 * 대화상자 안의 폼을 서버 액션으로 제출한다.
 * 성공하면 onSuccess(보통 창 닫기) 후 알림을 띄우고, 실패하면 입력값과 오류를 돌려준다.
 */
export function useDialogForm(
  action: (prev: FormState, formData: FormData) => Promise<FormState>,
  {
    defaults,
    onSuccess,
  }: { defaults: FormValues; onSuccess: () => void },
) {
  const [state, formAction, pending] = useActionState(
    async (prev: DialogFormState, formData: FormData): Promise<DialogFormState> => {
      const result = await action(prev, formData);
      const attempt = prev.attempt + 1;
      if (result.status === "success") {
        onSuccess();
        toast.success(result.message);
        return { status: "idle", attempt };
      }
      return { ...result, attempt };
    },
    INITIAL,
  );

  const errors = state.status === "error" ? state.fieldErrors : {};
  const values = state.status === "error" ? state.values : defaults;

  return {
    formAction,
    pending,
    /** form의 key로 쓴다 */
    formKey: state.attempt,
    formError: state.status === "error" ? state.formError : undefined,
    text(name: string) {
      const v = values[name];
      return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
    },
    list(name: string) {
      const v = values[name];
      return Array.isArray(v) ? v : v ? [v] : [];
    },
    invalid(name: string) {
      return Boolean(errors[name]?.length);
    },
    /** FieldError의 errors prop 형태 */
    errors(name: string) {
      return errors[name]?.map((message) => ({ message }));
    },
  };
}

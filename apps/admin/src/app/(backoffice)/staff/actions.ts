"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/current-user";
import { canManageOrganization } from "@/lib/auth/permissions";
import type { User } from "@/lib/auth/roles";
import {
  formDataToObject,
  formError,
  type ActionResult,
  type FormState,
} from "@/lib/form";
import type { UserSaveError } from "@/lib/users/repository";
import { createUser, setUserActive, updateUser } from "@/lib/users/data";
import { userInputSchema, type UserInput } from "@/lib/users/schema";

const FORBIDDEN = "직원은 관리자만 관리할 수 있습니다.";

const ERROR_MESSAGES: Record<UserSaveError, string> = {
  "not-found": "직원을 찾을 수 없습니다. 목록을 새로고침해주세요.",
  "duplicate-email": "다른 직원이 이미 쓰는 이메일입니다.",
  "cafe-unavailable": "운영 중인 매장을 소속 매장으로 선택해주세요.",
  self: "자기 자신의 역할은 바꾸거나 퇴사 처리할 수 없습니다.",
  "last-admin": "재직 중인 관리자가 한 명은 있어야 합니다.",
};

/** 필드와 연결되는 오류는 그 필드 아래에 보여준다. */
const FIELD_OF: Partial<Record<UserSaveError, string>> = {
  "duplicate-email": "email",
  "cafe-unavailable": "cafeId",
  self: "role",
  "last-admin": "role",
};

// 직원 목록은 사이드바의 계정 전환에도 쓰인다.
const revalidate = () => revalidatePath("/", "layout");

async function submitUserForm(
  formData: FormData,
  save: (input: UserInput, actor: User) => Promise<User | UserSaveError>,
  done: (name: string) => string,
): Promise<FormState> {
  const values = formDataToObject(formData);
  const actor = await getCurrentUser();
  if (!canManageOrganization(actor)) return formError(values, FORBIDDEN);

  const parsed = userInputSchema.safeParse(values);
  if (!parsed.success) return formError(values, parsed.error);

  const result = await save(parsed.data, actor);
  if (typeof result === "string") {
    const field = FIELD_OF[result];
    return field
      ? { status: "error", fieldErrors: { [field]: [ERROR_MESSAGES[result]] }, values }
      : formError(values, ERROR_MESSAGES[result]);
  }

  revalidate();
  return { status: "success", message: done(result.name) };
}

export async function createUserAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  return submitUserForm(formData, createUser, (name) => `'${name}' 직원을 등록했습니다.`);
}

export async function updateUserAction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  return submitUserForm(
    formData,
    (input, actor) => updateUser(id, input, actor.id),
    (name) => `'${name}' 정보를 수정했습니다.`,
  );
}

export async function setUserActiveAction(id: string, active: boolean): Promise<ActionResult> {
  const actor = await getCurrentUser();
  if (!canManageOrganization(actor)) return { ok: false, message: FORBIDDEN };
  const result = await setUserActive(id, active, actor.id);
  if (typeof result === "string") return { ok: false, message: ERROR_MESSAGES[result] };
  revalidate();
  return {
    ok: true,
    message: active
      ? `'${result.name}' 직원을 복직 처리했습니다.`
      : `'${result.name}' 직원을 퇴사 처리했습니다.`,
  };
}

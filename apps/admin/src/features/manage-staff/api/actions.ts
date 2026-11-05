"use server";

import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { recordAudit } from "@/server/audit/data";
import { getCurrentUser } from "@/server/auth/current-user";
import type { AuditAction } from "@/entities/audit";
import { canManageOrganization, ROLE_LABELS, type UserInput } from "@/entities/user";
import { passwordSchema, userInputSchema } from "@/entities/user/schema";
import type { User } from "@/entities/user";
import {
  formDataToObject,
  formError,
  type ActionResult,
  type FormState,
} from "@/shared/lib/form";
import type { UserSaveError } from "@/server/users/repository";
import { createUser, setUserActive, updateUser } from "@/server/users/data";

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

/**
 * 비밀번호 칸: 등록할 때는 필수, 수정할 때는 비우면 그대로 둔다.
 * 실패해도 비밀번호는 폼에 되돌려 보내지 않는다.
 */
async function submitUserForm(
  formData: FormData,
  action: AuditAction,
  passwordRequired: boolean,
  save: (input: UserInput, actor: User, passwordHash?: string) => Promise<User | UserSaveError>,
  done: (name: string) => string,
): Promise<FormState> {
  const { password = "", ...values } = formDataToObject(formData);
  const actor = await getCurrentUser();
  if (!canManageOrganization(actor)) return formError(values, FORBIDDEN);

  const parsed = userInputSchema.safeParse(values);
  const pw =
    passwordRequired || password !== ""
      ? passwordSchema.safeParse(password)
      : ({ success: true, data: undefined } as const);
  if (!parsed.success || !pw.success) {
    const fieldErrors = {
      ...(parsed.success ? {} : z.flattenError(parsed.error).fieldErrors),
      ...(pw.success ? {} : { password: z.flattenError(pw.error).formErrors }),
    };
    return { status: "error", fieldErrors, values };
  }

  const passwordHash = pw.data ? await hash(pw.data, 10) : undefined;
  const result = await save(parsed.data, actor, passwordHash);
  if (typeof result === "string") {
    const field = FIELD_OF[result];
    return field
      ? { status: "error", fieldErrors: { [field]: [ERROR_MESSAGES[result]] }, values }
      : formError(values, ERROR_MESSAGES[result]);
  }

  // 비밀번호는 값을 남기지 않고 재설정했다는 사실만 남긴다.
  await recordAudit(actor, {
    action,
    targetName: result.name,
    cafeId: result.cafeId,
    detail: [
      `역할 ${ROLE_LABELS[result.role]}`,
      action === "staff.update" && passwordHash ? "임시 비밀번호 재설정" : undefined,
    ]
      .filter(Boolean)
      .join(", "),
  });
  revalidate();
  return { status: "success", message: done(result.name) };
}

export async function createUserAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  return submitUserForm(
    formData,
    "staff.create",
    true,
    (input, _actor, passwordHash) => createUser(input, passwordHash!),
    (name) => `'${name}' 직원을 등록했습니다.`,
  );
}

export async function updateUserAction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  return submitUserForm(
    formData,
    "staff.update",
    false,
    (input, actor, passwordHash) => updateUser(id, input, actor.id, passwordHash),
    (name) => `'${name}' 정보를 수정했습니다.`,
  );
}

export async function setUserActiveAction(id: string, active: boolean): Promise<ActionResult> {
  const actor = await getCurrentUser();
  if (!canManageOrganization(actor)) return { ok: false, message: FORBIDDEN };
  const result = await setUserActive(id, active, actor.id);
  if (typeof result === "string") return { ok: false, message: ERROR_MESSAGES[result] };
  await recordAudit(actor, {
    action: active ? "staff.reactivate" : "staff.deactivate",
    targetName: result.name,
    cafeId: result.cafeId,
  });
  revalidate();
  return {
    ok: true,
    message: active
      ? `'${result.name}' 직원을 복직 처리했습니다.`
      : `'${result.name}' 직원을 퇴사 처리했습니다.`,
  };
}

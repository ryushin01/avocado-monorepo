"use server";

import { compare, hash } from "bcryptjs";

import { getDb } from "@/db/server";
import { getSignedInUser } from "@/server/auth/current-user";
import { isDemoMode } from "@/shared/config";
import { formDataToObject, formError, type FormState } from "@/shared/lib/form";
import { createUserRepository } from "@/server/users/repository";
import { changePasswordSchema } from "@/entities/user/index.server";

/** 본인 비밀번호 변경. 지금 비밀번호가 맞아야 바꾼다. 비밀번호는 실패해도 폼에 되돌려 보내지 않는다. */
export async function changePasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getSignedInUser();
  // 공개 데모는 모두가 같은 계정으로 들어오므로, 한 방문자가 비밀번호를 바꿔 다른 사람을 막지 못하게 한다.
  if (isDemoMode()) {
    return { status: "error", formError: "공개 데모에서는 비밀번호를 바꿀 수 없습니다.", fieldErrors: {}, values: {} };
  }
  const parsed = changePasswordSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return formError({}, parsed.error);

  const repo = createUserRepository(await getDb());
  const found = await repo.findForLogin(user.email);
  if (!found?.passwordHash || !(await compare(parsed.data.current, found.passwordHash))) {
    return { status: "error", fieldErrors: { current: ["지금 비밀번호가 맞지 않습니다."] }, values: {} };
  }
  await repo.changeOwnPassword(user.id, await hash(parsed.data.next, 10));
  return { status: "success", message: "비밀번호를 바꿨습니다." };
}

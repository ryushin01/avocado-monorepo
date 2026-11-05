"use server";

import { compare, hash } from "bcryptjs";

import { getDb } from "@/db/server";
import { getSignedInUser } from "@/lib/auth/current-user";
import { formDataToObject, formError, type FormState } from "@/lib/form";
import { createUserRepository } from "@/lib/users/repository";
import { changePasswordSchema } from "@/lib/users/schema";

/** 본인 비밀번호 변경. 지금 비밀번호가 맞아야 바꾼다. 비밀번호는 실패해도 폼에 되돌려 보내지 않는다. */
export async function changePasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getSignedInUser();
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

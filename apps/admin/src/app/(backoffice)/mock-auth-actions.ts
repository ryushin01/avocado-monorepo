"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { findActiveUser, MOCK_USER_COOKIE } from "@/lib/auth/mock-users";
import { getMockDb } from "@/lib/mock-db/server";

/** 개발용: 재직 중인 계정으로 전환한다. 인증이 붙으면 제거한다. */
export async function switchMockUserAction(userId: string) {
  const user = findActiveUser(getMockDb().users, userId);
  (await cookies()).set(MOCK_USER_COOKIE, user.id, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
}

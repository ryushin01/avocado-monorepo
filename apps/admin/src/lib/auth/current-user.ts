import "server-only";

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";

import { getDb } from "@/db/server";
import { createUserRepository } from "@/lib/users/repository";

import { authOptions } from "./options";
import type { User } from "./roles";

/**
 * 로그인한 직원. 요청마다 한 번만 읽는다.
 * 세션 쿠키를 읽으므로 호출하는 컴포넌트는 <Suspense> 안에 있어야 한다.
 * 로그인하지 않았거나 그사이 퇴사 처리됐으면 로그인 화면으로 보낸다.
 */
export const getCurrentUser = cache(async (): Promise<User> => {
  const user = await getSignedInUser();
  // 관리자가 정한 임시 비밀번호면 본인 비밀번호로 바꾸기 전에는 다른 화면을 쓸 수 없다.
  if (user.mustChangePassword) redirect("/password");
  return user;
});

/**
 * 로그인했고 재직 중인 직원 (임시 비밀번호 여부는 보지 않는다).
 * 비밀번호 변경 화면·액션만 직접 쓰고, 나머지는 getCurrentUser를 쓴다.
 */
export const getSignedInUser = cache(async (): Promise<User> => {
  // 세션 확인은 요청마다 해야 하므로 미리 렌더링하지 않는다(Auth.js가 내부에서 난수를 쓴다).
  await connection();
  const session = await getServerSession(authOptions);
  const id = (session?.user as { id?: string } | undefined)?.id;
  if (!id) redirect("/login");
  const user = await createUserRepository(await getDb()).get(id);
  if (!user || !user.active) redirect("/login?error=inactive");
  return user;
});

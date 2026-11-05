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
  // 세션 확인은 요청마다 해야 하므로 미리 렌더링하지 않는다(Auth.js가 내부에서 난수를 쓴다).
  await connection();
  const session = await getServerSession(authOptions);
  const id = (session?.user as { id?: string } | undefined)?.id;
  if (!id) redirect("/login");
  const user = await createUserRepository(await getDb()).get(id);
  if (!user || !user.active) redirect("/login?error=inactive");
  return user;
});

import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";

import { getMockDb } from "@/lib/mock-db/server";

import { findActiveUser, MOCK_USER_COOKIE } from "./mock-users";
import type { User } from "./roles";

/**
 * 현재 사용자. 요청마다 한 번만 읽는다.
 * cookies()를 읽으므로 호출하는 컴포넌트는 <Suspense> 안에 있어야 한다.
 *
 * TODO: 인증 방식이 정해지면 개발용 쿠키 대신 실제 세션 조회로 교체한다.
 */
export const getCurrentUser = cache(async (): Promise<User> => {
  const id = (await cookies()).get(MOCK_USER_COOKIE)?.value;
  return { ...findActiveUser(getMockDb().users, id) };
});

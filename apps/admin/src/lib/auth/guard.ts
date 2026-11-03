import { forbidden } from "next/navigation";

import { getCurrentUser } from "./current-user";
import { hasRole, type Role } from "./roles";

/** 서버 컴포넌트/액션에서 역할을 검사한다. 권한이 없으면 403. */
export async function requireRole(allowed: readonly Role[]) {
  const user = await getCurrentUser();
  if (!hasRole(user, allowed)) forbidden();
  return user;
}

export const ROLES = ["admin", "staff"] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  admin: "관리자",
  staff: "스태프",
};

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  /** 스태프가 소속된 매장. 관리자는 모든 매장을 관리하므로 없다. */
  cafeId?: string;
  /** 재직 중이면 true. 퇴사 처리하면 false가 되고 로그인(계정 전환) 목록에서 빠진다. */
  active: boolean;
};

export function hasRole(user: Pick<User, "role">, allowed: readonly Role[]) {
  return allowed.includes(user.role);
}

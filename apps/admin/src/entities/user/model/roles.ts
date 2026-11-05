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
  /** 재직 중이면 true. 퇴사 처리하면 false가 되고 바로 로그인할 수 없다. */
  active: boolean;
  /** 관리자가 정한 임시 비밀번호라 다음 로그인 때 본인 비밀번호로 바꿔야 하면 true */
  mustChangePassword?: boolean;
};

export function hasRole(user: Pick<User, "role">, allowed: readonly Role[]) {
  return allowed.includes(user.role);
}

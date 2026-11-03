import type { User } from "./roles";

// TODO: 인증 방식이 정해지면 계정 전환용 쿠키는 제거한다.
// 직원 목록의 초기값. 직원 관리 화면에서 바꾼 내용은 목 DB(users)에 남는다.
export const SEED_USERS: User[] = [
  { id: "u_admin", name: "김관리", email: "admin@example.com", role: "admin", active: true },
  {
    id: "u_staff_gangnam",
    name: "이스태프",
    email: "gangnam@example.com",
    role: "staff",
    cafeId: "c_gangnam",
    active: true,
  },
  {
    id: "u_staff_hongdae",
    name: "박스태프",
    email: "hongdae@example.com",
    role: "staff",
    cafeId: "c_hongdae",
    active: true,
  },
  {
    id: "u_staff_pangyo",
    name: "최스태프",
    email: "pangyo@example.com",
    role: "staff",
    cafeId: "c_pangyo",
    active: true,
  },
  {
    id: "u_staff_left",
    name: "정퇴사",
    email: "left@example.com",
    role: "staff",
    cafeId: "c_gangnam",
    active: false,
  },
];

export const MOCK_USER_COOKIE = "mock-user-id";

/** 쿠키의 id로 재직 중인 계정을 찾는다. 없거나 퇴사했으면 재직 중인 첫 관리자. */
export function findActiveUser(users: User[], id: string | undefined) {
  const active = users.filter((u) => u.active);
  return (
    active.find((u) => u.id === id) ??
    active.find((u) => u.role === "admin") ??
    active[0]
  );
}

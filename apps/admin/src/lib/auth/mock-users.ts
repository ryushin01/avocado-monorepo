import type { User } from "./roles";

// 개발용 시드 직원. 처음 DB를 만들 때 모두 DEV_PASSWORD로 로그인할 수 있게 넣는다.
// 운영 DB에는 넣지 않는다(SEED_DEMO=1일 때만).
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

/** 개발용 시드 직원의 비밀번호 (운영에서는 쓰지 않는다) */
export const DEV_PASSWORD = "avocado1234";

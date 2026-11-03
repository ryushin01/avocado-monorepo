import type { User } from "@/lib/auth/roles";
import type { MockDb } from "@/lib/mock-db";

import type { UserInput } from "./schema";

/**
 * - duplicate-email: 다른 직원이 이미 쓰는 이메일
 * - cafe-unavailable: 없거나 폐점한 매장에 스태프를 배정함
 * - self: 자기 자신의 역할을 바꾸거나 퇴사 처리함
 * - last-admin: 재직 중인 마지막 관리자를 없앰
 */
export type UserSaveError =
  | "not-found"
  | "duplicate-email"
  | "cafe-unavailable"
  | "self"
  | "last-admin";

/** 백엔드가 정해지면 이 인터페이스의 API 구현체로 교체한다. */
export interface UserRepository {
  /** 재직 중인 직원 먼저, 같으면 관리자 먼저·이름순 */
  list(): Promise<User[]>;
  get(id: string): Promise<User | null>;
  create(input: UserInput): Promise<User | UserSaveError>;
  /** actorId: 수정하는 사람. 자기 역할은 바꿀 수 없다. */
  update(id: string, input: UserInput, actorId: string): Promise<User | UserSaveError>;
  /** 퇴사(false)·복직(true). 자기 자신은 퇴사 처리할 수 없다. */
  setActive(id: string, active: boolean, actorId: string): Promise<User | UserSaveError>;
}

export const byUserOrder = (a: User, b: User) =>
  Number(b.active) - Number(a.active) ||
  Number(a.role !== "admin") - Number(b.role !== "admin") ||
  a.name.localeCompare(b.name, "ko");

export function createUserRepository(db: MockDb): UserRepository {
  const emailTaken = (email: string, exceptId?: string) =>
    db.users.some((u) => u.id !== exceptId && u.email.toLowerCase() === email.toLowerCase());
  const openCafe = (cafeId?: string) =>
    db.cafes.some((c) => c.id === cafeId && c.status === "open");
  const otherActiveAdmins = (id: string) =>
    db.users.filter((u) => u.id !== id && u.active && u.role === "admin").length;

  /** 바뀐 뒤의 user가 규칙에 맞는지 */
  function check(before: User | undefined, after: User, actorId?: string): UserSaveError | null {
    if (emailTaken(after.email, before?.id)) return "duplicate-email";
    if (before && before.id === actorId) {
      if (after.role !== before.role || !after.active) return "self";
    }
    const losesAdmin =
      before?.role === "admin" && before.active && (after.role !== "admin" || !after.active);
    if (losesAdmin && otherActiveAdmins(before.id) === 0) return "last-admin";
    // 스태프의 소속 매장은 운영 중이어야 한다. 이미 폐점한 매장의 퇴사자는 그대로 둘 수 있다.
    const cafeChanged = after.cafeId !== before?.cafeId || (after.active && !before?.active);
    if (after.role === "staff" && after.active && cafeChanged && !openCafe(after.cafeId)) {
      return "cafe-unavailable";
    }
    return null;
  }

  // 관리자는 모든 매장을 관리하므로 소속 매장을 두지 않는다.
  const normalize = (user: User): User =>
    user.role === "admin" ? { ...user, cafeId: undefined } : user;

  return {
    async list() {
      return db.users.map((u) => ({ ...u })).sort(byUserOrder);
    },
    async get(id) {
      const user = db.users.find((u) => u.id === id);
      return user ? { ...user } : null;
    },
    async create(input) {
      const error = check(undefined, normalize({ ...input, id: "", active: true }));
      if (error) return error;
      const user = normalize({ ...input, id: `u_${db.nextUserId++}`, active: true });
      db.users.push(user);
      return { ...user };
    },
    async update(id, input, actorId) {
      const index = db.users.findIndex((u) => u.id === id);
      if (index === -1) return "not-found";
      const before = db.users[index];
      const after = normalize({ ...before, cafeId: undefined, ...input, id });
      const error = check(before, after, actorId);
      if (error) return error;
      db.users[index] = after;
      return { ...after };
    },
    async setActive(id, active, actorId) {
      const index = db.users.findIndex((u) => u.id === id);
      if (index === -1) return "not-found";
      const before = db.users[index];
      const after = { ...before, active };
      const error = check(before, after, actorId);
      if (error) return error;
      db.users[index] = after;
      return { ...after };
    },
  };
}

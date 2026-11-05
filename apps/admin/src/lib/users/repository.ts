import { and, eq, ne, sql } from "drizzle-orm";

import type { Database } from "@/db";
import { newId } from "@/db/ids";
import { toUser } from "@/db/mappers";
import { cafes, users } from "@/db/schema";
import type { User } from "@/lib/auth/roles";

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

/** 백엔드를 바꾸면 이 인터페이스의 구현만 교체한다. */
export interface UserRepository {
  /** 재직 중인 직원 먼저, 같으면 관리자 먼저·이름순 */
  list(): Promise<User[]>;
  get(id: string): Promise<User | null>;
  /** 로그인 확인용: 이메일(대소문자 무시)로 직원과 비밀번호 해시를 찾는다. */
  findForLogin(email: string): Promise<{ user: User; passwordHash: string | null } | null>;
  create(input: UserInput, passwordHash: string): Promise<User | UserSaveError>;
  /** actorId: 수정하는 사람. 자기 역할은 바꿀 수 없다. passwordHash를 주면 비밀번호도 바꾼다. */
  update(id: string, input: UserInput, actorId: string, passwordHash?: string): Promise<User | UserSaveError>;
  /** 퇴사(false)·복직(true). 자기 자신은 퇴사 처리할 수 없다. */
  setActive(id: string, active: boolean, actorId: string): Promise<User | UserSaveError>;
}

export const byUserOrder = (a: User, b: User) =>
  Number(b.active) - Number(a.active) ||
  Number(a.role !== "admin") - Number(b.role !== "admin") ||
  a.name.localeCompare(b.name, "ko");

// 관리자는 모든 매장을 관리하므로 소속 매장을 두지 않는다.
const normalize = (user: User): User => (user.role === "admin" ? { ...user, cafeId: undefined } : user);

export function createUserRepository(db: Database): UserRepository {
  const emailTaken = async (email: string, exceptId?: string) =>
    (
      await db
        .select({ id: users.id })
        .from(users)
        .where(and(sql`lower(${users.email}) = ${email.toLowerCase()}`, exceptId ? ne(users.id, exceptId) : undefined))
    ).length > 0;
  const openCafe = async (cafeId?: string) =>
    Boolean(cafeId) &&
    (await db.select({ id: cafes.id }).from(cafes).where(and(eq(cafes.id, cafeId!), eq(cafes.status, "open"))))
      .length > 0;
  const otherActiveAdmins = async (id: string) =>
    (
      await db
        .select({ id: users.id })
        .from(users)
        .where(and(ne(users.id, id), eq(users.active, true), eq(users.role, "admin")))
    ).length;

  /** 바뀐 뒤의 user가 규칙에 맞는지 */
  async function check(before: User | undefined, after: User, actorId?: string): Promise<UserSaveError | null> {
    if (await emailTaken(after.email, before?.id)) return "duplicate-email";
    if (before && before.id === actorId) {
      if (after.role !== before.role || !after.active) return "self";
    }
    const losesAdmin = before?.role === "admin" && before.active && (after.role !== "admin" || !after.active);
    if (losesAdmin && (await otherActiveAdmins(before.id)) === 0) return "last-admin";
    // 스태프의 소속 매장은 운영 중이어야 한다. 이미 폐점한 매장의 퇴사자는 그대로 둘 수 있다.
    const cafeChanged = after.cafeId !== before?.cafeId || (after.active && !before?.active);
    if (after.role === "staff" && after.active && cafeChanged && !(await openCafe(after.cafeId))) {
      return "cafe-unavailable";
    }
    return null;
  }

  const save = (u: User, passwordHash?: string) => ({
    name: u.name,
    email: u.email,
    role: u.role,
    cafeId: u.cafeId ?? null,
    active: u.active,
    ...(passwordHash ? { passwordHash } : {}),
  });

  return {
    async list() {
      return (await db.select().from(users)).map(toUser).sort(byUserOrder);
    },

    async get(id) {
      const [row] = await db.select().from(users).where(eq(users.id, id));
      return row ? toUser(row) : null;
    },

    async findForLogin(email) {
      const [row] = await db
        .select()
        .from(users)
        .where(sql`lower(${users.email}) = ${email.trim().toLowerCase()}`);
      return row ? { user: toUser(row), passwordHash: row.passwordHash } : null;
    },

    async create(input, passwordHash) {
      const user = normalize({ ...input, id: newId("u"), active: true });
      const error = await check(undefined, user);
      if (error) return error;
      await db.insert(users).values({ id: user.id, ...save(user, passwordHash) });
      return user;
    },

    async update(id, input, actorId, passwordHash) {
      const before = await this.get(id);
      if (!before) return "not-found";
      const after = normalize({ ...before, cafeId: undefined, ...input, id });
      const error = await check(before, after, actorId);
      if (error) return error;
      await db.update(users).set(save(after, passwordHash)).where(eq(users.id, id));
      return after;
    },

    async setActive(id, active, actorId) {
      const before = await this.get(id);
      if (!before) return "not-found";
      const after = { ...before, active };
      const error = await check(before, after, actorId);
      if (error) return error;
      await db.update(users).set({ active }).where(eq(users.id, id));
      return after;
    },
  };
}

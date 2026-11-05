import { describe, expect, it } from "vitest";

import { eq } from "drizzle-orm";

import { cafes } from "@/db/schema";
import { createTestDb } from "@/db/testing";

import { createUserRepository } from "./repository";
import { type UserInput } from "@/entities/user";
import { changePasswordSchema, userInputSchema } from "@/entities/user/schema";

const ADMIN = "u_admin";
const staff = (patch: Partial<UserInput> = {}): UserInput => ({
  name: "한스태프",
  email: "han@example.com",
  role: "staff",
  cafeId: "c_dunsan",
  ...patch,
});

const HASH = "$2b$10$abcdefghijklmnopqrstuuWb0FHpIHQmFH5L4nXfIMR6t2kUzLqaa";

async function setup() {
  const db = await createTestDb({ plays: [], reservations: [], waitlist: [] }, new Date(), HASH);
  return { db, repo: createUserRepository(db) };
}

describe("UserRepository", () => {
  it("목록은 재직 먼저, 관리자 먼저, 이름순이다", async () => {
    const { repo } = await setup();
    const users = await repo.list();
    expect(users[0].id).toBe(ADMIN);
    expect(users.at(-1)?.active).toBe(false);
  });

  it("등록하면 재직 중이고, 이메일이 겹치거나(대소문자 무시) 운영 중이 아닌 매장이면 안 된다", async () => {
    const { db, repo } = await setup();
    expect(await repo.create(staff(), HASH)).toMatchObject({ active: true });
    expect(await repo.create(staff({ email: "HAN@example.com" }), HASH)).toBe("duplicate-email");
    expect(await repo.create(staff({ email: "x@example.com", cafeId: "nope" }), HASH)).toBe(
      "cafe-unavailable",
    );
    await db.update(cafes).set({ status: "closed" }).where(eq(cafes.id, "c_seomyeon"));
    expect(await repo.create(staff({ email: "y@example.com", cafeId: "c_seomyeon" }), HASH)).toBe(
      "cafe-unavailable",
    );
  });

  it("자기 역할은 바꿀 수 없고, 자신은 퇴사 처리할 수 없다", async () => {
    const { repo } = await setup();
    const me = { name: "김관리", email: "admin@example.com", role: "staff" as const, cafeId: "c_gangnam" };
    expect(await repo.update(ADMIN, me, ADMIN)).toBe("self");
    expect(await repo.setActive(ADMIN, false, ADMIN)).toBe("self");
    // 이름은 바꿀 수 있다.
    expect(
      await repo.update(ADMIN, { name: "김본사", email: "admin@example.com", role: "admin" }, ADMIN),
    ).toMatchObject({ name: "김본사" });
  });

  it("재직 중인 마지막 관리자는 강등·퇴사시킬 수 없다", async () => {
    const { repo } = await setup();
    const other = await repo.create(staff({ role: "admin", email: "boss@example.com" }), HASH);
    if (typeof other === "string") throw new Error(other);
    // 다른 관리자가 있으면 강등할 수 있다.
    expect(await repo.setActive(ADMIN, false, other.id)).toMatchObject({ active: false });
    expect(await repo.setActive(other.id, false, "someone")).toBe("last-admin");
  });

  it("관리자는 소속 매장이 없고, 비밀번호는 바꿀 때만 바뀐다", async () => {
    const { repo } = await setup();
    const created = await repo.create(staff({ role: "admin", email: "a2@example.com", cafeId: "c_dunsan" }), HASH);
    expect(created).toMatchObject({ role: "admin", cafeId: undefined });
    if (typeof created === "string") throw new Error(created);

    await repo.update(created.id, { name: "이름만", email: "a2@example.com", role: "admin" }, ADMIN);
    expect((await repo.findForLogin("a2@example.com"))?.passwordHash).toBe(HASH);
    await repo.update(created.id, { name: "이름만", email: "a2@example.com", role: "admin" }, ADMIN, "new-hash");
    expect((await repo.findForLogin("A2@EXAMPLE.COM "))?.passwordHash).toBe("new-hash");
  });

  it("관리자가 정한 비밀번호는 임시라 다음 로그인 때 바꿔야 하고, 본인이 바꾸면 풀린다", async () => {
    const { repo } = await setup();
    const created = await repo.create(staff({ email: "temp@example.com" }), HASH);
    if (typeof created === "string") throw new Error(created);
    expect((await repo.get(created.id))?.mustChangePassword).toBe(true);

    expect(await repo.changeOwnPassword(created.id, "own-hash")).toBe(true);
    expect((await repo.get(created.id))?.mustChangePassword).toBe(false);

    // 관리자가 다른 직원의 비밀번호를 재설정하면 다시 임시
    await repo.update(created.id, staff({ email: "temp@example.com" }), ADMIN, "reset-hash");
    expect((await repo.get(created.id))?.mustChangePassword).toBe(true);
    // 비밀번호 없이 정보만 고치면 그대로
    await repo.changeOwnPassword(created.id, "own-hash-2");
    await repo.update(created.id, staff({ email: "temp@example.com", name: "이름만" }), ADMIN);
    expect((await repo.get(created.id))?.mustChangePassword).toBe(false);
    // 자기 비밀번호를 직원 관리에서 바꾸면 임시가 아니다
    await repo.update(ADMIN, { name: "김관리", email: "admin@example.com", role: "admin" }, ADMIN, "mine");
    expect((await repo.get(ADMIN))?.mustChangePassword).toBe(false);
  });

  it("로그인 조회: 이메일 대소문자를 무시하고, 퇴사자도 찾되 재직 여부를 알려준다", async () => {
    const { repo } = await setup();
    expect(await repo.findForLogin("Admin@Example.com")).toMatchObject({ user: { id: ADMIN, active: true }, passwordHash: HASH });
    expect((await repo.findForLogin("left@example.com"))?.user.active).toBe(false);
    expect(await repo.findForLogin("nobody@example.com")).toBeNull();
  });
});

describe("userInputSchema", () => {
  it("스태프는 소속 매장이 필요하고, 이메일은 소문자로 맞춘다", () => {
    const missing = userInputSchema.safeParse({ ...staff(), cafeId: "" });
    expect(missing.error?.flatten().fieldErrors).toEqual({
      cafeId: ["스태프는 소속 매장을 선택해주세요."],
    });
    expect(userInputSchema.parse({ ...staff(), email: " Han@Example.com " }).email).toBe(
      "han@example.com",
    );
    expect(userInputSchema.safeParse({ ...staff(), email: "nope" }).success).toBe(false);
  });
});

describe("changePasswordSchema", () => {
  it("새 비밀번호는 8자 이상, 확인과 같아야 하고 지금 비밀번호와 달라야 한다", () => {
    const errors = (v: Record<string, string>) =>
      changePasswordSchema.safeParse(v).error?.flatten().fieldErrors ?? {};
    expect(errors({ current: "", next: "short", confirm: "x" })).toMatchObject({
      current: expect.any(Array),
      next: expect.any(Array),
    });
    expect(errors({ current: "old-pass-1", next: "new-pass-1", confirm: "new-pass-2" })).toEqual({
      confirm: ["새 비밀번호가 서로 다릅니다."],
    });
    expect(errors({ current: "same-pass-1", next: "same-pass-1", confirm: "same-pass-1" })).toEqual({
      next: ["지금 비밀번호와 다른 비밀번호를 정해주세요."],
    });
    expect(changePasswordSchema.safeParse({ current: "old-pass-1", next: "new-pass-1", confirm: "new-pass-1" }).success).toBe(true);
  });
});

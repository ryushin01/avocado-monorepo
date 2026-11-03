import { describe, expect, it } from "vitest";

import { findActiveUser } from "@/lib/auth/mock-users";
import { createMockDb } from "@/lib/mock-db";

import { createUserRepository } from "./repository";
import { userInputSchema, type UserInput } from "./schema";

const ADMIN = "u_admin";
const staff = (patch: Partial<UserInput> = {}): UserInput => ({
  name: "한스태프",
  email: "han@example.com",
  role: "staff",
  cafeId: "c_dunsan",
  ...patch,
});

function setup() {
  const db = createMockDb();
  return { db, repo: createUserRepository(db) };
}

describe("UserRepository", () => {
  it("목록은 재직 먼저, 관리자 먼저, 이름순이다", async () => {
    const { repo } = setup();
    const users = await repo.list();
    expect(users[0].id).toBe(ADMIN);
    expect(users.at(-1)?.active).toBe(false);
  });

  it("등록하면 재직 중이고, 이메일이 겹치거나(대소문자 무시) 운영 중이 아닌 매장이면 안 된다", async () => {
    const { db, repo } = setup();
    expect(await repo.create(staff())).toMatchObject({ id: "u_6", active: true });
    expect(await repo.create(staff({ email: "HAN@example.com" }))).toBe("duplicate-email");
    expect(await repo.create(staff({ email: "x@example.com", cafeId: "nope" }))).toBe(
      "cafe-unavailable",
    );
    db.cafes.find((c) => c.id === "c_seomyeon")!.status = "closed";
    expect(await repo.create(staff({ email: "y@example.com", cafeId: "c_seomyeon" }))).toBe(
      "cafe-unavailable",
    );
  });

  it("자기 역할은 바꿀 수 없고, 자신은 퇴사 처리할 수 없다", async () => {
    const { repo } = setup();
    const me = { name: "김관리", email: "admin@example.com", role: "staff" as const, cafeId: "c_gangnam" };
    expect(await repo.update(ADMIN, me, ADMIN)).toBe("self");
    expect(await repo.setActive(ADMIN, false, ADMIN)).toBe("self");
    // 이름은 바꿀 수 있다.
    expect(
      await repo.update(ADMIN, { name: "김본사", email: "admin@example.com", role: "admin" }, ADMIN),
    ).toMatchObject({ name: "김본사" });
  });

  it("재직 중인 마지막 관리자는 강등·퇴사시킬 수 없다", async () => {
    const { repo } = setup();
    const other = await repo.create(staff({ role: "admin", email: "boss@example.com" }));
    if (typeof other === "string") throw new Error(other);
    // 다른 관리자가 있으면 강등할 수 있다.
    expect(await repo.setActive(ADMIN, false, other.id)).toMatchObject({ active: false });
    expect(await repo.setActive(other.id, false, "someone")).toBe("last-admin");
  });

  it("관리자는 소속 매장이 없고, 퇴사·복직하면 계정 전환 대상이 바뀐다", async () => {
    const { db, repo } = setup();
    const created = await repo.create(staff({ role: "admin", email: "a2@example.com", cafeId: "c_dunsan" }));
    expect(created).toMatchObject({ role: "admin", cafeId: undefined });

    expect(findActiveUser(db.users, "u_staff_left").id).toBe(ADMIN); // 퇴사자 쿠키 → 관리자
    await repo.setActive("u_staff_left", true, ADMIN);
    expect(findActiveUser(db.users, "u_staff_left").id).toBe("u_staff_left");
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

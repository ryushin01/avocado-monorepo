import { describe, expect, it } from "vitest";

import { openPglite } from "@/db";
import { createTestDb } from "@/db/testing";

import { createFirstAdmin, generateTemporaryPassword } from "./first-admin";
import { createUserRepository } from "./repository";
import { passwordSchema } from "./schema";

const HASH = "$2b$10$abcdefghijklmnopqrstuuWb0FHpIHQmFH5L4nXfIMR6t2kUzLqaa";

describe("createFirstAdmin", () => {
  it("빈 DB에는 임시 비밀번호 상태의 관리자를 만들고, 두 번째부터는 만들지 않는다", async () => {
    const db = await openPglite("memory://");
    const admin = await createFirstAdmin(db, { name: " 박대표 ", email: " Owner@Example.com " }, HASH);
    expect(admin).toMatchObject({ name: "박대표", email: "owner@example.com", role: "admin", mustChangePassword: true });

    const login = await createUserRepository(db).findForLogin("owner@example.com");
    expect(login?.passwordHash).toBe(HASH);
    expect(login?.user).toMatchObject({ active: true, mustChangePassword: true });

    expect(await createFirstAdmin(db, { name: "또대표", email: "other@example.com" }, HASH)).toEqual({
      error: "admin-exists",
    });
  });

  it("재직 중인 관리자가 있는 DB(시드)에는 만들지 않는다", async () => {
    const db = await createTestDb();
    expect(await createFirstAdmin(db, { name: "박대표", email: "owner@example.com" }, HASH)).toEqual({
      error: "admin-exists",
    });
  });

  it("이름·이메일 형식이 틀리면 이유를 돌려준다", async () => {
    const db = await openPglite("memory://");
    expect(await createFirstAdmin(db, { name: "", email: "not-an-email" }, HASH)).toEqual({
      error: "invalid",
      message: "이름을 입력해주세요. 이메일 형식이 올바르지 않습니다.",
    });
  });
});

describe("generateTemporaryPassword", () => {
  it("비밀번호 규칙에 맞고, 헷갈리는 글자가 없고, 매번 다르다", () => {
    const a = generateTemporaryPassword();
    expect(passwordSchema.safeParse(a).success).toBe(true);
    expect(a).toMatch(/^[a-km-zA-HJ-NP-Z2-9]{16}$/);
    expect(generateTemporaryPassword()).not.toBe(a);
  });
});

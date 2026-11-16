import { describe, expect, it } from "vitest";

import { openPglite } from "@/db/index";
import { createTestDb } from "@/db/testing";

import { createFirstAdmin, generateTemporaryPassword, TEMPORARY_PASSWORD_CHARS } from "./first-admin";
import { createUserRepository } from "./repository";
import { passwordSchema } from "@/entities/user/schema";

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

  it("글자를 고르게 뽑는다 (바이트 % 57처럼 앞쪽 글자가 1.25배 더 나오지 않는다)", () => {
    const counts = new Map<string, number>();
    for (let i = 0; i < 1800; i++) {
      for (const c of generateTemporaryPassword(64)) counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    // 글자마다 약 2,000번. 고르면 최대·최소 비율이 1.2를 넘을 일이 거의 없다(표준편차 약 2%).
    expect(counts.size).toBe(TEMPORARY_PASSWORD_CHARS.length);
    const values = [...counts.values()];
    expect(Math.max(...values) / Math.min(...values)).toBeLessThan(1.2);
  });
});

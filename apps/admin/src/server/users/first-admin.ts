import { randomBytes } from "node:crypto";

import { and, eq } from "drizzle-orm";

import type { Database } from "@/db/index";
import { users } from "@/db/schema";
import type { User } from "@/entities/user";

import { createUserRepository, type UserSaveError } from "./repository";
import { userInputSchema } from "@/entities/user/schema";

/**
 * - admin-exists: 재직 중인 관리자가 이미 있음. 그다음 계정은 직원 관리 화면에서 만든다.
 * - invalid: 이름·이메일 형식이 맞지 않음 (message에 이유)
 */
export type FirstAdminError =
  | { error: "admin-exists" }
  | { error: "invalid"; message: string }
  | { error: UserSaveError };

/** 첫 로그인 때 바꿀 임시 비밀번호. 사람이 옮겨 적기 쉽게 헷갈리는 글자(0·O·1·l·I)는 뺀다. */
export function generateTemporaryPassword(length = 16): string {
  const chars = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(randomBytes(length), (b) => chars[b % chars.length]).join("");
}

/**
 * 운영 DB에 첫 관리자를 만든다. 재직 중인 관리자가 하나라도 있으면 만들지 않는다.
 * 만든 계정은 임시 비밀번호 상태라 첫 로그인 때 비밀번호를 바꿔야 한다.
 */
export async function createFirstAdmin(
  db: Database,
  input: { name: string; email: string },
  passwordHash: string,
): Promise<User | FirstAdminError> {
  const parsed = userInputSchema.safeParse({ ...input, role: "admin" });
  if (!parsed.success) return { error: "invalid", message: parsed.error.issues.map((i) => i.message).join(" ") };

  const admins = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.role, "admin"), eq(users.active, true)));
  if (admins.length > 0) return { error: "admin-exists" };

  const result = await createUserRepository(db).create(parsed.data, passwordHash);
  return typeof result === "string" ? { error: result } : result;
}

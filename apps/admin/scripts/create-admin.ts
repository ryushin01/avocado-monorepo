/**
 * 운영 DB에 첫 관리자를 만든다. 재직 중인 관리자가 이미 있으면 아무것도 하지 않는다.
 *
 *   DATABASE_URL=postgres://… pnpm --filter @avocado/admin create-admin --email owner@example.com --name 박대표
 *
 * - 마이그레이션을 먼저 적용한다(서버를 처음 띄울 때와 같음).
 * - 임시 비밀번호를 한 번만 화면에 보여 준다. 첫 로그인 때 본인이 바꿔야 한다.
 * - DATABASE_URL이 없으면 PGLITE_DATA_DIR(기본 .data/pglite)의 PGlite에 만든다.
 */
import { parseArgs } from "node:util";

import { hash } from "bcryptjs";

import { type Database, openPglite, openPostgres } from "@/db/index";
import { createFirstAdmin, generateTemporaryPassword } from "@/server/users/first-admin";

const MESSAGES = {
  "admin-exists": "재직 중인 관리자가 이미 있어 만들지 않았습니다. 다음 계정은 백오피스의 직원 관리에서 만드세요.",
  "duplicate-email": "이미 쓰는 이메일입니다.",
} as const;

async function main(): Promise<number> {
  const { values } = parseArgs({ options: { email: { type: "string" }, name: { type: "string" } } });
  if (!values.email || !values.name) {
    console.error("사용법: pnpm --filter @avocado/admin create-admin --email <이메일> --name <이름>");
    return 1;
  }

  const url = process.env.DATABASE_URL;
  const db: Database = url ? await openPostgres(url) : await openPglite(process.env.PGLITE_DATA_DIR ?? ".data/pglite");
  console.log(url ? "PostgreSQL(DATABASE_URL)에 연결했습니다." : "DATABASE_URL이 없어 PGlite에 만듭니다.");

  const password = generateTemporaryPassword();
  const result = await createFirstAdmin(db, { email: values.email, name: values.name }, await hash(password, 10));
  if ("error" in result) {
    const message =
      result.error === "invalid" ? result.message : (MESSAGES[result.error as keyof typeof MESSAGES] ?? result.error);
    console.error(message);
    return 1;
  }

  console.log(`관리자를 만들었습니다: ${result.name} <${result.email}>`);
  console.log(`임시 비밀번호: ${password}`);
  console.log("이 비밀번호는 다시 볼 수 없습니다. 본인에게만 전하고, 첫 로그인 때 새 비밀번호로 바꾸게 됩니다.");
  return 0;
}

// DB 연결이 열려 있어 프로세스가 끝나지 않으므로 직접 종료한다.
main().then(
  (code) => process.exit(code),
  (error) => {
    console.error(error);
    process.exit(1);
  },
);

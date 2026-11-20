/**
 * 백업 SQL(pg_dump 형식)로 개발용 PGlite DB를 새로 만든다. 복원 시험에 쓴다(docs/deployment.md의 "백업과 복원").
 *
 *   pnpm --filter @avocado/admin db:restore <백업 파일> [새 DB 폴더]   # 기본: .data/pglite-restored
 *   PGLITE_DATA_DIR=.data/pglite-restored pnpm --filter @avocado/admin dev   # 복원한 DB로 띄워 확인
 *
 * 운영 PostgreSQL은 빈 DB를 만든 뒤 psql로 복원한다: psql "$RESTORE_DATABASE_URL" -v ON_ERROR_STOP=1 -f <백업 파일>
 * 이미 있는 폴더에는 복원하지 않는다(지금 쓰는 DB를 덮어쓰지 않게).
 */
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { PGlite } from "@electric-sql/pglite";

import { openPglite } from "@/db/index";

async function main() {
  const [file, dataDir = ".data/pglite-restored"] = process.argv.slice(2);
  if (!file) {
    console.error("백업 파일을 정해 주세요. 예: pnpm --filter @avocado/admin db:restore backups/avocado-202611160300.sql");
    return 1;
  }
  if (existsSync(dataDir)) {
    console.error(`${dataDir}가 이미 있습니다. 다른 폴더를 정하거나 지운 뒤 다시 실행하세요.`);
    return 1;
  }
  // PGlite는 위 폴더를 만들지 않으므로 먼저 만든다(.data가 없는 새 작업 환경).
  mkdirSync(path.dirname(path.resolve(dataDir)), { recursive: true });
  const pg = new PGlite(dataDir);
  await pg.exec(readFileSync(file, "utf8"));
  await pg.close();
  // 서버가 처음 열 때처럼 마이그레이션을 적용해, 백업 뒤에 추가된 마이그레이션이 있으면 이어서 올린다.
  await openPglite(dataDir);
  console.log(`${file}을(를) ${dataDir}에 복원했습니다. PGLITE_DATA_DIR=${dataDir}로 띄워 확인하세요.`);
  return 0;
}

/** 오류 코드만 꺼낸다. 오류 내용에는 실패한 SQL(백업에 든 손님 이름·전화번호)이 들 수 있어 그대로 찍지 않는다. */
const errorCode = (error: unknown) => {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === "string" ? ` (오류 코드 ${code})` : "";
};

// DB 연결이 열려 있어 프로세스가 끝나지 않으므로 직접 종료한다.
main().then(
  (code) => process.exit(code),
  (error) => {
    console.error(`복원하지 못했습니다${errorCode(error)}. pg_dump 형식의 백업 파일인지 확인하고, 새 폴더로 다시 실행하세요.`);
    process.exit(1);
  },
);

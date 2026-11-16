/**
 * DB 백업을 일반 SQL 파일(pg_dump 형식)로 만든다. 복원 방법은 docs/deployment.md의 "백업과 복원"에 있다.
 *
 *   pnpm --filter @avocado/admin db:backup [파일]          # 기본: backups/avocado-<시각>.sql
 *
 * - DATABASE_URL이 있으면 PostgreSQL 클라이언트 도구의 pg_dump를 부른다(설치 필요: macOS는 brew install libpq).
 * - 없으면 개발 DB(PGLITE_DATA_DIR, 기본 .data/pglite)를 PGlite의 pg_dump(WASM)로 내보낸다.
 * 백업에는 손님 이름·휴대전화가 들어 있다. 저장소에 넣지 말고(backups/는 git 제외) 접근을 제한한 곳에 보관한다.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { pgDump } from "@electric-sql/pglite-tools/pg_dump";

async function main() {
  const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
  const file = path.resolve(process.argv[2] ?? `backups/avocado-${stamp}.sql`);
  mkdirSync(path.dirname(file), { recursive: true });
  // 복원하는 쪽의 계정·권한과 상관없이 쓸 수 있게 소유자·권한 구문은 빼고 만든다.
  const options = ["--no-owner", "--no-privileges"];

  const url = process.env.DATABASE_URL;
  if (url) {
    const result = spawnSync("pg_dump", [...options, "--file", file, url], { stdio: "inherit" });
    if (result.error) {
      console.error("pg_dump를 실행하지 못했습니다. PostgreSQL 클라이언트 도구를 설치하거나 호스팅의 백업 기능을 쓰세요.", result.error.message);
      return 1;
    }
    if (result.status !== 0) return result.status ?? 1;
  } else {
    const dataDir = process.env.PGLITE_DATA_DIR ?? ".data/pglite";
    // 없는 폴더를 열면 PGlite가 빈 DB를 새로 만들어 버리므로 먼저 확인한다.
    if (!existsSync(dataDir)) {
      console.error(`${dataDir}에 개발 DB가 없습니다. pnpm dev로 한 번 띄우면 만들어집니다.`);
      return 1;
    }
    const pg = new PGlite(dataDir);
    writeFileSync(file, await (await pgDump({ pg, args: options })).text());
    await pg.close();
  }
  console.log(`백업을 만들었습니다: ${file}`);
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

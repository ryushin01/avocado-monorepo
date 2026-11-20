/**
 * DB 백업을 일반 SQL 파일(pg_dump 형식)로 만든다. 복원 방법은 docs/deployment.md의 "백업과 복원"에 있다.
 *
 *   pnpm --filter @avocado/admin db:backup [파일]          # 기본: backups/avocado-<시각>.sql
 *
 * - DATABASE_URL이 있으면 PostgreSQL 클라이언트 도구의 pg_dump를 부른다(설치 필요: macOS는 brew install libpq).
 * - 없으면 개발 DB(PGLITE_DATA_DIR, 기본 .data/pglite)를 PGlite의 pg_dump(WASM)로 내보낸다.
 * 백업에는 손님 이름·휴대전화가 들어 있다. 이 계정만 읽게 만들고(파일 0600, 기본 폴더 0700),
 * 저장소에 넣지 말고(backups/는 git 제외) 접근을 제한한 곳에 보관한다.
 */
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { chmodSync, closeSync, existsSync, mkdirSync, openSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { pgDump } from "@electric-sql/pglite-tools/pg_dump";

async function main() {
  // 같은 분·초에 다시 실행해도 앞 백업을 덮지 않게 초 단위 시각과 임의 꼬리표를 붙인다. 직접 정한 경로는 그대로 쓴다.
  const stamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, "");
  const chosen = process.argv[2];
  const file = path.resolve(chosen ?? `backups/avocado-${stamp}-${randomBytes(3).toString("hex")}.sql`);
  mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  if (!chosen) chmodSync(path.dirname(file), 0o700);
  // 내용을 쓰기 전에 이 계정만 읽을 수 있는 빈 파일로 만든다(pg_dump도 이 파일에 이어 쓴다).
  closeSync(openSync(file, "w", 0o600));
  chmodSync(file, 0o600);
  try {
    const code = await dump(file);
    if (code !== 0) rmSync(file, { force: true });
    else console.log(`백업을 만들었습니다: ${file}`);
    return code;
  } catch (error) {
    // 덜 만든 백업을 정상 백업으로 착각하지 않게 지운다.
    rmSync(file, { force: true });
    throw error;
  }
}

async function dump(file: string) {
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
    writeFileSync(file, await (await pgDump({ pg, args: options })).text(), { mode: 0o600 });
    await pg.close();
  }
  return 0;
}

/** 오류 코드만 꺼낸다. 오류 내용에는 실패한 SQL(손님 이름·전화번호)이 들 수 있어 그대로 찍지 않는다. */
const errorCode = (error: unknown) => {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === "string" ? ` (오류 코드 ${code})` : "";
};

// DB 연결이 열려 있어 프로세스가 끝나지 않으므로 직접 종료한다.
main().then(
  (code) => process.exit(code),
  (error) => {
    console.error(`백업하지 못했습니다${errorCode(error)}. DB 주소와 PostgreSQL 클라이언트 도구를 확인하세요.`);
    process.exit(1);
  },
);

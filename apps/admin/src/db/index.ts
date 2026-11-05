import { mkdirSync } from "node:fs";
import path from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import { migrate as migratePostgres } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

import * as schema from "./schema";

/** PGlite·PostgreSQL 어느 쪽이든 같은 쿼리를 쓴다. */
export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

/** 마이그레이션 SQL 위치 (앱 폴더에서 실행한다고 가정: next dev·start, vitest 모두 apps/admin이 작업 폴더) */
const MIGRATIONS = path.join(process.cwd(), "src/db/migrations");

/**
 * Node 안에서 도는 PostgreSQL(PGlite). 개발·테스트용.
 * dataDir: 폴더 경로면 파일로 남고, "memory://"면 메모리에만 둔다(프로세스가 끝나면 사라짐).
 */
export async function openPglite(dataDir = "memory://"): Promise<Database> {
  // PGlite는 상위 폴더까지 만들어 주지 않아, 처음 내려받은 저장소에서 .data/pglite를 열면 실패한다.
  if (!dataDir.includes("://")) mkdirSync(dataDir, { recursive: true });
  const db = drizzlePglite({ client: new PGlite(dataDir), schema });
  await migratePglite(db, { migrationsFolder: MIGRATIONS });
  return db as unknown as Database;
}

/** 실제 PostgreSQL. DATABASE_URL로 연결한다. */
export async function openPostgres(url: string): Promise<Database> {
  const db = drizzlePostgres({ client: postgres(url, { max: 10 }), schema });
  await migratePostgres(db, { migrationsFolder: MIGRATIONS });
  return db as unknown as Database;
}

export { schema };

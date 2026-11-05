import "server-only";

import { hash } from "bcryptjs";

import { DEV_PASSWORD } from "@/server/auth/mock-users";

import { type Database, openPglite, openPostgres } from "./index";
import { insertSeedData, isEmpty } from "./seed";
import { createSeedData } from "./seed-data";

/**
 * 서버 전체가 함께 쓰는 DB 연결.
 * - DATABASE_URL이 있으면 PostgreSQL, 없으면 PGlite(PGLITE_DATA_DIR, 기본 .data/pglite).
 * - 처음 열 때 마이그레이션을 적용하고, 비어 있으면 개발용 시드를 넣는다(운영에서는 SEED_DEMO=1일 때만).
 * 개발 서버 HMR로 모듈이 다시 로드돼도 연결을 유지하도록 globalThis에 보관한다.
 */
const globalForDb = globalThis as { dbPromise?: Promise<Database> };

export function getDb(): Promise<Database> {
  return (globalForDb.dbPromise ??= open().catch((error) => {
    globalForDb.dbPromise = undefined;
    throw error;
  }));
}

async function open() {
  const url = process.env.DATABASE_URL;
  const db = url
    ? await openPostgres(url)
    : await openPglite(process.env.PGLITE_DATA_DIR ?? ".data/pglite");
  const seedAllowed = process.env.NODE_ENV !== "production" || process.env.SEED_DEMO === "1";
  if (seedAllowed && (await isEmpty(db))) {
    await insertSeedData(db, createSeedData(), await hash(DEV_PASSWORD, 10));
  }
  return db;
}

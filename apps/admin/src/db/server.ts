import "server-only";

import { hash } from "bcryptjs";
import { PHASE_PRODUCTION_BUILD } from "next/constants";

import { DEV_PASSWORD } from "@/server/auth/mock-users";
import { DEMO_RESET_MINUTES, isDemoMode } from "@/shared/config";

import { openDemoProxyDb } from "./demo-proxy";
import { type Database, openPglite, openPostgres } from "./index";
import { insertSeedData, isEmpty } from "./seed";
import { createSeedData } from "./seed-data";

/**
 * 서버 전체가 함께 쓰는 DB 연결.
 * - DATABASE_URL이 있으면 PostgreSQL, 없으면 PGlite(PGLITE_DATA_DIR, 기본 .data/pglite).
 * - 처음 열 때 마이그레이션을 적용하고, 비어 있으면 개발용 시드를 넣는다(운영에서는 SEED_DEMO=1일 때만).
 * - 공개 데모(NEXT_PUBLIC_DEMO_MODE=1)는 메모리 PGlite 하나를 /api/demo/db로 함께 쓴다(getDemoOwnerDb, demo-proxy.ts).
 * 개발 서버 HMR로 모듈이 다시 로드돼도 연결을 유지하도록 globalThis에 보관한다.
 */
const globalForDb = globalThis as { dbPromise?: Promise<Database>; dbOpenedAt?: number; demoProxyDb?: Database };

export function getDb(): Promise<Database> {
  // 빌드 중(정적 화면 미리 만들기)에는 배포가 아직 없으므로 데모도 이 프로세스의 메모리 DB를 쓴다.
  if (isDemoMode() && process.env.NEXT_PHASE !== PHASE_PRODUCTION_BUILD) {
    return Promise.resolve((globalForDb.demoProxyDb ??= openDemoProxyDb(demoBaseUrl())));
  }
  return getLocalDb();
}

/** 공개 데모의 실제 메모리 DB. /api/demo/db만 직접 쓰고, 나머지는 getDb()로 그 경로를 거친다. */
export function getDemoOwnerDb(): Promise<Database> {
  return getLocalDb();
}

/** 데모 배포의 공개 주소. Vercel의 배포별 주소는 배포 보호가 걸려 있어, 로그인 주소(NEXTAUTH_URL)나 운영 도메인을 쓴다. */
function demoBaseUrl(): string {
  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const url = process.env.NEXTAUTH_URL || (production ? `https://${production}` : "");
  if (!url) throw new Error("공개 데모는 NEXTAUTH_URL이 있어야 합니다.");
  return url;
}

function getLocalDb(): Promise<Database> {
  if (isDemoMode()) resetExpiredDemoDb();
  return (globalForDb.dbPromise ??= open().catch((error) => {
    globalForDb.dbPromise = undefined;
    throw error;
  }));
}

async function open() {
  const demo = isDemoMode();
  globalForDb.dbOpenedAt = Date.now();
  const url = demo ? undefined : process.env.DATABASE_URL;
  const db = url
    ? await openPostgres(url)
    : await openPglite(demo ? "memory://" : (process.env.PGLITE_DATA_DIR ?? ".data/pglite"));
  const seedAllowed = demo || process.env.NODE_ENV !== "production" || process.env.SEED_DEMO === "1";
  if (seedAllowed && (await isEmpty(db))) {
    await insertSeedData(db, createSeedData(), await hash(DEV_PASSWORD, 10));
  }
  return db;
}

/**
 * 방문자가 바꾼 데모 데이터를 되돌린다: 정해 둔 시간이 지난 메모리 DB를 버리고 다음 요청이 새로 만든다.
 * 아직 그 DB로 처리 중인 요청이 끝나도록 1분 뒤에 닫는다.
 */
function resetExpiredDemoDb() {
  const { dbPromise, dbOpenedAt } = globalForDb;
  if (!dbPromise || !dbOpenedAt || Date.now() - dbOpenedAt < DEMO_RESET_MINUTES * 60_000) return;
  globalForDb.dbPromise = undefined;
  globalForDb.dbOpenedAt = undefined;
  void dbPromise.then(
    (db) => {
      const client = pgliteOf(db);
      setTimeout(() => void client?.close().catch(() => {}), 60_000).unref?.();
    },
    () => {},
  );
}

/** Drizzle(PGlite) 안의 PGlite 연결 */
export function pgliteOf(db: Database) {
  return (db as unknown as { $client?: import("@electric-sql/pglite").PGlite }).$client;
}

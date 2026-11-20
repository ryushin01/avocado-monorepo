import "server-only";

import { eq, getTableName, isTable, sql } from "drizzle-orm";
import { integer, type PgTable, pgSchema, timestamp } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

import { type Database, MIGRATIONS } from "./index";
import * as schema from "./schema";
import { insertSeedData } from "./seed";
import type { SeedData } from "./seed-data";

/**
 * 공개 데모가 함께 쓰는 실제 PostgreSQL(Vercel에 붙인 Neon 무료 DB).
 * 메모리 PGlite는 인스턴스마다 따로 생겨, Vercel이 함수를 여러 대로 늘리면 화면마다 데이터가 갈라진다.
 * 데모 배포에 DATABASE_URL이 있으면 모든 함수가 이 DB를 직접 쓰고, 정해 둔 간격마다 시드로 되돌린다.
 * 없으면(로컬에서 켠 데모) 지금처럼 /api/demo/db의 메모리 PGlite를 함께 쓴다(demo-proxy.ts).
 */

export type DbTarget = "local" | "demo-shared" | "demo-proxy";

/**
 * 어느 DB를 쓸지 고른다.
 * - local: 데모가 아니면 DATABASE_URL(PostgreSQL) 또는 PGlite 파일. 데모 빌드 중(정적 화면 미리 만들기)에는 그 프로세스의 메모리 PGlite.
 * - demo-shared: 데모 + DATABASE_URL. 모든 함수가 같은 PostgreSQL을 직접 쓴다.
 * - demo-proxy: 데모 + DATABASE_URL 없음. 메모리 PGlite를 /api/demo/db 한 곳에 두고 HTTP로 함께 쓴다.
 */
export function selectDbTarget({
  demo,
  building,
  databaseUrl,
}: {
  demo: boolean;
  building: boolean;
  databaseUrl?: string;
}): DbTarget {
  if (!demo || building) return "local";
  return databaseUrl ? "demo-shared" : "demo-proxy";
}

/** 마이그레이션과 데모 되돌리기를 한 번에 한 곳만 하게 하는 PostgreSQL 권고 잠금 번호(임의의 고정값) */
export const DEMO_LOCK_KEY = 20_261_120;

/**
 * 공개 데모의 공유 DB를 연다. 마이그레이션은 잠금을 잡고 한 인스턴스씩 적용한다(처음 뜬 여러 함수가 함께 만들지 않게).
 * migrationUrl: 세션 잠금이 한 연결에 머물도록 풀러를 거치지 않는 주소(Neon의 DATABASE_URL_UNPOOLED). 없으면 url.
 */
export async function openSharedDemoDb(url: string, migrationUrl = url): Promise<Database> {
  const lockClient = postgres(migrationUrl, { max: 1, onnotice: () => {} });
  try {
    await lockClient`select pg_advisory_lock(${DEMO_LOCK_KEY})`;
    await migrate(drizzle({ client: lockClient }), { migrationsFolder: MIGRATIONS });
  } finally {
    // 연결을 닫으면 세션 잠금도 풀린다.
    await lockClient.end({ timeout: 5 });
  }
  // Neon 풀러(트랜잭션 모드)를 거치므로 준비된 문장은 쓰지 않는다.
  // 쉬는 연결은 닫아, 방문자가 없을 때 Neon이 잠들어 무료 계산 시간을 아끼게 한다.
  const client = postgres(url, { max: 5, prepare: false, idle_timeout: 20, onnotice: () => {} });
  return drizzle({ client, schema }) as unknown as Database;
}

/* ---------------- 정해 둔 간격마다 시드로 되돌리기 ---------------- */

/** 마지막으로 되돌린 시각. 앱 스키마(schema.ts)와 따로 두어 마이그레이션·되돌리기에 섞이지 않는다. */
const demoSchema = pgSchema("avocado_demo");
const resetState = demoSchema.table("reset_state", {
  id: integer("id").primaryKey(),
  resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
});

/** 되돌릴 때 비우는 앱 표 전부 (drizzle 마이그레이션 기록과 reset_state는 다른 스키마라 남는다) */
const APP_TABLES = Object.values(schema).flatMap((value) => (isTable(value) ? [getTableName(value as PgTable)] : []));

/** 잠금·표 잠금을 이보다 오래 기다리면 이번 되돌리기를 접고 잠시 뒤 다시 한다. */
const LOCK_TIMEOUT = "20s";

/**
 * not-due: 이 인스턴스가 아는 마지막 되돌린 시각으로 보아 아직 때가 아니다(DB에 묻지 않음).
 * fresh: DB에 물어보니 다른 인스턴스가 이미 되돌렸다. reset: 이 인스턴스가 되돌렸다.
 * failed: 실패해 그대로 두고 retryMs 뒤 다시 한다(요청은 계속한다).
 */
export type ResetOutcome = "not-due" | "fresh" | "reset" | "failed";

export type DemoResetter = (db: Database, now?: number) => Promise<ResetOutcome>;

type ResetterOptions = {
  /** 되돌리는 간격(밀리초) */
  intervalMs: number;
  /** 되돌릴 때 넣을 시드 */
  seed: (now: Date) => Promise<{ data: SeedData; passwordHash?: string }>;
  /** 실패한 뒤 다시 하기까지(밀리초) */
  retryMs?: number;
  onError?: (error: unknown) => void;
};

/**
 * 공유 DB를 정해 둔 간격마다 시드로 되돌리는 함수를 만든다(인스턴스마다 하나).
 * 크론(Hobby는 하루 한 번까지) 대신 요청이 올 때 확인한다.
 * 1. 이 인스턴스가 아는 마지막 되돌린 시각에서 간격이 지나지 않았으면 DB에 묻지 않고 돌아간다.
 * 2. 지났으면 트랜잭션 안에서 권고 잠금을 잡아 한 곳만 들어가게 하고, 마지막 되돌린 시각을 DB에서 다시 읽는다.
 *    다른 인스턴스가 이미 되돌렸으면 그 시각만 기억한다(이중 확인).
 * 3. 아직이면 앱 표를 모두 비우고(TRUNCATE) 시드를 넣고 시각을 적는다. 한 트랜잭션이라 다른 요청은 앞이나 뒤의 데이터만 본다.
 * 처음 쓰는 빈 DB는 시각이 없어 바로 시드를 넣는다.
 */
export function createDemoResetter({ intervalMs, seed, retryMs = 10_000, onError }: ResetterOptions): DemoResetter {
  let checkAfter = 0;
  let running: Promise<ResetOutcome> | undefined;

  async function run(db: Database, now: number): Promise<ResetOutcome> {
    try {
      const { outcome, resetAt } = await db.transaction(async (tx) => {
        await tx.execute(sql.raw(`set local lock_timeout = '${LOCK_TIMEOUT}'`));
        await tx.execute(sql`select pg_advisory_xact_lock(${DEMO_LOCK_KEY})`);
        await tx.execute(sql`create schema if not exists avocado_demo`);
        await tx.execute(
          sql`create table if not exists avocado_demo.reset_state (id integer primary key, reset_at timestamptz not null)`,
        );
        const [state] = await tx.select().from(resetState).where(eq(resetState.id, 1)).for("update");
        if (state && now - state.resetAt.getTime() < intervalMs) {
          return { outcome: "fresh" as const, resetAt: state.resetAt.getTime() };
        }
        const { data, passwordHash } = await seed(new Date(now));
        await tx.execute(sql.raw(`truncate table ${APP_TABLES.map((name) => `"${name}"`).join(", ")} restart identity cascade`));
        await insertSeedData(tx as unknown as Database, data, passwordHash);
        const resetAt = new Date(now);
        await tx
          .insert(resetState)
          .values({ id: 1, resetAt })
          .onConflictDoUpdate({ target: resetState.id, set: { resetAt } });
        return { outcome: "reset" as const, resetAt: now };
      });
      checkAfter = resetAt + intervalMs;
      return outcome;
    } catch (error) {
      checkAfter = now + retryMs;
      onError?.(error);
      return "failed";
    }
  }

  return (db, now = Date.now()) => {
    if (now < checkAfter) return Promise.resolve("not-due");
    // 한 인스턴스 안에서 동시에 온 요청은 같은 확인을 기다린다.
    return (running ??= run(db, now).finally(() => {
      running = undefined;
    }));
  };
}

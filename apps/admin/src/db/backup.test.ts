import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { pgDump } from "@electric-sql/pglite-tools/pg_dump";
import { getTableName, inArray, sql } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";
import { afterEach, describe, expect, it } from "vitest";

import { createReservationRepository } from "@/server/reservations/repository";

import { type Database, openPglite } from "./index";
import * as schema from "./schema";
import { createTestDb } from "./testing";

const tables = Object.values(schema as Record<string, unknown>).filter(
  (value): value is PgTable => value instanceof PgTable,
);

/** 표의 모든 줄을 기본 키 순서로 읽는다. 두 DB를 같은 순서로 비교하기 위해서다. */
async function rowsOf(db: Database, table: PgTable) {
  const name = getTableName(table);
  const { rows } = (await db.execute(sql.raw(`select * from "${name}" order by 1, 2`))) as unknown as { rows: unknown[] };
  return rows;
}

describe("백업과 복원(pg_dump)", () => {
  const dirs: string[] = [];
  afterEach(() => dirs.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true })));

  it("백업 SQL로 만든 새 DB는 모든 표가 같고, 앱이 마이그레이션을 다시 하지 않고 그대로 쓴다", async () => {
    const source = await createTestDb();
    // 버전이 바뀐 줄도 그대로 옮겨지는지 보려고 하나 고친다.
    const [reservation] = await source
      .select()
      .from(schema.reservations)
      .where(inArray(schema.reservations.status, ["pending", "confirmed"]))
      .limit(1);
    const cancelled = await createReservationRepository(source).setStatus(
      reservation.cafeId,
      reservation.id,
      "cancelled",
      new Date(),
    );
    if (typeof cancelled === "string") throw new Error(cancelled);

    // 운영 PostgreSQL에서 pg_dump CLI로 만드는 것과 같은 형식(일반 SQL)이다.
    const client = (source as unknown as { $client: PGlite }).$client;
    const dump = await (await pgDump({ pg: client, args: ["--no-owner", "--no-privileges"] })).text();
    expect(dump).toContain('CREATE TABLE public.reservations');

    const dir = mkdtempSync(path.join(tmpdir(), "avocado-restore-"));
    dirs.push(dir);
    const fresh = new PGlite(dir);
    await fresh.exec(dump);
    await fresh.close();
    // 서버가 처음 DB를 열 때처럼 마이그레이션을 적용한다. 백업에 적용 기록이 있어 아무것도 다시 하지 않아야 한다.
    const restored = await openPglite(dir);

    const journal = JSON.parse(readFileSync("src/db/migrations/meta/_journal.json", "utf8")) as { entries: unknown[] };
    const { rows: applied } = (await restored.execute(sql`select count(*)::int as n from drizzle.__drizzle_migrations`)) as unknown as {
      rows: { n: number }[];
    };
    expect(applied[0].n).toBe(journal.entries.length);

    expect(tables.length).toBeGreaterThanOrEqual(10);
    for (const table of tables) {
      expect({ table: getTableName(table), rows: await rowsOf(restored, table) }).toEqual({
        table: getTableName(table),
        rows: await rowsOf(source, table),
      });
    }
    expect(await restored.select().from(schema.reservations).where(sql`id = ${reservation.id}`)).toMatchObject([
      { status: "cancelled", version: cancelled.version },
    ]);
    // 시퀀스 위치도 옮겨져, 복원한 DB에서 새로 받는 버전이 백업 전에 쓴 값과 겹치지 않는다.
    const { rows: maxBefore } = (await source.execute(sql`select max(version)::int as v from reservations`)) as unknown as {
      rows: { v: number }[];
    };
    const [open] = await restored
      .select()
      .from(schema.reservations)
      .where(inArray(schema.reservations.status, ["pending", "confirmed"]))
      .limit(1);
    const again = await createReservationRepository(restored).setStatus(open.cafeId, open.id, "cancelled", new Date());
    if (typeof again === "string") throw new Error(again);
    expect(again.version).toBeGreaterThan(maxBefore[0].v);
  });
});

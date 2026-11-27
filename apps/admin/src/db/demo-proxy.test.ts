// @vitest-environment node
import { createServer } from "node:http";

import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { eq, getTableName, isTable } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";

import { createWaitlistRepository } from "@/server/waitlist/repository";

import { handleDemoDbRequest, openDemoProxyDb } from "./demo-proxy";
import type { Database } from "./index";
import * as schema from "./schema";
import { pgliteOf } from "./server";
import { createTestDb } from "./testing";

/* /api/demo/db를 맡은 함수 대신 응답하는 로컬 HTTP 서버. 보내는 쪽은 SuperAgent(Node http)로 실제로 SQL을 보낸다. */
let owner: Database;
const sent: string[] = [];
const server = createServer((req, res) => {
  let body = "";
  req.setEncoding("utf8");
  req.on("data", (chunk: string) => (body += chunk));
  req.on("end", async () => {
    sent.push(body);
    // 받는 쪽이 보는 머리글만 옮긴다.
    const headers = new Headers();
    for (const name of ["content-type", "x-demo-db-key"]) {
      const value = req.headers[name];
      if (typeof value === "string") headers.set(name, value);
    }
    try {
      const response = await handleDemoDbRequest(
        new Request(`http://demo.test${req.url ?? "/"}`, { method: req.method, headers, body }),
        async () => pgliteOf(owner)!,
      );
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(await response.text());
    } catch (error) {
      res.writeHead(500).end(String(error));
    }
  });
});
await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
if (address === null || typeof address === "string") throw new Error("테스트 서버 주소가 없습니다");
const baseUrl = `http://127.0.0.1:${address.port}`;
afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

const tables = Object.values(schema).flatMap((value) => (isTable(value) ? [value as PgTable] : []));

describe("공개 데모 DB 중계", () => {
  let remote: Database;

  beforeEach(async () => {
    vi.stubEnv("NEXTAUTH_SECRET", "test-secret");
    owner = await createTestDb();
    sent.length = 0;
    remote = openDemoProxyDb(baseUrl);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  for (const table of tables) {
    it(`${getTableName(table)} 표를 직접 읽은 것과 같게 읽는다`, async () => {
      expect(await remote.select().from(table)).toEqual(await owner.select().from(table));
    });
  }

  it("트랜잭션을 쓰는 저장소 함수(현장 대기 등록)가 같은 DB에 남는다", async () => {
    const result = await createWaitlistRepository(remote).add("c_gangnam", { name: "데모손님", phone: "01055551234", partySize: 2 }, new Date());
    expect(result).toMatchObject({ name: "데모손님", status: "waiting" });
    const line = await createWaitlistRepository(owner).listToday("c_gangnam", new Date());
    expect(line.map((e) => e.name)).toContain("데모손님");
  });

  it("트랜잭션 안에서 오류가 나면 되돌리고, 그동안 밖의 쿼리는 끝날 때까지 기다린다", async () => {
    const before = await owner.select().from(schema.cafes);
    const outside: Promise<unknown>[] = [];
    await expect(
      remote.transaction(async (tx) => {
        await tx.update(schema.cafes).set({ name: "바뀐 매장" });
        // 열린 트랜잭션 밖의 읽기는 바뀐 이름을 보지 않는다(되돌린 뒤에 실행됨).
        outside.push(remote.select({ name: schema.cafes.name }).from(schema.cafes));
        throw new Error("취소");
      }),
    ).rejects.toThrow("취소");
    expect(await outside[0]).toEqual(before.map((c) => ({ name: c.name })));
    expect(await owner.select().from(schema.cafes)).toEqual(before);
  });

  it("한 트랜잭션에서 Promise.all로 동시에 보낸 쿼리를 모두 처리하고, 결과로 이어서 쓴다", async () => {
    // 테이블 고르기처럼: 트랜잭션 안에서 두 쿼리를 동시에 읽고, 그 결과로 쓴다.
    const name = await remote.transaction(async (tx) => {
      const [cafeRows, gameRows] = await Promise.all([
        tx.select().from(schema.cafes).where(eq(schema.cafes.id, "c_gangnam")).for("update"),
        tx.select({ id: schema.games.id }).from(schema.games),
      ]);
      await tx.update(schema.cafes).set({ name: `${cafeRows[0].name} ${gameRows.length}` }).where(eq(schema.cafes.id, "c_gangnam"));
      return `${cafeRows[0].name} ${gameRows.length}`;
    });
    const [cafe] = await owner.select().from(schema.cafes).where(eq(schema.cafes.id, "c_gangnam"));
    expect(cafe.name).toBe(name);
    // begin → 두 select(부른 순서대로) → update → commit
    expect(sent.map((body) => (JSON.parse(body) as { sql: string }).sql.split(" ")[0])).toEqual([
      "begin",
      "select",
      "select",
      "update",
      "commit",
    ]);
  });

  it("한 트랜잭션에서 동시에 보낸 쿼리 하나가 실패하면 함께 보낸 쓰기까지 모두 되돌린다", async () => {
    const before = await owner.select().from(schema.cafes);
    const [cafe] = before;
    await expect(
      remote.transaction(async (tx) => {
        await Promise.all([
          tx.update(schema.cafes).set({ name: "바뀐 매장" }),
          tx.insert(schema.cafes).values(cafe), // 같은 id라 실패
        ]);
      }),
    ).rejects.toThrow();
    expect(await owner.select().from(schema.cafes)).toEqual(before);
    // 되돌린 뒤에도 다음 요청은 정상
    expect(await remote.select().from(schema.cafes)).toEqual(before);
  });

  it("PostgreSQL 오류의 code를 그대로 넘긴다", async () => {
    const [cafe] = await owner.select().from(schema.cafes);
    const error = (await remote.insert(schema.cafes).values(cafe).catch((e: unknown) => e)) as Error & { code?: string; cause?: { code?: string } };
    expect(error).toBeInstanceOf(Error);
    expect(error.cause?.code ?? error.code).toBe("23505");
  });

  it("열쇠가 맞지 않으면 없는 경로처럼 404를 돌려준다", async () => {
    const response = await handleDemoDbRequest(
      new Request("http://demo.test/api/demo/db", { method: "POST", headers: { "x-demo-db-key": "wrong" }, body: "{}" }),
      async () => pgliteOf(owner)!,
    );
    expect(response.status).toBe(404);
  });
});

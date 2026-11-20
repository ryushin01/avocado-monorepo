import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { DEMO_RESET_MINUTES } from "@/shared/config";

import { POST as demoDbRoute } from "@/server/demo/db-route";

import { cafes, users } from "./schema";
import { dbTarget, getDb, getDemoOwnerDb } from "./server";

describe("getDb (공개 데모, DATABASE_URL 없음)", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "1");
    // DATABASE_URL이 없는 데모는 운영 빌드에서도 메모리 DB에 시드를 넣는다.
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("NEXTAUTH_URL", "http://demo.test");
    delete (globalThis as { dbPromise?: unknown }).dbPromise;
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
    delete (globalThis as { dbPromise?: unknown }).dbPromise;
  });

  it("메모리 DB에 시드를 넣고, 정해 둔 시간이 지나면 처음 상태로 새로 만든다", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const db = await getDemoOwnerDb();
    expect((await db.select().from(users)).length).toBeGreaterThan(0);
    // 화면·API 라우트는 이 DB를 직접 열지 않고 /api/demo/db 중계를 거친다(demo-proxy.test.ts).
    expect(await getDb()).not.toBe(db);

    // 방문자가 바꾼 내용
    await db.update(cafes).set({ name: "바뀐 매장" });
    const names = async (target: typeof db) => (await target.select({ name: cafes.name }).from(cafes)).map((c) => c.name);
    expect(new Set(await names(await getDemoOwnerDb()))).toEqual(new Set(["바뀐 매장"]));

    vi.setSystemTime(Date.now() + DEMO_RESET_MINUTES * 60_000 + 1);
    const fresh = await getDemoOwnerDb();
    expect(fresh).not.toBe(db);
    expect(await names(fresh)).not.toContain("바뀐 매장");
  });
});

describe("dbTarget (공개 데모, DATABASE_URL 있음)", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "1");
    vi.stubEnv("DATABASE_URL", "postgres://should-not-connect.invalid/db");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("모든 함수가 공유 PostgreSQL을 직접 쓰고, 메모리 DB 중계(/api/demo/db)는 닫는다", async () => {
    expect(dbTarget()).toBe("demo-shared");
    const response = await demoDbRoute(new Request("http://demo.test/api/demo/db", { method: "POST", body: "{}" }));
    expect(response.status).toBe(404);
  });

  it("빌드 중에는 공유 DB를 건드리지 않고 그 프로세스의 메모리 DB를 쓴다", () => {
    vi.stubEnv("NEXT_PHASE", "phase-production-build");
    expect(dbTarget()).toBe("local");
  });

  it("데모가 아니면 DATABASE_URL은 원래대로 운영 DB다", () => {
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "");
    expect(dbTarget()).toBe("local");
  });
});

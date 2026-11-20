import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { count } from "drizzle-orm";

import { createDemoResetter, selectDbTarget } from "./demo-shared";
import { type Database, openPglite } from "./index";
import { cafes, waitlistEntries } from "./schema";
import { createSeedData } from "./seed-data";

describe("selectDbTarget", () => {
  const url = "postgres://demo.invalid/db";

  it.each([
    [{ demo: false, building: false, databaseUrl: url }, "local"],
    [{ demo: false, building: false }, "local"],
    // 데모 빌드 중에는 배포가 없어 그 프로세스의 메모리 DB를 쓴다(공유 DB를 건드리지 않는다).
    [{ demo: true, building: true, databaseUrl: url }, "local"],
    [{ demo: true, building: true }, "local"],
    [{ demo: true, building: false, databaseUrl: url }, "demo-shared"],
    [{ demo: true, building: false, databaseUrl: "" }, "demo-proxy"],
    [{ demo: true, building: false }, "demo-proxy"],
  ] as const)("%o → %s", (input, expected) => {
    expect(selectDbTarget(input)).toBe(expected);
  });
});

describe("createDemoResetter (공유 데모 DB 되돌리기)", () => {
  const INTERVAL = 30 * 60_000;
  const T0 = Date.parse("2026-11-20T00:00:00Z");
  const seed = vi.fn(async (now: Date) => ({ data: createSeedData({}, now) }));
  let db: Database;

  // 같은 DB를 쓰는 여러 인스턴스는 createDemoResetter를 하나씩 가진다.
  const instance = () => createDemoResetter({ intervalMs: INTERVAL, seed });
  const cafeNames = async () => (await db.select({ name: cafes.name }).from(cafes)).map((c) => c.name);
  const cafeCount = async () => (await db.select({ value: count() }).from(cafes))[0].value;

  beforeEach(async () => {
    seed.mockClear();
    // 마이그레이션만 한 빈 DB (Neon에 처음 붙은 상태)
    db = await openPglite("memory://");
  });

  it("비어 있는 DB를 처음 쓸 때 시드를 넣는다", async () => {
    expect(await cafeCount()).toBe(0);
    expect(await instance()(db, T0)).toBe("reset");
    expect(await cafeCount()).toBe(createSeedData({}, new Date(T0)).cafes.length);
  });

  it("간격 안에서는 바꾼 내용을 두고, 지나면 시드로 되돌린다", async () => {
    const reset = instance();
    await reset(db, T0);
    await db.update(cafes).set({ name: "바뀐 매장" });

    expect(await reset(db, T0 + INTERVAL - 1)).toBe("not-due");
    expect(new Set(await cafeNames())).toEqual(new Set(["바뀐 매장"]));

    expect(await reset(db, T0 + INTERVAL)).toBe("reset");
    expect(await cafeNames()).not.toContain("바뀐 매장");
    expect(await cafeCount()).toBe(createSeedData().cafes.length);
  });

  it("다른 인스턴스가 이미 되돌렸으면 DB에서 다시 확인하고 되돌리지 않는다", async () => {
    const a = instance();
    const b = instance();
    await a(db, T0);
    await db.update(cafes).set({ name: "방문자가 바꾼 매장" });

    // 새로 뜬 인스턴스 b는 마지막 되돌린 시각을 몰라 DB에 묻는다.
    expect(await b(db, T0 + 60_000)).toBe("fresh");
    expect(new Set(await cafeNames())).toEqual(new Set(["방문자가 바꾼 매장"]));
    // 그 뒤로는 a가 되돌린 시각을 기억해 묻지 않는다.
    expect(await b(db, T0 + 120_000)).toBe("not-due");
    expect(seed).toHaveBeenCalledTimes(1);
  });

  it("여러 인스턴스가 동시에 확인해도 한 곳만 되돌린다", async () => {
    const a = instance();
    const b = instance();
    const c = instance();
    expect((await Promise.all([a(db, T0), b(db, T0), c(db, T0)])).sort()).toEqual(["fresh", "fresh", "reset"]);
    expect(seed).toHaveBeenCalledTimes(1);

    await db.update(cafes).set({ name: "바뀐 매장" });
    const later = T0 + INTERVAL + 1_000;
    expect((await Promise.all([a(db, later), b(db, later), c(db, later)])).sort()).toEqual(["fresh", "fresh", "reset"]);
    expect(seed).toHaveBeenCalledTimes(2);
    expect(await cafeNames()).not.toContain("바뀐 매장");
  });

  it("한 인스턴스 안에서 동시에 온 요청은 같은 확인을 기다린다", async () => {
    const reset = instance();
    expect(await Promise.all([reset(db, T0), reset(db, T0), reset(db, T0)])).toEqual(["reset", "reset", "reset"]);
    expect(seed).toHaveBeenCalledTimes(1);
  });

  it("되돌리다 실패하면 데이터를 그대로 두고, 잠시 뒤 다시 한다", async () => {
    const reset = instance();
    await reset(db, T0);
    const waiting = (await db.select({ value: count() }).from(waitlistEntries))[0].value;
    await db.update(cafes).set({ name: "바뀐 매장" });

    const onError = vi.fn();
    const failing = createDemoResetter({
      intervalMs: INTERVAL,
      retryMs: 10_000,
      seed: vi.fn().mockRejectedValueOnce(new Error("시드 실패")).mockImplementation(seed),
      onError,
    });
    const due = T0 + INTERVAL;
    expect(await failing(db, due)).toBe("failed");
    expect(onError).toHaveBeenCalledOnce();
    // 트랜잭션이 되돌려져 비우기 전 그대로다.
    expect(new Set(await cafeNames())).toEqual(new Set(["바뀐 매장"]));
    expect((await db.select({ value: count() }).from(waitlistEntries))[0].value).toBe(waiting);

    expect(await failing(db, due + 9_999)).toBe("not-due");
    expect(await failing(db, due + 10_000)).toBe("reset");
    expect(await cafeNames()).not.toContain("바뀐 매장");
  });
});

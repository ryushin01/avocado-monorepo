import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
// 요청 밖(테스트)에서는 connection()이 기다릴 요청이 없으므로 바로 넘어가게 한다.
vi.mock("next/server", () => ({ connection: async () => {} }));
vi.hoisted(() => {
  process.env.KIOSK_API_TOKEN = "kio_secret_token";
  process.env.LAUNCHER_CAFE_ID = "c_test";
});

import { fetchCafeGames, fetchCafeGamesOrSnapshot, lookupReservations } from "./backoffice";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const logs = () => vi.mocked(console.error).mock.calls.map(([line]) => JSON.parse(line as string));

describe("백오피스 API 호출", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("매장 경로로 토큰을 보내고 응답을 돌려준다", async () => {
    const body = { cafe: { id: "c_test", name: "강남점" }, games: [], generatedAt: "2026-11-13T00:00:00.000Z" };
    const fetchMock = vi.fn(async () => json(200, body));
    vi.stubGlobal("fetch", fetchMock);

    expect(await fetchCafeGames()).toEqual({ ok: true, data: body });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit];
    expect(url.pathname).toBe("/api/kiosk/cafes/c_test/games");
    expect(init.headers).toMatchObject({ authorization: "Bearer kio_secret_token" });
    expect(logs()).toEqual([]);
  });

  it("응답이 약속한 모양과 다르면 손님 화면이 깨지는 대신 연결 문제로 알리고 기록한다", async () => {
    vi.stubGlobal("fetch", async () => json(200, { games: "oops" }));

    expect(await fetchCafeGames()).toEqual({ ok: false, reason: "unreachable" });
    expect(logs()).toEqual([expect.objectContaining({ event: "backoffice_invalid_response" })]);
  });

  it("404는 매장 없음으로 알리고 장애로 기록하지 않는다", async () => {
    vi.stubGlobal("fetch", async () => json(404, { message: "운영 중인 매장이 아닙니다." }));

    expect(await fetchCafeGames()).toMatchObject({ ok: false, reason: "not-found" });
    expect(logs()).toEqual([]);
  });

  it("요청 제한(429)은 문구와 함께 거절로 돌려준다", async () => {
    vi.stubGlobal("fetch", async () => json(429, { message: "요청이 너무 많습니다." }));

    expect(await lookupReservations("1234")).toEqual({
      ok: false,
      reason: "rejected",
      error: { message: "요청이 너무 많습니다." },
    });
    expect(logs()).toEqual([]);
  });

  it("토큰 오류(401)는 손님에게 연결 문제로 보이고 원인은 로그에 남는다", async () => {
    vi.stubGlobal("fetch", async () => json(401, { message: "사용할 수 없는 토큰" }));

    expect(await lookupReservations("1234")).toMatchObject({ ok: false, reason: "unreachable" });

    const [log] = logs();
    expect(log).toMatchObject({ event: "backoffice_error", status: 401 });
    // 전화번호 뒷자리와 토큰은 로그에 남기지 않는다.
    expect(log.path).toBe("/api/kiosk/cafes/c_test/reservations");
    expect(JSON.stringify(log)).not.toContain("1234");
    expect(JSON.stringify(log)).not.toContain("kio_secret_token");
  });

  it("다른 매장의 토큰(403)도 설정 오류이므로 연결 문제로 안내하고 로그에 남긴다", async () => {
    vi.stubGlobal("fetch", async () => json(403, { message: "이 매장의 키오스크가 아닙니다." }));

    expect(await fetchCafeGames()).toMatchObject({ ok: false, reason: "unreachable" });
    expect(logs()[0]).toMatchObject({ event: "backoffice_error", status: 403 });
  });

  it("서버 오류(500)도 연결 문제로 다룬다", async () => {
    vi.stubGlobal("fetch", async () => new Response("oops", { status: 500 }));

    expect(await fetchCafeGames()).toMatchObject({ ok: false, reason: "unreachable" });
    expect(logs()[0]).toMatchObject({ event: "backoffice_error", status: 500 });
  });

  it("연결 실패는 원인과 함께 로그에 남긴다", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new TypeError("fetch failed", { cause: { message: "connect ECONNREFUSED" } });
    });

    expect(await fetchCafeGames()).toEqual({ ok: false, reason: "unreachable" });
    expect(logs()[0]).toMatchObject({ event: "backoffice_unreachable", cause: "connect ECONNREFUSED" });
  });

  it("프리렌더링이 끊은 요청은 장애가 아니므로 기록하지 않는다", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new Error("During prerendering, fetch() rejects when the prerender is complete.");
    });

    expect(await fetchCafeGames()).toEqual({ ok: false, reason: "unreachable" });
    expect(logs()).toEqual([]);
  });
});

describe("운영 설정", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("운영에서 설정이 빠지면 개발 기본값(강남점·localhost)을 쓰지 않고, 부르지 않은 채 빠진 이름을 남긴다", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("BACKOFFICE_URL", "");
    vi.stubEnv("LAUNCHER_CAFE_ID", "");
    vi.stubEnv("KIOSK_API_TOKEN", "kio_secret_token");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.resetModules();
    const { fetchCafeGames: fetchInProduction } = await import("./backoffice");

    expect(await fetchInProduction()).toEqual({ ok: false, reason: "unreachable" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(logs()).toEqual([
      expect.objectContaining({ event: "launcher_config_missing", missing: ["BACKOFFICE_URL", "LAUNCHER_CAFE_ID"] }),
    ]);
  });

  it("요청 시점(connection) 뒤에 설정을 확인한다: 빌드 중 결과가 정적 화면에 굳지 않게", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("BACKOFFICE_URL", "");
    vi.stubEnv("LAUNCHER_CAFE_ID", "");
    vi.stubEnv("KIOSK_API_TOKEN", "");
    const order: string[] = [];
    vi.doMock("next/server", () => ({ connection: async () => void order.push("connection") }));
    vi.resetModules();
    const { fetchCafeGames: fetchInProduction } = await import("./backoffice");
    vi.mocked(console.error).mockImplementation(() => void order.push("log"));

    await fetchInProduction();
    expect(order).toEqual(["connection", "log"]);
    vi.doUnmock("next/server");
  });
});

describe("오프라인 대체(보유 게임)", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("백오피스가 응답하면 그대로 쓰고 오프라인이 아니라고 알린다", async () => {
    const body = { cafe: { id: "c_test", name: "강남점" }, games: [], generatedAt: "2026-11-13T00:00:00.000Z" };
    vi.stubGlobal("fetch", async () => json(200, body));

    expect(await fetchCafeGamesOrSnapshot()).toEqual({ ok: true, data: body, offline: false });
  });

  it("개발 중 백오피스에 닿지 않으면 함께 배포한 카탈로그 스냅숏(로컬 썸네일)으로 대신한다", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new TypeError("fetch failed");
    });

    const result = await fetchCafeGamesOrSnapshot();
    expect(result).toMatchObject({ ok: true, offline: true, data: { cafe: { id: "c_test" } } });
    if (!result.ok) throw new Error("스냅숏이 없습니다");
    expect(result.data.games.length).toBeGreaterThan(50);
    for (const game of result.data.games) expect(game.thumbnailUrl ?? "").toMatch(/^\/images\/games\//);
  });

  it("매장 없음(404)은 스냅숏으로 가리지 않는다", async () => {
    vi.stubGlobal("fetch", async () => json(404, { message: "운영 중인 매장이 아닙니다." }));

    expect(await fetchCafeGamesOrSnapshot()).toMatchObject({ ok: false, reason: "not-found" });
  });

  it("실제 매장 운영(데모 아닌 프로덕션)에서는 스냅숏 대신 연결 문제를 알린다", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("BACKOFFICE_URL", "http://backoffice.test");
    vi.stubGlobal("fetch", async () => {
      throw new TypeError("fetch failed");
    });
    vi.doMock("next/server", () => ({ connection: async () => {} }));
    vi.resetModules();
    const { fetchCafeGamesOrSnapshot: inProduction } = await import("./backoffice");

    expect(await inProduction()).toEqual({ ok: false, reason: "unreachable" });
  });

  it("공개 데모(프로덕션)에서는 백오피스 장애 때 스냅숏으로 대신한다", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "1");
    vi.stubEnv("BACKOFFICE_URL", "http://backoffice.test");
    vi.stubGlobal("fetch", async () => {
      throw new TypeError("fetch failed");
    });
    vi.doMock("next/server", () => ({ connection: async () => {} }));
    vi.resetModules();
    const { fetchCafeGamesOrSnapshot: inDemo } = await import("./backoffice");

    expect(await inDemo()).toMatchObject({ ok: true, offline: true });
  });
});

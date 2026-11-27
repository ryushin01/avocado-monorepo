import { createServer, type IncomingHttpHeaders } from "node:http";

import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
// 요청 밖(테스트)에서는 connection()이 기다릴 요청이 없으므로 바로 넘어가게 한다.
vi.mock("next/server", () => ({ connection: async () => {} }));
vi.hoisted(() => {
  process.env.KIOSK_API_TOKEN = "kio_secret_token";
  process.env.LAUNCHER_CAFE_ID = "c_test";
});

/* 백오피스 대신 응답하는 로컬 HTTP 서버. 호출은 SuperAgent(Node http)로 실제로 오간다. */
type Received = { method: string; url: string; headers: IncomingHttpHeaders; body: string };
type Reply = { status: number; json?: unknown; text?: string } | "hang";
const received: Received[] = [];
let reply: () => Reply = () => ({ status: 200, json: {} });
const server = createServer((req, res) => {
  let body = "";
  req.setEncoding("utf8");
  req.on("data", (chunk: string) => (body += chunk));
  req.on("end", () => {
    received.push({ method: req.method ?? "", url: req.url ?? "", headers: req.headers, body });
    const answer = reply();
    if (answer === "hang") return; // 응답하지 않는 백오피스(시간 초과)
    const { status, json, text } = answer;
    res.writeHead(status, { "content-type": text === undefined ? "application/json" : "text/plain" });
    res.end(text ?? JSON.stringify(json));
  });
});
const urlOf = (listening: typeof server) => {
  const address = listening.address();
  if (address === null || typeof address === "string") throw new Error("테스트 서버 주소가 없습니다");
  return `http://127.0.0.1:${address.port}`;
};
await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
const backofficeUrl = urlOf(server);
afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

/** 아무도 듣지 않는 주소(연결 거부) */
const closedServer = createServer();
await new Promise<void>((resolve) => closedServer.listen(0, "127.0.0.1", resolve));
const closedUrl = urlOf(closedServer);
await new Promise<void>((resolve) => closedServer.close(() => resolve()));

process.env.BACKOFFICE_URL = backofficeUrl;
const { fetchCafeGames, fetchCafeGamesOrSnapshot, lookupReservations, checkInReservation } = await import("./backoffice");
const { LAUNCHER_CONFIG } = await import("./config");

const json = (status: number, body: unknown) => () => ({ status, json: body });

const logs = () => vi.mocked(console.error).mock.calls.map(([line]) => JSON.parse(line as string));

beforeEach(() => {
  received.length = 0;
});

describe("백오피스 API 호출", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    LAUNCHER_CONFIG.backofficeUrl = backofficeUrl;
    vi.restoreAllMocks();
  });

  it("매장 경로로 토큰을 보내고 응답을 돌려준다", async () => {
    const body = { cafe: { id: "c_test", name: "강남점" }, games: [], generatedAt: "2026-11-13T00:00:00.000Z" };
    reply = json(200, body);

    expect(await fetchCafeGames()).toEqual({ ok: true, data: body });

    expect(received).toEqual([
      expect.objectContaining({
        method: "GET",
        url: "/api/kiosk/cafes/c_test/games",
        headers: expect.objectContaining({ authorization: "Bearer kio_secret_token" }),
      }),
    ]);
    expect(logs()).toEqual([]);
  });

  it("체크인은 POST로 JSON 본문을 보낸다", async () => {
    const body = { reservation: { id: "r_1", name: "김*수", partySize: 2, startsAt: "2026-11-13T09:00:00.000Z" } };
    reply = json(200, body);

    await checkInReservation("r 1", "1234");

    const [sent] = received;
    expect(sent).toMatchObject({ method: "POST", url: "/api/kiosk/cafes/c_test/reservations/r%201/check-in" });
    expect(sent.headers["content-type"]).toBe("application/json");
    expect(JSON.parse(sent.body)).toEqual({ phone4: "1234" });
  });

  it("JSON이 아닌 성공 응답도 예외 대신 연결 문제로 알리고 기록한다", async () => {
    reply = () => ({ status: 200, text: "<html>점검 중</html>" });

    expect(await fetchCafeGames()).toEqual({ ok: false, reason: "unreachable" });
    expect(logs()).toEqual([expect.objectContaining({ event: "backoffice_invalid_response" })]);
  });

  it("응답이 약속한 모양과 다르면 손님 화면이 깨지는 대신 연결 문제로 알리고 기록한다", async () => {
    reply = json(200, { games: "oops" });

    expect(await fetchCafeGames()).toEqual({ ok: false, reason: "unreachable" });
    expect(logs()).toEqual([expect.objectContaining({ event: "backoffice_invalid_response" })]);
  });

  it("404는 매장 없음으로 알리고 장애로 기록하지 않는다", async () => {
    reply = json(404, { message: "운영 중인 매장이 아닙니다." });

    expect(await fetchCafeGames()).toMatchObject({ ok: false, reason: "not-found" });
    expect(logs()).toEqual([]);
  });

  it("요청 제한(429)은 문구와 함께 거절로 돌려준다", async () => {
    reply = json(429, { message: "요청이 너무 많습니다." });

    expect(await lookupReservations("1234")).toEqual({
      ok: false,
      reason: "rejected",
      error: { message: "요청이 너무 많습니다." },
    });
    expect(logs()).toEqual([]);
  });

  it("토큰 오류(401)는 손님에게 연결 문제로 보이고 원인은 로그에 남는다", async () => {
    reply = json(401, { message: "사용할 수 없는 토큰" });

    expect(await lookupReservations("1234")).toMatchObject({ ok: false, reason: "unreachable" });

    const [log] = logs();
    expect(log).toMatchObject({ event: "backoffice_error", status: 401 });
    // 전화번호 뒷자리와 토큰은 로그에 남기지 않는다.
    expect(log.path).toBe("/api/kiosk/cafes/c_test/reservations");
    expect(JSON.stringify(log)).not.toContain("1234");
    expect(JSON.stringify(log)).not.toContain("kio_secret_token");
  });

  it("다른 매장의 토큰(403)도 설정 오류이므로 연결 문제로 안내하고 로그에 남긴다", async () => {
    reply = json(403, { message: "이 매장의 키오스크가 아닙니다." });

    expect(await fetchCafeGames()).toMatchObject({ ok: false, reason: "unreachable" });
    expect(logs()[0]).toMatchObject({ event: "backoffice_error", status: 403 });
  });

  it("서버 오류(500)도 연결 문제로 다룬다", async () => {
    reply = () => ({ status: 500, text: "oops" });

    expect(await fetchCafeGames()).toMatchObject({ ok: false, reason: "unreachable" });
    expect(logs()[0]).toMatchObject({ event: "backoffice_error", status: 500 });
  });

  it("연결 실패는 원인과 함께 로그에 남긴다", async () => {
    LAUNCHER_CONFIG.backofficeUrl = closedUrl;

    expect(await fetchCafeGames()).toEqual({ ok: false, reason: "unreachable" });
    expect(logs()[0]).toMatchObject({ event: "backoffice_unreachable", message: expect.stringContaining("ECONNREFUSED") });
  });

  it("백오피스가 시간 안에 응답하지 않으면(5초) 연결 문제로 알린다", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    reply = () => "hang";
    try {
      const pending = fetchCafeGames();
      await vi.advanceTimersByTimeAsync(5000);
      expect(await pending).toEqual({ ok: false, reason: "unreachable" });
      expect(logs()[0]).toMatchObject({ event: "backoffice_unreachable", message: expect.stringContaining("5000ms") });
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("운영 설정", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    LAUNCHER_CONFIG.backofficeUrl = backofficeUrl;
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("운영에서 설정이 빠지면 개발 기본값(강남점·localhost)을 쓰지 않고, 부르지 않은 채 빠진 이름을 남긴다", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("BACKOFFICE_URL", "");
    vi.stubEnv("LAUNCHER_CAFE_ID", "");
    vi.stubEnv("KIOSK_API_TOKEN", "kio_secret_token");
    vi.resetModules();
    const { fetchCafeGames: fetchInProduction } = await import("./backoffice");

    expect(await fetchInProduction()).toEqual({ ok: false, reason: "unreachable" });
    expect(received).toEqual([]);
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
    LAUNCHER_CONFIG.backofficeUrl = backofficeUrl;
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("백오피스가 응답하면 그대로 쓰고 오프라인이 아니라고 알린다", async () => {
    const body = { cafe: { id: "c_test", name: "강남점" }, games: [], generatedAt: "2026-11-13T00:00:00.000Z" };
    reply = json(200, body);

    expect(await fetchCafeGamesOrSnapshot()).toEqual({ ok: true, data: body, offline: false });
  });

  it("개발 중 백오피스에 닿지 않으면 함께 배포한 카탈로그 스냅숏(로컬 썸네일)으로 대신한다", async () => {
    LAUNCHER_CONFIG.backofficeUrl = closedUrl;

    const result = await fetchCafeGamesOrSnapshot();
    expect(result).toMatchObject({ ok: true, offline: true, data: { cafe: { id: "c_test" } } });
    if (!result.ok) throw new Error("스냅숏이 없습니다");
    expect(result.data.games.length).toBeGreaterThan(50);
    for (const game of result.data.games) expect(game.thumbnailUrl ?? "").toMatch(/^\/images\/games\//);
  });

  it("매장 없음(404)은 스냅숏으로 가리지 않는다", async () => {
    reply = json(404, { message: "운영 중인 매장이 아닙니다." });

    expect(await fetchCafeGamesOrSnapshot()).toMatchObject({ ok: false, reason: "not-found" });
  });

  it("실제 매장 운영(데모 아닌 프로덕션)에서는 스냅숏 대신 연결 문제를 알린다", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("BACKOFFICE_URL", closedUrl);
    vi.doMock("next/server", () => ({ connection: async () => {} }));
    vi.resetModules();
    const { fetchCafeGamesOrSnapshot: inProduction } = await import("./backoffice");

    expect(await inProduction()).toEqual({ ok: false, reason: "unreachable" });
  });

  it("공개 데모(프로덕션)에서는 백오피스 장애 때 스냅숏으로 대신한다", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "1");
    vi.stubEnv("BACKOFFICE_URL", closedUrl);
    vi.doMock("next/server", () => ({ connection: async () => {} }));
    vi.resetModules();
    const { fetchCafeGamesOrSnapshot: inDemo } = await import("./backoffice");

    expect(await inDemo()).toMatchObject({ ok: true, offline: true });
  });
});

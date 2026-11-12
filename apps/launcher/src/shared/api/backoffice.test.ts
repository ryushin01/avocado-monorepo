import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.hoisted(() => {
  process.env.KIOSK_API_TOKEN = "kio_secret_token";
  process.env.LAUNCHER_CAFE_ID = "c_test";
});

import { fetchCafeGames, lookupReservations } from "./backoffice";

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

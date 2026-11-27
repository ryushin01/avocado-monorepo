import { createServer, type IncomingHttpHeaders } from "node:http";

import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
// 요청 밖(테스트)에서는 connection()이 기다릴 요청이 없으므로 바로 넘어가게 한다.
vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }) }));
vi.hoisted(() => {
  process.env.BOOKING_API_TOKEN = "bk_secret_token";
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
const { BOOKING_CONFIG, fetchBookingAvailability, fetchBookingOptions, submitBooking, visitorKey } = await import("./booking");

const json = (status: number, body: unknown) => () => ({ status, json: body });
const logs = () => vi.mocked(console.error).mock.calls.map(([line]) => JSON.parse(line as string));

beforeEach(() => {
  received.length = 0;
});

const request = {
  date: "2026-11-21",
  time: "18:00",
  partySize: 4,
  name: "이영희",
  phone: "010-2222-3333",
  agreed: true,
};

describe("백오피스 예약 API 호출", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    BOOKING_CONFIG.backofficeUrl = backofficeUrl;
    vi.restoreAllMocks();
  });

  it("토큰과 방문자 키(접속 주소가 아닌 HMAC)를 보내고 응답을 돌려준다", async () => {
    const body = { cafes: [{ id: "c_a", name: "강남점", region: "서울" }], dates: ["2026-11-21"], maxPartySize: 8 };
    reply = json(200, body);

    expect(await fetchBookingOptions()).toEqual({ ok: true, data: body });

    const [{ method, url, headers: sent }] = received;
    expect([method, url]).toEqual(["GET", "/api/booking/options"]);
    expect(sent.authorization).toBe("Bearer bk_secret_token");
    expect(sent["x-booking-client"]).toBe(visitorKey("203.0.113.7"));
    expect(sent["x-booking-client"]).not.toContain("203.0.113.7");
    expect(logs()).toEqual([]);
  });

  it("방문자 키는 첫 주소만 보고, 같은 주소면 같은 값이다", () => {
    expect(visitorKey("203.0.113.7, 10.0.0.1")).toBe(visitorKey("203.0.113.7"));
    expect(visitorKey("203.0.113.8")).not.toBe(visitorKey("203.0.113.7"));
    expect(visitorKey(null)).toMatch(/^[0-9a-f]{32}$/);
  });

  it("빈 시각은 매장 경로에 날짜·인원을 붙여 묻는다", async () => {
    const body = { cafe: { id: "c a", name: "강남점" }, date: "2026-11-21", partySize: 2, slots: [{ time: "18:00", available: true }] };
    reply = json(200, body);

    expect(await fetchBookingAvailability("c a", "2026-11-21", 2)).toEqual({ ok: true, data: body });
    expect(received[0].url).toBe("/api/booking/cafes/c%20a/availability?date=2026-11-21&partySize=2");
  });

  it("손님이 고칠 수 있는 거절(빈자리 없음 등)은 문구·칸과 함께 rejected", async () => {
    const error = { code: "full", message: "그 시각에는 빈 테이블이 없습니다.", fieldErrors: { time: ["그 시각에는 빈 테이블이 없습니다."] } };
    reply = json(409, error);

    expect(await submitBooking("c_a", request)).toEqual({ ok: false, reason: "rejected", error });
    const [sent] = received;
    expect([sent.method, sent.headers["content-type"], JSON.parse(sent.body)]).toEqual(["POST", "application/json", request]);
    expect(logs()).toEqual([]);
  });

  it("백오피스가 온라인 예약을 받지 않으면(503 unavailable) off, 토큰이 틀리면 연결 문제로 알리고 기록한다", async () => {
    reply = json(503, { code: "unavailable", message: "지금은 온라인 예약을 받지 않습니다." });
    expect(await fetchBookingOptions()).toMatchObject({ ok: false, reason: "off" });
    expect(logs()).toEqual([]);

    reply = json(401, { code: "unavailable", message: "예약 API 인증이 필요합니다." });
    expect(await fetchBookingOptions()).toMatchObject({ ok: false, reason: "unreachable" });
    expect(logs()).toEqual([expect.objectContaining({ event: "booking_error", status: 401 })]);
  });

  it("약속과 다른 응답이나 연결 실패는 화면을 깨지 않고 unreachable로 알리고 기록한다", async () => {
    reply = json(200, { cafes: "oops" });
    expect(await fetchBookingOptions()).toEqual({ ok: false, reason: "unreachable" });

    reply = () => ({ status: 200, text: "<html>점검 중</html>" });
    expect(await fetchBookingOptions()).toEqual({ ok: false, reason: "unreachable" });

    BOOKING_CONFIG.backofficeUrl = closedUrl;
    expect(await fetchBookingOptions()).toEqual({ ok: false, reason: "unreachable" });
    expect(logs().map((entry) => entry.event)).toEqual([
      "booking_invalid_response",
      "booking_invalid_response",
      "booking_unreachable",
    ]);
  });

  it("백오피스가 시간 안에 응답하지 않으면(5초) 연결 문제로 알리고 기록한다", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    reply = () => "hang";
    try {
      const pending = fetchBookingOptions();
      await vi.advanceTimersByTimeAsync(5000);
      expect(await pending).toEqual({ ok: false, reason: "unreachable" });
      expect(logs()).toEqual([expect.objectContaining({ event: "booking_unreachable", message: expect.stringContaining("5000ms") })]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("BACKOFFICE_URL이 주소 형식이 아니어도 예외 대신 연결 문제로 알리고 기록한다", async () => {
    BOOKING_CONFIG.backofficeUrl = "admin.example.com";

    expect(await fetchBookingOptions()).toEqual({ ok: false, reason: "unreachable" });
    expect(received).toEqual([]);
    expect(logs()).toEqual([expect.objectContaining({ event: "booking_unreachable" })]);
  });
});

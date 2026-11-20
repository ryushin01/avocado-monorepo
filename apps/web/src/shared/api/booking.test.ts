import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
// 요청 밖(테스트)에서는 connection()이 기다릴 요청이 없으므로 바로 넘어가게 한다.
vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }) }));
vi.hoisted(() => {
  process.env.BOOKING_API_TOKEN = "bk_secret_token";
  process.env.BACKOFFICE_URL = "https://admin.example.com";
});

import { fetchBookingAvailability, fetchBookingOptions, submitBooking, visitorKey } from "./booking";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const logs = () => vi.mocked(console.error).mock.calls.map(([line]) => JSON.parse(line as string));

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
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("토큰과 방문자 키(접속 주소가 아닌 HMAC)를 보내고 응답을 돌려준다", async () => {
    const body = { cafes: [{ id: "c_a", name: "강남점", region: "서울" }], dates: ["2026-11-21"], maxPartySize: 8 };
    const fetchMock = vi.fn(async () => json(200, body));
    vi.stubGlobal("fetch", fetchMock);

    expect(await fetchBookingOptions()).toEqual({ ok: true, data: body });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit];
    expect(url.href).toBe("https://admin.example.com/api/booking/options");
    const sent = init.headers as Record<string, string>;
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
    const fetchMock = vi.fn(async () => json(200, body));
    vi.stubGlobal("fetch", fetchMock);

    expect(await fetchBookingAvailability("c a", "2026-11-21", 2)).toEqual({ ok: true, data: body });
    const [url] = fetchMock.mock.calls[0] as unknown as [URL];
    expect(`${url.pathname}${url.search}`).toBe("/api/booking/cafes/c%20a/availability?date=2026-11-21&partySize=2");
  });

  it("손님이 고칠 수 있는 거절(빈자리 없음 등)은 문구·칸과 함께 rejected", async () => {
    const error = { code: "full", message: "그 시각에는 빈 테이블이 없습니다.", fieldErrors: { time: ["그 시각에는 빈 테이블이 없습니다."] } };
    const fetchMock = vi.fn(async () => json(409, error));
    vi.stubGlobal("fetch", fetchMock);

    expect(await submitBooking("c_a", request)).toEqual({ ok: false, reason: "rejected", error });
    const [, init] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit];
    expect([init.method, JSON.parse(init.body as string)]).toEqual(["POST", request]);
    expect(logs()).toEqual([]);
  });

  it("백오피스가 온라인 예약을 받지 않으면(503 unavailable) off, 토큰이 틀리면 연결 문제로 알리고 기록한다", async () => {
    vi.stubGlobal("fetch", async () => json(503, { code: "unavailable", message: "지금은 온라인 예약을 받지 않습니다." }));
    expect(await fetchBookingOptions()).toMatchObject({ ok: false, reason: "off" });
    expect(logs()).toEqual([]);

    vi.stubGlobal("fetch", async () => json(401, { code: "unavailable", message: "예약 API 인증이 필요합니다." }));
    expect(await fetchBookingOptions()).toMatchObject({ ok: false, reason: "unreachable" });
    expect(logs()).toEqual([expect.objectContaining({ event: "booking_error", status: 401 })]);
  });

  it("약속과 다른 응답이나 연결 실패는 화면을 깨지 않고 unreachable로 알리고 기록한다", async () => {
    vi.stubGlobal("fetch", async () => json(200, { cafes: "oops" }));
    expect(await fetchBookingOptions()).toEqual({ ok: false, reason: "unreachable" });

    vi.stubGlobal("fetch", async () => {
      throw new TypeError("fetch failed");
    });
    expect(await fetchBookingOptions()).toEqual({ ok: false, reason: "unreachable" });
    expect(logs().map((entry) => entry.event)).toEqual(["booking_invalid_response", "booking_unreachable"]);
  });
});

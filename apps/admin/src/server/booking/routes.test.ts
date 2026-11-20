import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BookingAvailabilitySchema, BookingErrorSchema, BookingOptionsSchema, BookingResultSchema } from "@avocado/domain/booking";

const mocks = vi.hoisted(() => ({
  consume: vi.fn(),
  listCafes: vi.fn(),
  bookOnline: vi.fn(),
  bookingAvailability: vi.fn(),
  revalidatePath: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/db/server", () => ({ getDb: async () => ({}) }));
vi.mock("@/server/rate-limit/repository", () => ({ createRateLimiter: () => ({ consume: mocks.consume }) }));
vi.mock("@/server/cafes/data", () => ({ listCafes: mocks.listCafes }));
vi.mock("@/server/reservations/data", () => ({ bookOnline: mocks.bookOnline, bookingAvailability: mocks.bookingAvailability }));

import { checkBookingAccess } from "./auth";
import { GET as getAvailability } from "./routes/availability";
import { GET as getOptions } from "./routes/options";
import { POST as postReservation } from "./routes/reservations";

const TOKEN = "bk_secret_token";
const cafe = (id: string, status: "open" | "closed" = "open") => ({
  id,
  name: `${id}점`,
  region: "서울",
  address: "서울 강남구",
  openedAt: "2024-01-01",
  status,
  version: 7,
});

const request = (path: string, init: { token?: string | null; body?: unknown; client?: string } = {}) =>
  new Request(`http://localhost${path}`, {
    method: init.body === undefined ? "GET" : "POST",
    headers: {
      ...(init.token === null ? {} : { authorization: `Bearer ${init.token ?? TOKEN}` }),
      ...(init.client ? { "x-booking-client": init.client } : {}),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
const ctx = (cafeId: string) => ({ params: Promise.resolve({ cafeId }) });

const booking = {
  name: "이영희",
  phone: "010-2222-3333",
  partySize: 4,
  date: "2026-11-21",
  time: "18:00",
  agreed: true,
};

beforeEach(() => {
  vi.stubEnv("BOOKING_API_TOKEN", TOKEN);
  mocks.consume.mockResolvedValue({ allowed: true });
  mocks.listCafes.mockResolvedValue([cafe("c_a"), cafe("c_z", "closed")]);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  Object.values(mocks).forEach((mock) => mock.mockReset());
});

describe("checkBookingAccess", () => {
  it("토큰을 정하지 않았으면 운영에서는 받지 않고(503), 개발 중에는 허용한다", () => {
    expect(checkBookingAccess(null, undefined, true)).toMatchObject({ status: 503 });
    expect(checkBookingAccess(null, "", true)).toMatchObject({ status: 503 });
    expect(checkBookingAccess(null, undefined, false)).toBeNull();
  });

  it("정한 토큰과 같은 Bearer 값만 통과한다(길이가 달라도 오류 없이 401)", () => {
    expect(checkBookingAccess(`Bearer ${TOKEN}`, TOKEN, true)).toBeNull();
    expect(checkBookingAccess(null, TOKEN, false)).toMatchObject({ status: 401 });
    expect(checkBookingAccess("Bearer wrong", TOKEN, true)).toMatchObject({ status: 401 });
    expect(checkBookingAccess(TOKEN, TOKEN, true)).toMatchObject({ status: 401 });
  });
});

describe("GET /api/booking/options", () => {
  it("운영 중인 매장(내부 값 없이), 받는 날짜, 최대 인원을 준다", async () => {
    const response = await getOptions(request("/api/booking/options"));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const body = BookingOptionsSchema.parse(await response.json());
    expect(body.cafes).toEqual([{ id: "c_a", name: "c_a점", region: "서울", address: "서울 강남구" }]);
    expect(body.dates.length).toBeGreaterThanOrEqual(14);
    expect(body.maxPartySize).toBe(8);
  });

  it("토큰이 틀리면 401(unavailable), 매장을 읽지 않는다", async () => {
    const response = await getOptions(request("/api/booking/options", { token: "wrong" }));
    expect(response.status).toBe(401);
    expect(BookingErrorSchema.parse(await response.json()).code).toBe("unavailable");
    expect(mocks.listCafes).not.toHaveBeenCalled();
  });

  it("방문자 키마다 세고, 넘으면 429와 Retry-After", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.consume.mockResolvedValue({ allowed: false, retryAfterSeconds: 42 });
    const response = await getOptions(request("/api/booking/options", { client: "abc123" }));
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("42");
    expect(BookingErrorSchema.parse(await response.json()).code).toBe("rate-limited");
    expect(mocks.consume.mock.calls[0][0]).toBe("booking:read:abc123");
  });
});

describe("GET /api/booking/cafes/[cafeId]/availability", () => {
  const path = (query: string) => `/api/booking/cafes/c_a/availability?${query}`;

  it("날짜·인원이 잘못되면 400과 칸별 오류", async () => {
    const response = await getAvailability(request(path("date=2026-11-21&partySize=9")), ctx("c_a"));
    expect(response.status).toBe(400);
    const body = BookingErrorSchema.parse(await response.json());
    expect(body.fieldErrors?.partySize?.[0]).toContain("8명까지");
    expect(mocks.bookingAvailability).not.toHaveBeenCalled();
  });

  it("받지 않는 매장이면 404(closed), 아니면 시각별 빈자리", async () => {
    mocks.bookingAvailability.mockResolvedValueOnce(null);
    expect((await getAvailability(request(path("date=2026-11-21&partySize=2")), ctx("c_z"))).status).toBe(404);

    mocks.bookingAvailability.mockResolvedValueOnce({ cafe: cafe("c_a"), slots: [{ time: "18:00", available: true }] });
    const response = await getAvailability(request(path("date=2026-11-21&partySize=2")), ctx("c_a"));
    expect(BookingAvailabilitySchema.parse(await response.json())).toEqual({
      cafe: { id: "c_a", name: "c_a점" },
      date: "2026-11-21",
      partySize: 2,
      slots: [{ time: "18:00", available: true }],
    });
    expect(mocks.bookingAvailability).toHaveBeenLastCalledWith("c_a", "2026-11-21", 2);
  });
});

describe("POST /api/booking/cafes/[cafeId]/reservations", () => {
  const post = (body: unknown, cafeId = "c_a") =>
    postReservation(request(`/api/booking/cafes/${cafeId}/reservations`, { body }), ctx(cafeId));

  it("개인정보 동의가 없거나 입력이 잘못되면 400과 칸별 오류, 등록하지 않는다", async () => {
    const response = await post({ ...booking, agreed: false, phone: "02-123-4567" });
    expect(response.status).toBe(400);
    const { fieldErrors } = BookingErrorSchema.parse(await response.json());
    expect(Object.keys(fieldErrors ?? {}).sort()).toEqual(["agreed", "phone"]);
    expect(mocks.bookOnline).not.toHaveBeenCalled();
  });

  it("저장소가 받지 않은 이유를 오류 코드와 고칠 칸으로 바꾼다", async () => {
    const cases = [
      ["full", 409, "full", "time"],
      ["duplicate", 409, "duplicate", "phone"],
      ["outside-hours", 400, "invalid", "time"],
      ["closed-cafe", 404, "closed", undefined],
    ] as const;
    for (const [failure, status, code, field] of cases) {
      mocks.bookOnline.mockResolvedValueOnce(failure);
      const response = await post(booking);
      const body = BookingErrorSchema.parse(await response.json());
      expect([response.status, body.code, field ? Object.keys(body.fieldErrors ?? {}) : body.fieldErrors]).toEqual([
        status,
        code,
        field ? [field] : undefined,
      ]);
    }
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("받지 않는 매장이면 저장하지 않고 404(closed)", async () => {
    const response = await post(booking, "c_z");
    expect([response.status, BookingErrorSchema.parse(await response.json()).code]).toEqual([404, "closed"]);
    expect(mocks.bookOnline).not.toHaveBeenCalled();
  });

  it("받으면 201과 확정 내용(이름·전화 없이), 직원 화면을 갱신한다", async () => {
    mocks.bookOnline.mockResolvedValueOnce({
      id: "r_1",
      cafeId: "c_a",
      name: "이영희",
      phone: "01022223333",
      partySize: 4,
      startsAt: "2026-11-21T09:00:00.000Z",
      status: "confirmed",
      createdAt: "2026-11-20T00:00:00.000Z",
      version: 3,
      source: "online",
      tableId: "t_c_a_B1",
      tableLabel: "B1",
    });
    const response = await post(booking);
    expect(response.status).toBe(201);
    const text = await response.text();
    expect(text).not.toContain("이영희");
    expect(text).not.toContain("2222");
    expect(BookingResultSchema.parse(JSON.parse(text))).toEqual({
      reservation: { id: "r_1", cafeName: "c_a점", startsAt: "2026-11-21T09:00:00.000Z", partySize: 4, table: "B1" },
    });
    expect(mocks.bookOnline.mock.calls[0][1]).toMatchObject({ phone: "01022223333", startsAt: "2026-11-21T09:00:00.000Z" });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/reservations");
    expect(mocks.consume.mock.calls[0][0]).toBe("booking:book:unknown");
  });
});

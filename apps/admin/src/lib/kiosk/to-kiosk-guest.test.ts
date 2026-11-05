import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { rejectUnauthorizedKiosk } from "./auth";
import { toKioskReservation, toKioskWaitlistEntry } from "./to-kiosk-guest";

describe("키오스크로 보내는 손님 정보", () => {
  it("이름은 가리고 전화번호는 보내지 않는다", () => {
    const reservation = toKioskReservation({
      id: "r1",
      cafeId: "a",
      name: "김철수",
      phone: "01012345678",
      partySize: 2,
      startsAt: "2026-11-05T10:00:00.000Z",
      status: "confirmed",
      createdAt: "2026-10-01T00:00:00.000Z",
      arrivedAt: "2026-11-05T09:50:00.000Z",
    });
    expect(reservation).toEqual({
      id: "r1",
      maskedName: "김*수",
      startsAt: "2026-11-05T10:00:00.000Z",
      partySize: 2,
      status: "confirmed",
      arrived: true,
    });
    const entry = toKioskWaitlistEntry({
      id: "w1",
      cafeId: "a",
      number: 3,
      name: "이영희",
      phone: "01099998888",
      partySize: 4,
      createdAt: "2026-10-01T00:00:00.000Z",
      status: "called",
      ahead: 0,
    });
    expect(JSON.stringify([reservation, entry])).not.toMatch(/0101|9999|철수|영희/);
    expect(entry).toMatchObject({ number: 3, maskedName: "이*희", status: "called", ahead: 0 });
  });
});

describe("rejectUnauthorizedKiosk", () => {
  afterEach(() => vi.unstubAllEnvs());
  const req = (auth?: string) =>
    new Request("http://x/api/kiosk", { headers: auth ? { authorization: auth } : {} });

  it("토큰을 설정하지 않으면(개발) 모두 통과한다", () => {
    vi.stubEnv("KIOSK_API_TOKEN", "");
    expect(rejectUnauthorizedKiosk(req())).toBeNull();
  });

  it("토큰을 설정하면 같은 Bearer 토큰만 통과한다", () => {
    vi.stubEnv("KIOSK_API_TOKEN", "secret");
    expect(rejectUnauthorizedKiosk(req("Bearer secret"))).toBeNull();
    expect(rejectUnauthorizedKiosk(req("Bearer nope"))?.status).toBe(401);
    expect(rejectUnauthorizedKiosk(req())?.status).toBe(401);
  });
});

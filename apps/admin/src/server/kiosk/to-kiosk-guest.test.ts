import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

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

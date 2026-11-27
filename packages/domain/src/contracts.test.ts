import { describe, expect, it } from "vitest";

import { BookingAvailabilitySchema, BookingErrorSchema, BookingOptionsSchema, BookingResultSchema } from "./booking";
import {
  KioskApiErrorSchema,
  KioskCafeGamesSchema,
  KioskCheckInResultSchema,
  KioskReservationLookupSchema,
  KioskWaitlistJoinResultSchema,
  KioskWaitlistStatusSchema,
} from "./kiosk";

// 두 앱이 따로 배포되므로 받는 쪽은 응답을 이 스키마로 확인한다. 약속한 모양은 받고, 어긋난 모양은 거른다.
const game = {
  id: "g_1",
  name: "카탄",
  categories: ["family"],
  minPlayers: 3,
  maxPlayers: 4,
  playTimeMin: 60,
  playTimeMax: 120,
  difficulty: "normal",
  availability: "available",
  availableCount: 2,
};
const reservation = {
  id: "r_1",
  maskedName: "김*수",
  startsAt: "2026-11-27T10:00:00.000Z",
  partySize: 3,
  status: "confirmed",
  arrived: false,
};
const entry = { id: "w_1", number: 7, maskedName: "이*", partySize: 2, status: "waiting", ahead: 1 };

describe("홍보 사이트 ↔ 백오피스 온라인 예약 API", () => {
  it("약속한 응답을 받는다", () => {
    expect(
      BookingOptionsSchema.parse({ cafes: [{ id: "c_a", name: "강남점", region: "서울" }], dates: ["2026-11-27"], maxPartySize: 8 })
        .cafes[0].name,
    ).toBe("강남점");
    expect(
      BookingAvailabilitySchema.parse({
        cafe: { id: "c_a", name: "강남점" },
        date: "2026-11-27",
        partySize: 2,
        slots: [{ time: "18:00", available: true }],
      }).slots,
    ).toHaveLength(1);
    expect(
      BookingResultSchema.parse({
        reservation: { id: "r_1", cafeName: "강남점", startsAt: "2026-11-27T09:00:00.000Z", partySize: 2, table: "B1" },
      }).reservation.table,
    ).toBe("B1");
    expect(BookingErrorSchema.parse({ code: "full", message: "자리가 없습니다." }).code).toBe("full");
  });

  it("모르는 오류 코드나 빠진 칸은 거른다", () => {
    expect(BookingErrorSchema.safeParse({ code: "boom", message: "?" }).success).toBe(false);
    expect(BookingResultSchema.safeParse({ reservation: { id: "r_1" } }).success).toBe(false);
    expect(BookingOptionsSchema.safeParse({ cafes: [], dates: "2026-11-27", maxPartySize: 8 }).success).toBe(false);
  });
});

describe("키오스크 ↔ 백오피스 키오스크 API", () => {
  it("약속한 응답을 받는다", () => {
    expect(
      KioskCafeGamesSchema.parse({ cafe: { id: "c_a", name: "강남점" }, games: [game], generatedAt: "2026-11-27T00:00:00Z" })
        .games[0].availability,
    ).toBe("available");
    expect(KioskReservationLookupSchema.parse({ reservations: [reservation] }).reservations[0].maskedName).toBe("김*수");
    expect(KioskCheckInResultSchema.parse({ reservation: { ...reservation, arrived: true } }).reservation.arrived).toBe(true);
    expect(KioskWaitlistStatusSchema.parse({ waitingTeams: 3, mine: [entry] }).mine[0].number).toBe(7);
    expect(KioskWaitlistJoinResultSchema.parse({ entry }).entry.ahead).toBe(1);
    expect(KioskApiErrorSchema.parse({ message: "입력을 확인해주세요.", fieldErrors: { phone: ["형식"] } }).fieldErrors?.phone).toEqual([
      "형식",
    ]);
  });

  it("모르는 상태·유형이나 전화번호가 든 응답의 빠진 칸은 거른다", () => {
    expect(KioskCafeGamesSchema.safeParse({ cafe: { id: "c_a", name: "강남점" }, games: [{ ...game, difficulty: "insane" }], generatedAt: "" }).success).toBe(false);
    expect(KioskReservationLookupSchema.safeParse({ reservations: [{ ...reservation, status: "seated" }] }).success).toBe(false);
    expect(KioskWaitlistStatusSchema.safeParse({ waitingTeams: "3", mine: [] }).success).toBe(false);
  });
});

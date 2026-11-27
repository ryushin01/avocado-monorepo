import { describe, expect, it } from "vitest";

import type { CafeTable } from "@/entities/cafe/@x/reservation";

import { bookableDates, isBookableTime, kstStartsAt, onlineBookingTimes, overlaps, pickTable, seatProblem } from "./seating";

const table = (label: string, seats: number, active = true): CafeTable => ({ id: label, cafeId: "a", label, seats, active });
const TABLES = [table("B1", 4), table("A2", 2), table("A1", 2), table("C1", 6), table("A3", 2, false)];
const at = (kst: string) => new Date(`2026-11-20T${kst}:00+09:00`).toISOString();

describe("onlineBookingTimes", () => {
  it("12시부터 20시까지 30분마다", () => {
    const times = onlineBookingTimes();
    expect(times[0]).toBe("12:00");
    expect(times.at(-1)).toBe("20:00");
    expect(times).toHaveLength(17);
    expect(times).toContain("18:30");
  });
});

describe("overlaps", () => {
  it("시작 시각이 2시간보다 가까우면 겹치고, 딱 2시간이면 겹치지 않는다", () => {
    expect(overlaps(at("18:00"), at("19:59"))).toBe(true);
    expect(overlaps(at("18:00"), at("16:01"))).toBe(true);
    expect(overlaps(at("18:00"), at("20:00"))).toBe(false);
    expect(overlaps(at("18:00"), at("16:00"))).toBe(false);
  });
});

describe("pickTable", () => {
  it("일행이 앉을 수 있는 가장 작은 빈 테이블을 고른다(같은 좌석이면 이름순)", () => {
    expect(pickTable(TABLES, [], at("18:00"), 2)?.label).toBe("A1");
    expect(pickTable(TABLES, [], at("18:00"), 3)?.label).toBe("B1");
    expect(pickTable(TABLES, [], at("18:00"), 5)?.label).toBe("C1");
  });

  it("그 시각 앞뒤 2시간에 예약이 있는 테이블과 쓰지 않는 테이블은 건너뛴다", () => {
    const taken = [{ tableId: "A1", startsAt: at("17:00") }, { tableId: "A2", startsAt: at("19:30") }];
    expect(pickTable(TABLES, taken, at("18:00"), 2)?.label).toBe("B1");
    // 쓰지 않는 A3는 비어 있어도 배정하지 않는다.
    expect(TABLES.find((t) => t.label === "A3")).toBeDefined();
    expect(pickTable(TABLES, taken, at("20:00"), 2)?.label).toBe("A1");
  });

  it("앉을 테이블이 없으면 null", () => {
    expect(pickTable(TABLES, [], at("18:00"), 7)).toBeNull();
    const taken = [{ tableId: "C1", startsAt: at("18:30") }];
    expect(pickTable(TABLES, taken, at("18:00"), 6)).toBeNull();
  });
});

describe("seatProblem", () => {
  it("쓰지 않음·좌석 부족·겹침을 구분한다", () => {
    expect(seatProblem(table("A3", 2, false), [], at("18:00"), 2)).toBe("inactive");
    expect(seatProblem(table("A1", 2), [], at("18:00"), 3)).toBe("too-small");
    expect(seatProblem(table("A1", 2), [{ tableId: "A1", startsAt: at("19:00") }], at("18:00"), 2)).toBe("taken");
    expect(seatProblem(table("A1", 2), [{ tableId: "A2", startsAt: at("18:00") }], at("18:00"), 2)).toBeNull();
  });
});

describe("isBookableTime", () => {
  const now = new Date("2026-11-20T15:10:00+09:00");

  it("받는 시각표에 있고 지금부터 1시간 뒤인 시각만", () => {
    expect(isBookableTime(kstStartsAt("2026-11-20", "16:30"), now)).toBe(true);
    expect(isBookableTime(kstStartsAt("2026-11-20", "16:00"), now)).toBe(false);
    // 30분 단위가 아니거나 12시 전·20시 뒤
    expect(isBookableTime(kstStartsAt("2026-11-21", "18:15"), now)).toBe(false);
    expect(isBookableTime(kstStartsAt("2026-11-21", "11:30"), now)).toBe(false);
    expect(isBookableTime(kstStartsAt("2026-11-21", "20:30"), now)).toBe(false);
  });

  it("오늘부터 14일 뒤 날짜까지만", () => {
    expect(isBookableTime(kstStartsAt("2026-12-04", "20:00"), now)).toBe(true);
    expect(isBookableTime(kstStartsAt("2026-12-05", "12:00"), now)).toBe(false);
  });
});

describe("bookableDates", () => {
  it("오늘부터 14일 뒤까지 15일", () => {
    const dates = bookableDates(new Date("2026-11-20T15:10:00+09:00"));
    expect([dates[0], dates.at(-1), dates.length]).toEqual(["2026-11-20", "2026-12-04", 15]);
  });

  it("오늘 받을 시각이 남지 않았으면(19시 넘음) 내일부터", () => {
    expect(bookableDates(new Date("2026-11-20T19:00:00+09:00"))[0]).toBe("2026-11-20");
    const dates = bookableDates(new Date("2026-11-20T19:01:00+09:00"));
    expect([dates[0], dates.length]).toEqual(["2026-11-21", 14]);
  });

  it("한국 날짜로 센다(UTC로는 아직 전날)", () => {
    // 한국 11월 21일 0시 30분 = UTC 11월 20일 15시 30분
    expect(bookableDates(new Date("2026-11-20T15:30:00Z"))[0]).toBe("2026-11-21");
  });
});

describe("경계값 (date-fns로 바꾼 계산)", () => {
  it("준비 시간은 딱 60분 뒤까지 받고 1밀리초라도 모자라면 받지 않는다", () => {
    const startsAt = kstStartsAt("2026-11-20", "18:00");
    expect(isBookableTime(startsAt, new Date("2026-11-20T17:00:00+09:00"))).toBe(true);
    expect(isBookableTime(startsAt, new Date("2026-11-20T17:00:00.001+09:00"))).toBe(false);
  });

  it("받는 기간 끝은 한국 날짜 자정으로 끊는다(23:59에 보면 14일 뒤 20시까지)", () => {
    const now = new Date("2026-11-20T23:59:59+09:00");
    expect(isBookableTime(kstStartsAt("2026-12-04", "20:00"), now)).toBe(true);
    expect(isBookableTime(kstStartsAt("2026-12-05", "12:00"), now)).toBe(false);
    // 자정이 지나면 하루 밀린다.
    expect(isBookableTime(kstStartsAt("2026-12-05", "12:00"), new Date("2026-11-21T00:00:00+09:00"))).toBe(true);
  });

  it("월·연·윤일을 넘는 받는 날짜", () => {
    const dates = bookableDates(new Date("2027-12-25T09:00:00+09:00"));
    expect([dates[0], dates.at(-1)]).toEqual(["2027-12-25", "2028-01-08"]);
    expect(bookableDates(new Date("2028-02-20T09:00:00+09:00"))).toContain("2028-02-29");
  });

  it("kstStartsAt은 UTC ISO(Z)로 쓰고 한국 자정은 전날 15시(UTC)다", () => {
    expect(kstStartsAt("2026-11-21", "00:00")).toBe("2026-11-20T15:00:00.000Z");
    expect(kstStartsAt("2026-12-31", "20:00")).toBe("2026-12-31T11:00:00.000Z");
  });

  it("겹침은 밀리초 단위로 본다(1시간 59분 59.999초는 겹침)", () => {
    expect(overlaps("2026-11-20T09:00:00.000Z", "2026-11-20T10:59:59.999Z")).toBe(true);
    expect(overlaps("2026-11-20T09:00:00.000Z", "2026-11-20T11:00:00.000Z")).toBe(false);
    expect(overlaps("2026-11-20T09:00:00.000Z", "2026-11-20T09:00:00.000Z")).toBe(true);
  });
});

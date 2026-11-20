import { describe, expect, it } from "vitest";

import { formatBookingDate, formatVisit, parseBookingQuery } from "./booking-query";

const options = {
  cafes: [
    { id: "c_gangnam", name: "강남점", region: "서울" },
    { id: "c_pangyo", name: "판교점", region: "경기" },
  ],
  dates: ["2026-11-20", "2026-11-21", "2026-11-22"],
  maxPartySize: 8,
};

describe("parseBookingQuery", () => {
  it("선택지에 있는 매장·날짜·인원만 받는다", () => {
    expect(parseBookingQuery({ cafe: "c_pangyo", date: "2026-11-21", people: "4" }, options)).toMatchObject({
      cafe: { id: "c_pangyo" },
      date: "2026-11-21",
      partySize: 4,
      submitted: true,
    });
    expect(parseBookingQuery({ cafe: "c_x", date: "2026-12-31", people: "9" }, options)).toEqual({
      cafe: undefined,
      date: undefined,
      partySize: undefined,
      submitted: true,
    });
    expect(parseBookingQuery({ people: "2.5" }, options).partySize).toBeUndefined();
  });

  it("처음 열었을 때는 submitted가 아니다(매장 오류를 보이지 않음)", () => {
    expect(parseBookingQuery({}, options).submitted).toBe(false);
    expect(parseBookingQuery({ date: "2026-11-21", people: "2" }, options)).toMatchObject({ cafe: undefined, submitted: true });
  });

  it("같은 이름이 여러 번 오면 첫 값을 쓴다", () => {
    expect(parseBookingQuery({ cafe: ["c_gangnam", "c_pangyo"] }, options).cafe?.id).toBe("c_gangnam");
  });
});

describe("formatBookingDate·formatVisit", () => {
  it("한국 날짜를 요일과 함께 쓰고, 오늘·내일을 덧붙인다", () => {
    expect(formatBookingDate("2026-11-21")).toBe("11월 21일 (토)");
    expect(formatBookingDate("2026-11-20", "2026-11-20")).toBe("11월 20일 (금) · 오늘");
    expect(formatBookingDate("2026-11-21", "2026-11-20")).toBe("11월 21일 (토) · 내일");
    expect(formatBookingDate("2026-12-01", "2026-11-30")).toBe("12월 1일 (화) · 내일");
  });

  it("방문 시각을 한국 시간으로 쓴다", () => {
    expect(formatVisit("2026-11-21T09:00:00.000Z")).toBe("11월 21일 (토) 18:00");
    expect(formatVisit("2026-11-20T15:30:00.000Z")).toBe("11월 21일 (토) 00:30");
  });
});

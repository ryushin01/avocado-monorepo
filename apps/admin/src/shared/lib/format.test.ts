import { describe, expect, it } from "vitest";

import { formatDateTime, formatMinutes, formatMonthDay, formatShortDate, formatTickDate, formatTime } from "./format";

// 바꾸기 전 표시(Intl, 한국 시간)와 같은지 비교한다.
const before = {
  time: new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Asia/Seoul" }),
  dateTime: new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Asia/Seoul",
  }),
  monthDay: new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", timeZone: "Asia/Seoul" }),
  shortDate: new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric", timeZone: "UTC" }),
};

describe("시각·날짜 표시", () => {
  it("한국 시간으로 쓴다(자정 경계)", () => {
    expect(formatTime("2026-11-20T14:59:00.000Z")).toBe("23:59");
    expect(formatTime("2026-11-20T15:00:00.000Z")).toBe("00:00");
    expect(formatDateTime("2026-11-02T15:05:00.000Z")).toBe("11월 3일 (화) 00:05");
    expect(formatDateTime("2026-12-31T14:59:00.000Z")).toBe("12월 31일 (목) 23:59");
    expect(formatMonthDay("2026-12-31T15:00:00.000Z")).toBe("1월 1일");
  });

  it("한국 날짜 문자열은 시간대와 무관하게 그 날짜로 쓴다", () => {
    expect(formatShortDate("2026-11-03")).toBe("11월 3일");
    expect(formatShortDate("2028-02-29")).toBe("2월 29일");
    expect(formatTickDate("2026-01-09")).toBe("1/9");
  });

  it("바꾸기 전(Intl) 표시와 1년 동안 같다", () => {
    const start = Date.parse("2026-01-01T00:00:00Z");
    for (let t = start; t < start + 366 * 86_400_000; t += 97 * 60_000) {
      const iso = new Date(t).toISOString();
      expect(formatTime(iso)).toBe(before.time.format(t));
      expect(formatDateTime(iso)).toBe(before.dateTime.format(t));
      expect(formatMonthDay(iso)).toBe(before.monthDay.format(t));
      const date = iso.slice(0, 10);
      expect(formatShortDate(date)).toBe(before.shortDate.format(new Date(`${date}T00:00:00Z`)));
    }
  });
});

describe("formatMinutes", () => {
  it("0인 단위는 빼고 시간·분으로 쓴다", () => {
    expect(formatMinutes(0)).toBe("0분");
    expect(formatMinutes(45)).toBe("45분");
    expect(formatMinutes(60)).toBe("1시간");
    expect(formatMinutes(90)).toBe("1시간 30분");
    expect(formatMinutes(1501)).toBe("25시간 1분");
  });
});

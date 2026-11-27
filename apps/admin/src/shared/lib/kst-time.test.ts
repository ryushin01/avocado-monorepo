import { afterEach, describe, expect, it } from "vitest";

import { addKstDays, kstDayRange, kstIso, minutesBetween, startOfKstDay, toKstDate, toKstTime } from "./kst-time";

const H = 3_600_000;
const originalTz = process.env.TZ;

afterEach(() => {
  process.env.TZ = originalTz;
});

describe("한국 날짜 경계", () => {
  it("한국 자정(UTC 15시) 앞뒤로 날짜가 바뀐다", () => {
    const midnight = Date.parse("2026-11-20T15:00:00.000Z"); // 한국 11월 21일 0시
    expect(toKstDate(midnight - 1)).toBe("2026-11-20");
    expect(toKstDate(midnight)).toBe("2026-11-21");
    expect(startOfKstDay(midnight - 1)).toBe(midnight - 24 * H);
    expect(startOfKstDay(midnight)).toBe(midnight);
    expect(startOfKstDay(midnight + 24 * H - 1)).toBe(midnight);
  });

  it("kstDayRange는 [그날 0시, 다음날 0시)", () => {
    expect(kstDayRange("2026-11-21")).toEqual({
      from: Date.parse("2026-11-20T15:00:00Z"),
      to: Date.parse("2026-11-21T15:00:00Z"),
    });
    // 윤일·연말
    expect(kstDayRange("2028-02-29").to - kstDayRange("2028-02-29").from).toBe(24 * H);
    expect(new Date(kstDayRange("2026-12-31").to).toISOString()).toBe("2026-12-31T15:00:00.000Z");
  });

  it("addKstDays는 달·해·윤일을 넘는다", () => {
    expect(addKstDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addKstDays("2027-01-01", -1)).toBe("2026-12-31");
    expect(addKstDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addKstDays("2027-02-28", 1)).toBe("2027-03-01");
  });

  it("toKstTime·kstIso는 한국 시각을 쓴다", () => {
    expect(toKstTime("2026-11-20T14:59:00.000Z")).toBe("23:59");
    expect(toKstTime("2026-11-20T15:00:00.000Z")).toBe("00:00");
    expect(kstIso("2026-11-21", "00:30")).toBe("2026-11-20T15:30:00.000Z");
  });

  it("실행 환경의 시간대가 달라도 결과가 같다", () => {
    process.env.TZ = "America/New_York";
    expect(toKstDate(Date.parse("2026-11-20T15:00:00.000Z"))).toBe("2026-11-21");
    expect(startOfKstDay(Date.parse("2026-11-20T15:00:00.000Z"))).toBe(Date.parse("2026-11-20T15:00:00.000Z"));
    // 미국 서머타임이 끝나는 날(11월 1일)에도 한국 하루는 24시간
    expect(kstDayRange("2026-11-01").to - kstDayRange("2026-11-01").from).toBe(24 * H);
    expect(addKstDays("2026-11-01", 1)).toBe("2026-11-02");
    expect(kstIso("2026-03-08", "12:00")).toBe("2026-03-08T03:00:00.000Z");
  });

  it("이전 계산(UTC+9 고정)과 2년 동안 같은 날짜·0시를 낸다", () => {
    const start = Date.parse("2026-01-01T00:00:00Z");
    for (let t = start; t < start + 730 * 24 * H; t += 37 * 60_000 + 13_000) {
      expect(toKstDate(t)).toBe(new Date(t + 9 * H).toISOString().slice(0, 10));
      expect(startOfKstDay(t)).toBe(Math.floor((t + 9 * H) / (24 * H)) * 24 * H - 9 * H);
    }
  });
});

describe("minutesBetween", () => {
  it("분은 내림하고 거꾸로면 0", () => {
    expect(minutesBetween("2026-11-20T09:00:00Z", "2026-11-20T09:00:59.999Z")).toBe(0);
    expect(minutesBetween("2026-11-20T09:00:00Z", "2026-11-20T09:01:00Z")).toBe(1);
    expect(minutesBetween("2026-11-20T09:00:00Z", Date.parse("2026-11-20T11:30:30Z"))).toBe(150);
    expect(minutesBetween("2026-11-20T09:00:00Z", "2026-11-20T08:00:00Z")).toBe(0);
  });
});

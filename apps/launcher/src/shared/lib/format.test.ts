import { describe, expect, it } from "vitest";

import { formatKstTime } from "./format";

const before = new Intl.DateTimeFormat("ko-KR", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Seoul" });

describe("formatKstTime", () => {
  it("한국 시각을 오전·오후 12시간제로 쓴다(자정·정오 경계)", () => {
    expect(formatKstTime("2026-11-20T10:30:00.000Z")).toBe("오후 7:30");
    expect(formatKstTime("2026-11-20T15:00:00.000Z")).toBe("오전 12:00");
    expect(formatKstTime("2026-11-20T02:59:00.000Z")).toBe("오전 11:59");
    expect(formatKstTime("2026-11-20T03:00:00.000Z")).toBe("오후 12:00");
  });

  it("바꾸기 전(Intl) 표시와 하루 내내 같다", () => {
    const start = Date.parse("2026-11-20T00:00:00Z");
    for (let t = start; t < start + 86_400_000; t += 60_000) {
      expect(formatKstTime(new Date(t).toISOString())).toBe(before.format(t));
    }
  });
});

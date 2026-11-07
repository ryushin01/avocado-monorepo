import { describe, expect, it } from "vitest";

import { analyticsUpstream, posthogOptions, toVitalEvent } from "./analytics";

describe("toVitalEvent", () => {
  it("CLS는 소수 셋째 자리까지, 나머지는 밀리초 정수로 보낸다", () => {
    expect(toVitalEvent({ name: "CLS", value: 0.123456, rating: "good" }, "/").value).toBe(0.123);
    expect(toVitalEvent({ name: "LCP", value: 1234.56, rating: "needs-improvement" }, "/").value).toBe(1235);
  });

  it("주소의 쿼리를 빼고 경로만 남기며, 모르는 값은 unknown으로 둔다", () => {
    expect(toVitalEvent({ name: "INP", value: 80 }, "/games?q=전화번호")).toEqual({
      metric: "INP",
      value: 80,
      rating: "unknown",
      navigation_type: "unknown",
      path: "/games",
    });
  });
});

describe("posthogOptions", () => {
  it("사람을 식별하거나 녹화하지 않고, 쿠키를 쓰지 않는다", () => {
    expect(posthogOptions).toMatchObject({
      persistence: "memory",
      person_profiles: "never",
      autocapture: false,
      disable_session_recording: true,
      respect_dnt: true,
    });
  });
});

describe("analyticsUpstream", () => {
  it("PostHog 클라우드면 정적 파일 주소를 지역에 맞춰 고르고, 직접 운영하는 주소는 그대로 쓴다", () => {
    expect(analyticsUpstream("https://eu.i.posthog.com")).toEqual({
      api: "https://eu.i.posthog.com",
      assets: "https://eu-assets.i.posthog.com",
    });
    expect(analyticsUpstream("https://posthog.example.com").assets).toBe("https://posthog.example.com");
  });
});

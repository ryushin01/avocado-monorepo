import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ enabled: true, init: vi.fn(), capture: vi.fn(), fail: false }));
vi.mock("@/shared/config", () => ({
  get analyticsEnabled() {
    return mocks.enabled;
  },
  posthogKey: "phc_test",
  posthogOptions: { api_host: "/ingest" },
}));
// 내려받기 실패는 모듈을 꺼낼 때 던지는 것으로 흉내 낸다(가짜 모듈은 한 번만 만들어진다).
vi.mock("posthog-js/dist/module.slim", () => ({
  get default() {
    if (mocks.fail) throw new Error("광고 차단기");
    return { init: mocks.init, capture: mocks.capture };
  },
}));

/** 모듈 안의 상태(불러온 클라이언트·쌓아 둔 이벤트)를 테스트마다 새로 시작한다. */
async function freshAnalytics() {
  vi.resetModules();
  return import("./analytics");
}

beforeEach(() => {
  mocks.enabled = true;
  mocks.fail = false;
  mocks.init.mockClear();
  mocks.capture.mockClear();
});

describe("분석 이벤트", () => {
  it("불러오기 전에 생긴 이벤트를 모아 두었다가 불러오면 순서대로 보내고, 그 뒤는 바로 보낸다", async () => {
    const { initAnalytics, track } = await freshAnalytics();
    track("web_vital", { name: "LCP" });
    track("booking_open", {});
    expect(mocks.capture).not.toHaveBeenCalled();

    await initAnalytics();
    expect(mocks.init).toHaveBeenCalledWith("phc_test", { api_host: "/ingest" });
    expect(mocks.capture.mock.calls).toEqual([
      ["web_vital", { name: "LCP" }],
      ["booking_open", {}],
    ]);

    track("booking_done", { cafe: "c_a" });
    expect(mocks.capture).toHaveBeenLastCalledWith("booking_done", { cafe: "c_a" });
    await initAnalytics();
    expect(mocks.init).toHaveBeenCalledTimes(1);
  });

  it("쌓아 두는 이벤트는 50건까지만 남긴다", async () => {
    const { initAnalytics, track } = await freshAnalytics();
    for (let i = 0; i < 60; i++) track("e", { i });
    await initAnalytics();
    expect(mocks.capture).toHaveBeenCalledTimes(50);
  });

  it("키가 없으면 내려받지도 모으지도 않는다", async () => {
    mocks.enabled = false;
    const { initAnalytics, track } = await freshAnalytics();
    track("e", {});
    await initAnalytics();
    expect(mocks.init).not.toHaveBeenCalled();
    expect(mocks.capture).not.toHaveBeenCalled();
  });

  it("내려받지 못하면(광고 차단기 등) 쌓인 이벤트를 버리고 이후 이벤트도 무시한다", async () => {
    mocks.fail = true;
    const { initAnalytics, track } = await freshAnalytics();
    track("e", {});
    await expect(initAnalytics()).resolves.toBeUndefined();
    track("e2", {});
    mocks.fail = false;
    await initAnalytics();
    expect(mocks.init).not.toHaveBeenCalled();
    expect(mocks.capture).not.toHaveBeenCalled();
  });
});

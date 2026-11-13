import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sentry = vi.hoisted(() => ({
  init: vi.fn(),
  captureException: vi.fn(),
  withScope: vi.fn((callback: (scope: { addEventProcessor: () => void }) => void) =>
    callback({ addEventProcessor: () => {} }),
  ),
}));
vi.mock("./sentry", () => sentry);

const listeners = new Map<string, (event: unknown) => void>();
beforeEach(() => {
  listeners.clear();
  vi.stubGlobal("window", {
    addEventListener: (type: string, listener: (event: unknown) => void) => listeners.set(type, listener),
    removeEventListener: (type: string) => listeners.delete(type),
  });
  // 페이지를 다 받은 상태로 둔다(받기는 load 이후 한가할 때 시작).
  vi.stubGlobal("document", { readyState: "complete" });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
  vi.clearAllMocks();
});

const load = async (dsn?: string) => {
  if (dsn) vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", dsn);
  return import("./index");
};

describe("initMonitoring", () => {
  it("DSN이 없으면 Sentry를 받지 않는다", async () => {
    const { initMonitoring, captureException } = await load();
    initMonitoring();
    captureException(new Error("x"));
    await Promise.resolve();
    expect(sentry.init).not.toHaveBeenCalled();
    expect(listeners.size).toBe(0);
  });

  it("DSN이 있으면 받는 동안 난 오류를 모았다가 보내고, 전역 처리기를 뗀다", async () => {
    const { initMonitoring } = await load("https://key@o1.ingest.sentry.io/1");
    initMonitoring();
    const error = new Error("첫 화면");
    listeners.get("error")?.({ error });
    await vi.waitFor(() => expect(sentry.captureException).toHaveBeenCalledWith(error));
    expect(sentry.init).toHaveBeenCalledOnce();
    expect(sentry.withScope).toHaveBeenCalledOnce();
    expect(listeners.size).toBe(0);
  });

  it("받는 동안 들어온 오류는 20개까지만 모은다", async () => {
    const { initMonitoring, captureException } = await load("https://key@o1.ingest.sentry.io/1");
    initMonitoring();
    for (let i = 0; i < 30; i += 1) captureException(new Error(`오류 ${i}`));
    await vi.waitFor(() => expect(sentry.captureException).toHaveBeenCalledTimes(20));
    captureException(new Error("준비된 뒤"));
    expect(sentry.captureException).toHaveBeenCalledTimes(21);
  });

  it("load가 10초 안에 오지 않으면 한가할 때를 기다리지 않고 10초에 Sentry를 받는다", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("document", { readyState: "loading" });
    // 한가한 때가 오지 않는 브라우저: 기한에 다시 requestIdleCallback을 기다리면 받지 못한다.
    vi.stubGlobal("window", {
      addEventListener: (type: string, listener: (event: unknown) => void) => listeners.set(type, listener),
      removeEventListener: (type: string) => listeners.delete(type),
      requestIdleCallback: () => 0,
    });
    const { initMonitoring } = await load("https://key@o1.ingest.sentry.io/1");
    initMonitoring();
    await vi.advanceTimersByTimeAsync(9_000);
    expect(sentry.init).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1_000);
    await vi.waitFor(() => expect(sentry.init).toHaveBeenCalledOnce());
  });

  it("load가 10초 안에 오면 기한을 거두고 한가할 때를 기다린다", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("document", { readyState: "loading" });
    // 한가할 때 부를 함수를 모아 두었다가 직접 부른다.
    const idleCallbacks: Array<() => void> = [];
    vi.stubGlobal("window", {
      addEventListener: (type: string, listener: (event: unknown) => void) => listeners.set(type, listener),
      removeEventListener: (type: string) => listeners.delete(type),
      requestIdleCallback: (callback: () => void) => idleCallbacks.push(callback),
    });
    const { initMonitoring } = await load("https://key@o1.ingest.sentry.io/1");
    initMonitoring();
    await vi.advanceTimersByTimeAsync(9_000);
    listeners.get("load")?.({});
    // 10초가 지나도 한가할 때가 오기 전에는 받지 않는다.
    await vi.advanceTimersByTimeAsync(2_000);
    expect(sentry.init).not.toHaveBeenCalled();
    for (const callback of idleCallbacks) callback();
    await vi.waitFor(() => expect(sentry.init).toHaveBeenCalledOnce());
  });
});

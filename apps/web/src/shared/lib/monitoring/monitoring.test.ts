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
});

import { afterEach, describe, expect, it, vi } from "vitest";

import { logError, reportErrorsTo } from "@avocado/logger";

const sentry = vi.hoisted(() => {
  const scope = { setTag: vi.fn(), setContext: vi.fn() };
  return {
    scope,
    init: vi.fn(),
    captureException: vi.fn(),
    captureMessage: vi.fn(),
    captureRequestError: vi.fn(),
    withScope: vi.fn((callback: (s: typeof scope) => void) => callback(scope)),
  };
});
vi.mock("@sentry/nextjs", () => sentry);

import { createSentryOptions } from "./options";
import { createRequestErrorHandler, registerServerMonitoring } from "./server";

const DSN = "https://key@example.ingest.sentry.io/1";

afterEach(() => {
  reportErrorsTo(undefined);
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("registerServerMonitoring", () => {
  it("DSN이 없으면 로그 오류를 넘기지 않는다", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    registerServerMonitoring(createSentryOptions({ dsn: undefined, service: "admin" }));
    logError("admin", "audit_write_failed", { error: new Error("x") });
    expect(sentry.init).toHaveBeenCalledOnce();
    expect(sentry.captureException).not.toHaveBeenCalled();
  });

  it("logError로 남긴 오류를 보내고, 같은 이벤트는 10분에 한 번만 보낸다", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    let now = 0;
    registerServerMonitoring(createSentryOptions({ dsn: DSN, service: "launcher" }), () => now);
    logError("launcher", "backoffice_unreachable", { path: "/games", error: new Error("fetch failed") });
    now = 60_000;
    logError("launcher", "backoffice_unreachable", { path: "/games", error: new Error("fetch failed") });
    logError("launcher", "launcher_config_missing", { missing: ["KIOSK_API_TOKEN"] });
    now = 11 * 60_000;
    logError("launcher", "backoffice_unreachable", { path: "/games", error: new Error("fetch failed") });

    expect(sentry.captureException).toHaveBeenCalledTimes(2);
    expect(sentry.captureMessage).toHaveBeenCalledWith("launcher_config_missing", "error");
    expect(sentry.scope.setTag).toHaveBeenCalledWith("event", "backoffice_unreachable");
    expect(sentry.scope.setContext).toHaveBeenCalledWith("log", { missing: ["KIOSK_API_TOKEN"] });
  });

  it("요청 오류는 onRequestError가 보내므로 로그 쪽에서는 넘기지 않는다", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    registerServerMonitoring(createSentryOptions({ dsn: DSN, service: "admin" }));
    const onRequestError = createRequestErrorHandler("admin");
    const error = new Error("boom");
    const request = { path: "/reservations?phone4=1234", method: "GET", headers: {} };
    const context = { routerKind: "App Router" as const, routePath: "/reservations", routeType: "render" as const, renderSource: "react-server-components" as const, revalidateReason: undefined, renderType: "dynamic" as const };
    onRequestError(error, request, context);
    expect(sentry.captureRequestError).toHaveBeenCalledWith(error, request, context);
    expect(sentry.captureException).not.toHaveBeenCalled();
    // 로그에는 쿼리 문자열을 남기지 않는다(logRequestError).
    expect(JSON.parse(vi.mocked(console.error).mock.calls[0][0] as string)).toMatchObject({ event: "request_error", path: "/reservations" });
  });
});

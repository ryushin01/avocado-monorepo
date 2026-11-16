import { afterEach, describe, expect, it, vi } from "vitest";

import {
  type ErrorReporter,
  logError,
  logInfo,
  logRequestError,
  redactConsoleErrors,
  redactSecrets,
  reportErrorsTo,
  stripQuery,
} from "./index";

afterEach(() => vi.restoreAllMocks());

function lastLog() {
  const spy = vi.mocked(console.error);
  return JSON.parse(spy.mock.calls.at(-1)?.[0] as string);
}

describe("redactSecrets", () => {
  it("쿼리 값(params)을 지운다", () => {
    expect(redactSecrets('Failed query: select 1\nparams: 01012345678,김철수')).toBe(
      "Failed query: select 1\nparams: [생략]",
    );
  });

  it("줄바꿈이 든 값도 지우고 스택은 남긴다", () => {
    const text = "Error: Failed query: x\nparams: 메모 첫 줄\n01012345678\n    at run (a.ts:1:1)";
    expect(redactSecrets(text)).toBe("Error: Failed query: x\nparams: [생략]\n    at run (a.ts:1:1)");
  });
});

describe("stripQuery", () => {
  it("쿼리 문자열을 뺀다", () => {
    expect(stripQuery("/api/waitlist?phone4=1234")).toBe("/api/waitlist");
  });
});

describe("logRequestError", () => {
  it("요청 경로·라우트·오류 번호를 남기고 민감한 값은 남기지 않는다", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const error = Object.assign(new Error("Failed query: select\nparams: 01012345678"), {
      digest: "123",
      cause: { message: "connection refused", code: "ECONNREFUSED" },
    });

    logRequestError(
      "admin",
      error,
      { path: "/reservations?phone4=5678", method: "GET", headers: { cookie: "session=secret" } } as never,
      { routePath: "/reservations", routeType: "render" },
    );

    const log = lastLog();
    expect(log).toMatchObject({
      level: "error",
      service: "admin",
      event: "request_error",
      path: "/reservations",
      digest: "123",
      cause: "connection refused",
      causeCode: "ECONNREFUSED",
    });
    const raw = JSON.stringify(log);
    expect(raw).not.toContain("01012345678");
    expect(raw).not.toContain("5678");
    expect(raw).not.toContain("secret");
  });
});

describe("logError", () => {
  it("Error가 아닌 값도 기록한다", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    logError("launcher", "backoffice_unreachable", { status: 500, error: "boom" });
    expect(lastLog()).toMatchObject({ event: "backoffice_unreachable", status: 500, message: "boom" });
  });

  it("정해 둔 모니터링에도 넘기되, 오류는 쿼리 값을 가린 사본을 넘긴다", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const reports: Parameters<ErrorReporter>[0][] = [];
    reportErrorsTo((report) => reports.push(report));
    try {
      logError("admin", "audit_write_failed", { action: "cafe.update", error: new Error("Failed query: x\nparams: 01012345678") });
      logError("launcher", "launcher_config_missing", { missing: ["KIOSK_API_TOKEN"] });
    } finally {
      reportErrorsTo(undefined);
    }
    expect(reports.map(({ service, event, fields }) => ({ service, event, fields }))).toEqual([
      { service: "admin", event: "audit_write_failed", fields: { action: "cafe.update" } },
      { service: "launcher", event: "launcher_config_missing", fields: { missing: ["KIOSK_API_TOKEN"] } },
    ]);
    expect(reports[0].error?.message).toBe("Failed query: x\nparams: [생략]");
    expect(reports[1].error).toBeUndefined();
  });

  it("모니터링으로 넘기다 실패해도 로그는 남기고 오류를 던지지 않는다", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    reportErrorsTo(() => {
      throw new Error("모니터링 장애");
    });
    try {
      expect(() => logError("admin", "x")).not.toThrow();
    } finally {
      reportErrorsTo(undefined);
    }
    expect(lastLog()).toMatchObject({ event: "x" });
  });
});

describe("redactConsoleErrors", () => {
  it("console.error로 나가는 Error와 문자열의 쿼리 값을 가리고 오류 번호는 남긴다", () => {
    const original = console.error;
    const output = vi.fn();
    console.error = output;
    try {
      redactConsoleErrors();
      const error = Object.assign(new Error("Failed query: x\nparams: 01012345678"), {
        digest: "9",
        cause: Object.assign(new Error("duplicate key"), { detail: "Key (phone)=(01012345678)" }),
      });
      console.error("⨯", error, "Failed query: y\nparams: 01099998888");

      const [prefix, logged, text] = output.mock.calls[0];
      expect(prefix).toBe("⨯");
      expect(logged).toBeInstanceOf(Error);
      expect(logged.message).toBe("Failed query: x\nparams: [생략]");
      expect(logged.stack).not.toContain("01012345678");
      expect(logged.digest).toBe("9");
      expect(logged.cause).toBe("duplicate key");
      expect(text).toBe("Failed query: y\nparams: [생략]");
    } finally {
      console.error = original;
    }
  });
});

describe("logInfo", () => {
  it("운영 기록을 한 줄 JSON으로 표준 출력에 남긴다", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    logInfo("admin", "retention_pruned", { reservations: 3 });
    expect(JSON.parse(info.mock.calls[0][0] as string)).toMatchObject({ level: "info", service: "admin", event: "retention_pruned", reservations: 3 });
  });
});

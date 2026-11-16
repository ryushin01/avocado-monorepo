import { afterEach, describe, expect, it, vi } from "vitest";

const prune = vi.hoisted(() => vi.fn());
vi.mock("./data", () => ({ pruneExpiredRecords: prune }));

import { GET } from "./route";

const call = (authorization?: string) =>
  GET(new Request("http://localhost/api/cron/retention", { headers: authorization ? { authorization } : {} }));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  prune.mockReset();
});

describe("GET /api/cron/retention", () => {
  it("CRON_SECRET이 없거나 다르면 정리하지 않는다", async () => {
    expect((await call("Bearer anything")).status).toBe(401);
    vi.stubEnv("CRON_SECRET", "s3cret");
    expect((await call()).status).toBe(401);
    expect((await call("Bearer wrong")).status).toBe(401);
    expect(prune).not.toHaveBeenCalled();
  });

  it("Vercel Cron의 비밀 값이 맞으면 정리하고 지운 수를 남긴다", async () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    prune.mockResolvedValue({ reservations: 2, waitlistEntries: 1, auditLogs: 0, loginAttempts: 0, rateLimits: 3 });
    const response = await call("Bearer s3cret");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ removed: { reservations: 2, waitlistEntries: 1, auditLogs: 0, loginAttempts: 0, rateLimits: 3 } });
    expect(JSON.parse(info.mock.calls[0][0] as string)).toMatchObject({ event: "retention_pruned", reservations: 2 });
  });

  it("정리에 실패하면 500과 오류 로그", async () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    prune.mockRejectedValue(new Error("db down"));
    expect((await call("Bearer s3cret")).status).toBe(500);
    expect(JSON.parse(error.mock.calls[0][0] as string)).toMatchObject({ event: "retention_failed" });
  });
});

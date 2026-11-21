import { describe, expect, it, vi } from "vitest";

import { createSharedDbGuard } from "./shared-guard";

const options = {
  openTimeoutMs: 1000,
  probeTimeoutMs: 1000,
  probeEveryMs: 60_000,
  retryMs: 60_000,
};

describe("createSharedDbGuard (공유 데모 DB 대체)", () => {
  it("열리면 그 DB를 돌려주고, 확인 간격 안에서는 다시 묻지 않는다", async () => {
    const probe = vi.fn(async () => {});
    const guard = createSharedDbGuard({ ...options, open: async () => "db", probe });

    expect(await guard.get(0)).toBe("db");
    expect(await guard.get(30_000)).toBe("db");
    expect(probe).not.toHaveBeenCalled();
    expect(await guard.get(60_000)).toBe("db");
    expect(probe).toHaveBeenCalledTimes(1);
    expect(guard.offline(60_000)).toBe(false);
  });

  it("열지 못하면 null로 알리고 기록하며, 다시 시도할 때까지 열지 않는다", async () => {
    const open = vi.fn(async () => {
      throw new Error("getaddrinfo ENOTFOUND");
    });
    const onError = vi.fn();
    const guard = createSharedDbGuard({ ...options, open, probe: async () => {}, onError });

    expect(await guard.get(0)).toBeNull();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(guard.offline(10_000)).toBe(true);
    expect(await guard.get(10_000)).toBeNull();
    expect(open).toHaveBeenCalledTimes(1);

    open.mockResolvedValueOnce("db" as never);
    expect(await guard.get(60_000)).toBe("db");
    expect(guard.offline(60_000)).toBe(false);
  });

  it("응답하지 않는 DB(시간 초과)도 닿지 않는 것으로 본다", async () => {
    vi.useFakeTimers();
    try {
      const guard = createSharedDbGuard({ ...options, open: () => new Promise<string>(() => {}), probe: async () => {} });
      const result = guard.get(0);
      await vi.advanceTimersByTimeAsync(1000);
      expect(await result).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("열어 둔 연결이 확인에 실패하면(무료 한도 초과 등) 대체로 바꾼다", async () => {
    const guard = createSharedDbGuard({
      ...options,
      open: async () => "db",
      probe: async () => {
        throw new Error("compute time quota exceeded");
      },
    });

    expect(await guard.get(0)).toBe("db");
    expect(await guard.get(60_000)).toBeNull();
    expect(guard.offline(60_001)).toBe(true);
  });
});

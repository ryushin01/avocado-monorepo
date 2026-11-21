/**
 * 공개 데모의 공유 DB(Neon)에 닿지 않을 때를 가려낸다.
 * 무료 한도 초과·장애·오프라인으로 공유 DB를 열지 못하거나(시간 초과 포함) 열어 둔 연결이 응답하지 않으면
 * null을 돌려주고, retryMs 동안은 다시 묻지 않는다. 그동안 부르는 쪽은 메모리 DB(PGlite) 시드로 대신 보여 준다.
 * 열어 둔 연결은 probeEveryMs마다 한 번만 가볍게 확인해 요청마다 DB에 더 묻지 않는다.
 */
export type SharedDbGuard<T> = {
  get: (now?: number) => Promise<T | null>;
  /** 지금 대체 중인지(화면 안내용) */
  offline: (now?: number) => boolean;
};

type GuardOptions<T> = {
  open: () => Promise<T>;
  probe: (db: T) => Promise<unknown>;
  openTimeoutMs: number;
  probeTimeoutMs: number;
  probeEveryMs: number;
  retryMs: number;
  onError?: (error: unknown) => void;
};

export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${ms}ms 안에 응답하지 않았습니다.`)), ms);
    (timer as { unref?: () => void }).unref?.();
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export function createSharedDbGuard<T>({
  open,
  probe,
  openTimeoutMs,
  probeTimeoutMs,
  probeEveryMs,
  retryMs,
  onError,
}: GuardOptions<T>): SharedDbGuard<T> {
  let offlineUntil = 0;
  let checkedAt: number | undefined;

  async function get(now = Date.now()): Promise<T | null> {
    if (now < offlineUntil) return null;
    try {
      const db = await withTimeout(open(), openTimeoutMs);
      if (checkedAt === undefined) {
        // 방금 열었다면 연결이 살아 있으므로 확인을 건너뛴다.
        checkedAt = now;
      } else if (now - checkedAt >= probeEveryMs) {
        await withTimeout(probe(db), probeTimeoutMs);
        checkedAt = now;
      }
      return db;
    } catch (error) {
      offlineUntil = now + retryMs;
      checkedAt = undefined;
      onError?.(error);
      return null;
    }
  }

  return { get, offline: (now = Date.now()) => now < offlineUntil };
}

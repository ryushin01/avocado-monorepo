"use client";

import { useSyncExternalStore } from "react";

const MINUTE = 60_000;

// 모든 구독자가 타이머 하나를 함께 쓴다. 분이 바뀔 때만 다시 그리면 되므로
// 스냅샷을 분 단위로 내려서, 같은 분 안에서는 같은 값을 돌려준다.
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;

function subscribe(listener: () => void) {
  listeners.add(listener);
  timer ??= setInterval(() => listeners.forEach((l) => l()), 15_000);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

const minuteOf = (time: number) => Math.floor(time / MINUTE) * MINUTE;

/**
 * 지금 시각(분 단위로 내림). 서버에서 그린 시각(serverNow)으로 하이드레이션한 뒤,
 * 브라우저 시각으로 바꾸고 분이 바뀔 때마다 갱신한다.
 */
export function useMinuteClock(serverNow: number) {
  return useSyncExternalStore(
    subscribe,
    () => minuteOf(Date.now()),
    () => minuteOf(serverNow),
  );
}

import type { PostHog } from "posthog-js/dist/module.slim";

import { analyticsEnabled, posthogKey, posthogOptions } from "@/shared/config";

let client: PostHog | null = null;
let stopped = false;
const pending: Array<[string, Record<string, unknown>]> = [];
// 불러오기가 늦어져도 쌓아 두는 양을 제한한다. Web Vitals는 화면마다 몇 건뿐이다.
const MAX_PENDING = 50;

/** 키가 있을 때만 PostHog를 나중에 내려받아, 첫 화면의 자바스크립트를 늘리지 않는다. */
export async function initAnalytics() {
  if (!analyticsEnabled || client || stopped) return;
  try {
    // 쓰는 기능(직접 보내는 이벤트·페이지 이동 기록)만 든 slim 빌드를 받는다. 기본 빌드의 자동 수집·설문·실험 기능은 옵션으로
    // 모두 끄고 있어 필요 없고, 이 조각이 사이트 전체 JS 예산(450 kB)의 큰 몫을 차지했다.
    const { default: posthog } = await import("posthog-js/dist/module.slim");
    posthog.init(posthogKey, posthogOptions);
    client = posthog;
  } catch {
    // 광고 차단기나 네트워크 오류로 못 받으면 통계 없이 계속 쓴다.
    stopped = true;
    pending.length = 0;
    return;
  }
  for (const [event, properties] of pending.splice(0)) client.capture(event, properties);
}

/** 불러오기 전에 생긴 이벤트는 모아 두었다가 보낸다. */
export function track(event: string, properties: Record<string, unknown>) {
  if (!analyticsEnabled || stopped) return;
  if (client) client.capture(event, properties);
  else if (pending.length < MAX_PENDING) pending.push([event, properties]);
}

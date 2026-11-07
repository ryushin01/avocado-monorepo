import type { PostHog } from "posthog-js";

import { analyticsEnabled, posthogKey, posthogOptions } from "@/shared/config/analytics";

let client: PostHog | null = null;
const pending: Array<[string, Record<string, unknown>]> = [];

/** 키가 있을 때만 PostHog를 나중에 내려받아, 첫 화면의 자바스크립트를 늘리지 않는다. */
export async function initAnalytics() {
  if (!analyticsEnabled || client) return;
  const { default: posthog } = await import("posthog-js");
  posthog.init(posthogKey, posthogOptions);
  client = posthog;
  for (const [event, properties] of pending.splice(0)) client.capture(event, properties);
}

/** 불러오기 전에 생긴 이벤트는 모아 두었다가 보낸다. */
export function track(event: string, properties: Record<string, unknown>) {
  if (!analyticsEnabled) return;
  if (client) client.capture(event, properties);
  else pending.push([event, properties]);
}

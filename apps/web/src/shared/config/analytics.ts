import type { PostHogConfig } from "posthog-js";

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

/** 브라우저는 같은 주소의 이 경로로 보내고, next.config.ts가 PostHog로 넘긴다(CSP connect-src 'self' 유지). */
export const ANALYTICS_PATH = "/ingest";

/** PostHog 수집 주소와 정적 파일 주소. us.i.posthog.com이면 us-assets.i.posthog.com을 함께 쓴다. */
export function analyticsUpstream(origin = host) {
  return { api: origin, assets: origin.replace(/:\/\/(us|eu)\.i\./, "://$1-assets.i.") };
}

/** 키가 없으면(로컬, 테스트, 키를 넣지 않은 배포) 분석 스크립트를 내려받지도 않는다. */
export const analyticsEnabled = Boolean(key);

/**
 * PostHog 설정. 방문 흐름과 성능만 보면 되므로 사람을 식별하거나 화면을 녹화하지 않는다.
 * 쿠키와 저장소를 쓰지 않아(메모리) 새로 고치면 다른 방문으로 센다.
 */
export const posthogOptions = {
  api_host: ANALYTICS_PATH,
  ui_host: host.replace(".i.posthog.com", ".posthog.com"),
  persistence: "memory",
  person_profiles: "never",
  autocapture: false,
  capture_pageview: "history_change",
  capture_pageleave: false,
  disable_session_recording: true,
  disable_surveys: true,
  advanced_disable_flags: true,
  respect_dnt: true,
  save_referrer: false,
  capture_exceptions: false,
} satisfies Partial<PostHogConfig>;

export const posthogKey = key ?? "";

export interface VitalMetric {
  name: string;
  value: number;
  rating?: string;
  navigationType?: string;
}

/** 측정값을 사람이 읽을 단위로 맞춰 보낸다. CLS는 단위가 없고, 나머지는 밀리초다. */
export function toVitalEvent(metric: VitalMetric, path: string) {
  return {
    metric: metric.name,
    value: metric.name === "CLS" ? Math.round(metric.value * 1000) / 1000 : Math.round(metric.value),
    rating: metric.rating ?? "unknown",
    navigation_type: metric.navigationType ?? "unknown",
    // 주소의 쿼리는 검색어 같은 입력을 담을 수 있어 빼고 경로만 남긴다.
    path: path.split("?")[0] ?? "/",
  };
}

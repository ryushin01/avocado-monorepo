import type { PostHogConfig } from "posthog-js";

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

/** 브라우저는 같은 주소의 이 경로로 보내고, next.config.ts가 PostHog로 넘긴다(CSP connect-src 'self' 유지). */
export const ANALYTICS_PATH = "/ingest";

/** PostHog 수집 주소와 정적 파일 주소. PostHog 클라우드(us, eu)만 정적 파일 주소가 따로 있고, 직접 운영하는 주소는 그대로 쓴다. */
export function analyticsUpstream(origin = host) {
  const cloud = /^https:\/\/(us|eu)\.i\.posthog\.com\/?$/.exec(origin);
  return { api: origin, assets: cloud ? `https://${cloud[1]}-assets.i.posthog.com` : origin };
}

type EventProperties = Record<string, unknown> | undefined;

// $initial_, $session_entry_ 같은 접두사가 붙은 이름도 끝이 같으면 걸린다.
// 캠페인 수집은 꺼 두었고, 이 목록은 SDK가 바뀌어도 새지 않게 한 번 더 막는 장치다.
const QUERY_DERIVED = /(ph_keyword|utm_[a-z_]+|[a-z]*clid|[a-z]*braid|mc_[a-z]+|_kx|irclid|rdt_cid|ttclid)$/i;

function withoutQuery(properties: EventProperties) {
  if (!properties) return properties;
  const cleaned: Record<string, unknown> = { ...properties };
  for (const [name, value] of Object.entries(cleaned)) {
    // 주소의 쿼리에서 뽑아낸 값(검색 엔진 검색어 ph_keyword, utm_term 같은 캠페인 값, gclid 같은 클릭 id)은 통째로 뺀다.
    if (QUERY_DERIVED.test(name)) {
      delete cleaned[name];
      continue;
    }
    // $current_url, $session_entry_url, $referrer처럼 주소를 담는 속성에서 쿼리와 해시를 뺀다.
    if (typeof value === "string" && /(url|referrer)$/i.test(name)) cleaned[name] = value.split(/[?#]/)[0];
  }
  return cleaned;
}

/** 보내기 직전에 모든 이벤트의 주소 속성을 정리한다. 검색어 같은 입력이 쿼리에 실려 나가지 않게 한다. */
export function stripUrlQueries<T extends { properties?: EventProperties; $set?: EventProperties; $set_once?: EventProperties }>(
  event: T | null,
): T | null {
  if (!event) return event;
  return {
    ...event,
    properties: withoutQuery(event.properties),
    ...(event.$set && { $set: withoutQuery(event.$set) }),
    ...(event.$set_once && { $set_once: withoutQuery(event.$set_once) }),
  };
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
  // 주소의 캠페인 값(utm_*, gclid, gbraid, mc_cid 등)을 속성으로 뽑아내지 않습니다.
  save_campaign_params: false,
  mask_personal_data_properties: true,
  capture_exceptions: false,
  before_send: stripUrlQueries,
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

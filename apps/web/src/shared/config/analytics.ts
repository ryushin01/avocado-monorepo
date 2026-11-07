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

// 알려진 캠페인·광고 식별자. 주소가 이벤트에 함께 오지 않아도 이름만으로 뺀다.
const KNOWN_QUERY_PARAMS = /^(ph_keyword|utm_[a-z_]+|[a-z]*clid|[a-z]*braid|gad_[a-z_]+|mc_[a-z]+|_kx|rdt_cid)$/i;
const isUrlProperty = (name: string) => /(url|referrer)$/i.test(name);
// SDK는 쿼리 값을 키, $session_entry_키, $initial_키 같은 이름으로 옮겨 담는다.
// `$browser`처럼 접두사 없이 $로 시작하는 이름은 SDK가 직접 만든 값이라 쿼리와 무관하다.
// 수집에 꼭 필요한 이름은 쿼리 키와 같아도 지우지 않는다.
const REQUIRED = new Set(["token", "distinct_id"]);
function derivedName(name: string): string | null {
  const prefixed = /^\$(session_entry_|initial_)(.+)$/.exec(name);
  if (prefixed) return (prefixed[2] as string).toLowerCase();
  if (name.startsWith("$") || REQUIRED.has(name)) return null;
  return name.toLowerCase();
}

function queryKeysOf(groups: EventProperties[]) {
  const keys = new Set<string>();
  for (const properties of groups) {
    for (const [name, value] of Object.entries(properties ?? {})) {
      if (typeof value !== "string" || !isUrlProperty(name) || !value.includes("?")) continue;
      try {
        for (const key of new URL(value, "https://placeholder.invalid").searchParams.keys()) keys.add(key.toLowerCase());
      } catch {
        // 주소가 아니면 넘어간다.
      }
    }
  }
  return keys;
}

function withoutQuery(properties: EventProperties, queryKeys: Set<string>) {
  if (!properties) return properties;
  const cleaned: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(properties)) {
    const base = derivedName(name);
    // 주소의 쿼리에서 뽑아낸 값(검색어, 캠페인 값, 광고 클릭 id 등)은 통째로 뺀다.
    if (base !== null && (queryKeys.has(base) || KNOWN_QUERY_PARAMS.test(base))) continue;
    // $current_url, $session_entry_url, $referrer처럼 주소를 담는 속성에서는 쿼리와 해시를 뺀다.
    cleaned[name] = typeof value === "string" && isUrlProperty(name) ? value.split(/[?#]/)[0] : value;
  }
  return cleaned;
}

/**
 * 보내기 직전에 모든 이벤트를 정리한다. 검색어 같은 입력이 쿼리나 쿼리에서 뽑힌 속성으로 나가지 않게 한다.
 * 이름 목록만으로 막으면 SDK가 새 이름을 뽑을 때 새므로, 이벤트에 담긴 주소의 쿼리 키를 모아 같은 이름을 모두 뺀다.
 */
export function stripUrlQueries<T extends { properties?: EventProperties; $set?: EventProperties; $set_once?: EventProperties }>(
  event: T | null,
): T | null {
  if (!event) return event;
  const keys = queryKeysOf([event.properties, event.$set, event.$set_once]);
  return {
    ...event,
    properties: withoutQuery(event.properties, keys),
    ...(event.$set && { $set: withoutQuery(event.$set, keys) }),
    ...(event.$set_once && { $set_once: withoutQuery(event.$set_once, keys) }),
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

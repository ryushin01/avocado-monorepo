import type { Breadcrumb, ErrorEvent } from "@sentry/nextjs";

import { redactSecrets } from "@avocado/logger";

/**
 * 세 앱(백오피스, 키오스크, 홍보 사이트)이 함께 쓰는 Sentry 설정. DSN이 없으면(로컬, 테스트) 아무것도 보내지 않는다.
 * SDK 기본값은 쿠키, 헤더, 쿼리 문자열, 사용자 정보까지 모으므로, 오류 내용만 남도록 모두 끈다.
 * service는 앱 이름으로, 한 Sentry 프로젝트에 여러 앱을 보내도 나눠 볼 수 있게 태그로 붙인다.
 */
export function createSentryOptions({ dsn, service }: { dsn: string | undefined; service: string }) {
  return {
    dsn,
    enabled: Boolean(dsn),
    tracesSampleRate: 0,
    initialScope: { tags: { service } },
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      stackFrameVariables: false,
    },
    beforeSend: scrubEvent,
    beforeBreadcrumb: scrubBreadcrumb,
  };
}

export type SentryOptions = ReturnType<typeof createSentryOptions>;

/**
 * 오류 내용이 아닌 것은 지운다.
 * - extra.arguments: 감싼 콜백이 던진 오류에 붙는 그 콜백의 인수(입력 이벤트 등)
 * - extra.__serialized__: Error가 아닌 일반 객체로 거부된 Promise의 필드 값(이메일·토큰 등이 들 수 있음)
 * - 주소의 쿼리 문자열과 # 뒤(검색어, 로그인 토큰 등)
 * - 오류 메시지의 쿼리 값: DB 오류 메시지의 "params: …"에 손님 전화번호가 들 수 있다(서버 로그와 같은 규칙).
 */
export function scrubEvent(event: ErrorEvent) {
  if (event.extra) {
    delete event.extra.arguments;
    delete event.extra.__serialized__;
  }
  if (event.request) {
    if (event.request.url) event.request.url = event.request.url.split(/[?#]/)[0];
    delete event.request.query_string;
    delete event.request.cookies;
    delete event.request.headers;
    delete event.request.data;
  }
  delete event.user;
  if (event.breadcrumbs) event.breadcrumbs = event.breadcrumbs.flatMap((b) => scrubBreadcrumb(b) ?? []);
  if (event.message) event.message = redactSecrets(event.message);
  for (const value of event.exception?.values ?? []) {
    if (value.value) value.value = redactSecrets(value.value);
  }
  return event;
}

/**
 * 오류 앞에 남는 기록(브레드크럼)을 거른다. 서버는 콘솔·요청 기록을 기본으로 남긴다.
 * - 콘솔 기록은 버린다: SDK가 console.error의 원문 인수를 담으므로, 가려서 찍기 전의 DB 오류(손님 전화번호)가 들 수 있다.
 * - 요청 기록의 주소에서 쿼리 문자열과 # 뒤를 뺀다(키오스크의 전화번호 뒷자리 조회 등). 남는 메시지도 가린다.
 */
export function scrubBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb | null {
  if (breadcrumb.category === "console") return null;
  const url = breadcrumb.data?.url;
  if (typeof url === "string") breadcrumb.data = { ...breadcrumb.data, url: url.split(/[?#]/)[0] };
  if (breadcrumb.message) breadcrumb.message = redactSecrets(breadcrumb.message);
  return breadcrumb;
}

/** 방문 기록(세션)과 이동·클릭 기록(브레드크럼)은 오류 수집에 필요하지 않아 브라우저에서 끈다. */
const VISITOR_TRACKING = new Set(["BrowserSession", "Breadcrumbs"]);

export function withoutVisitorTracking<T extends { name: string }>(integrations: T[]): T[] {
  return integrations.filter(({ name }) => !VISITOR_TRACKING.has(name));
}

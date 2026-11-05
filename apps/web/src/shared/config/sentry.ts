const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

/**
 * 브라우저와 서버가 함께 쓰는 Sentry 설정. DSN이 없으면(로컬, 테스트) 아무것도 보내지 않는다.
 * SDK 기본값은 쿠키, 헤더, 쿼리 문자열, 사용자 정보까지 모으므로, 오류 내용만 남도록 모두 끈다.
 */
export const sentryOptions = {
  dsn,
  enabled: Boolean(dsn),
  tracesSampleRate: 0,
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: false,
    httpBodies: [],
    urlQueryParams: false,
    stackFrameVariables: false,
  },
};

/** 방문 기록(세션)과 이동·클릭 기록(브레드크럼)은 오류 수집에 필요하지 않아 브라우저에서 끈다. */
const VISITOR_TRACKING = new Set(["BrowserSession", "Breadcrumbs"]);

export function withoutVisitorTracking<T extends { name: string }>(integrations: T[]): T[] {
  return integrations.filter(({ name }) => !VISITOR_TRACKING.has(name));
}

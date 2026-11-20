import * as Sentry from "@sentry/nextjs";

import { logRequestError, reportErrorsTo } from "@avocado/logger";

import type { SentryOptions } from "./options";

/** 같은 로그 이벤트를 다시 보내기까지 기다리는 시간. 백오피스가 오래 멈추면 키오스크가 1분마다 같은 오류를 남기므로 묶는다. */
const REPEAT_INTERVAL_MS = 10 * 60_000;

/**
 * 서버 오류 모니터링을 켠다. 앱의 instrumentation.ts의 register에서 한 번 부른다. DSN이 없으면 아무것도 보내지 않는다.
 * logError로 남기는 오류(백오피스 연결 실패, 설정 빠짐, 변경 이력 실패 등)도 함께 보내되, 같은 이벤트는 10분에 한 번만 보낸다.
 * 요청 처리 중 오류는 onRequestError(createRequestErrorHandler)가 따로 보낸다.
 */
export function registerServerMonitoring(options: SentryOptions, now: () => number = Date.now) {
  Sentry.init(options);
  if (!options.enabled) return;
  const lastSent = new Map<string, number>();
  reportErrorsTo(({ service, event, error, fields }) => {
    if (event === "request_error") return;
    const key = `${service}:${event}`;
    const last = lastSent.get(key);
    if (last !== undefined && now() - last < REPEAT_INTERVAL_MS) return;
    lastSent.set(key, now());
    Sentry.withScope((scope) => {
      scope.setTag("event", event);
      // fields는 로그와 같아 손님 정보·토큰이 없다(logError 규칙).
      scope.setContext("log", fields);
      if (error) Sentry.captureException(error);
      else Sentry.captureMessage(event, "error");
    });
  });
}

type RequestErrorArgs = Parameters<typeof Sentry.captureRequestError>;

/** instrumentation.ts의 onRequestError. 오류를 로그(한 줄 JSON)로 남기고 Sentry로도 보낸다. */
export function createRequestErrorHandler(service: string) {
  return (error: RequestErrorArgs[0], request: RequestErrorArgs[1], context: RequestErrorArgs[2]) => {
    logRequestError(service, error, request, context);
    Sentry.captureRequestError(error, request, context);
  };
}

import { createRequestErrorHandler, registerServerMonitoring } from "@avocado/monitoring/server";

import { sentryOptions } from "@/shared/lib/monitoring";

export function register() {
  // DSN이 있으면 서버 오류와 logError로 남기는 오류(백오피스 연결 실패, 설정 빠짐)를 Sentry로도 보낸다.
  registerServerMonitoring(sentryOptions);
}

/** 서버에서 잡힌 오류를 로그로 남기고 Sentry로 보낸다. */
export const onRequestError = createRequestErrorHandler("launcher");

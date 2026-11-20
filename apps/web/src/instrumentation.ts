import { createRequestErrorHandler, registerServerMonitoring } from "@avocado/monitoring/server";

import { sentryOptions } from "@/shared/config";

export function register() {
  registerServerMonitoring(sentryOptions);
}

/** 서버에서 잡힌 오류를 로그에 남기고 Sentry로 보낸다. */
export const onRequestError = createRequestErrorHandler("web");

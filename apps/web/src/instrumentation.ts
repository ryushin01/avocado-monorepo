import { logRequestError } from "@avocado/logger";
import * as Sentry from "@sentry/nextjs";
import type { Instrumentation } from "next";

import { sentryOptions } from "@/shared/config/sentry";

export function register() {
  Sentry.init(sentryOptions);
}

/** 서버에서 잡힌 오류를 로그에 남기고 Sentry로 보낸다. */
export const onRequestError: Instrumentation.onRequestError = (error, request, context) => {
  logRequestError("web", error, request, context);
  Sentry.captureRequestError(error, request, context);
};

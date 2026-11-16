import { redactConsoleErrors } from "@avocado/logger";
import { createRequestErrorHandler, registerServerMonitoring } from "@avocado/monitoring/server";

import { sentryOptions } from "@/shared/lib/monitoring";

export function register() {
  // Drizzle 오류 메시지에는 쿼리 값(손님 전화번호 등)이 들어 있어 Next.js 기본 출력에서도 가린다.
  redactConsoleErrors();
  // DSN이 있으면 서버 오류와 logError로 남기는 오류(변경 이력 실패, 키오스크 요청 제한 등)를 Sentry로도 보낸다.
  registerServerMonitoring(sentryOptions);
}

/** 서버에서 잡힌 오류를 로그로 남기고 Sentry로 보낸다. 화면의 오류 번호는 로그의 digest와 같다. */
export const onRequestError = createRequestErrorHandler("admin");

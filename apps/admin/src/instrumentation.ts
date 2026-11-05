import { logRequestError, redactConsoleErrors } from "@avocado/logger";
import type { Instrumentation } from "next";

// Drizzle 오류 메시지에는 쿼리 값(손님 전화번호 등)이 들어 있어 Next.js 기본 출력에서도 가린다.
export function register() {
  redactConsoleErrors();
}

/** 서버에서 잡힌 오류를 남긴다. 외부 모니터링을 붙일 때도 여기서 보낸다. */
export const onRequestError: Instrumentation.onRequestError = (error, request, context) => {
  logRequestError("admin", error, request, context);
};

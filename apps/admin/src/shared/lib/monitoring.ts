import { createMonitoring } from "@avocado/monitoring/client";
import { createSentryOptions } from "@avocado/monitoring/options";

/**
 * 오류 모니터링(Sentry). 브라우저·서버가 함께 쓰고, 개인정보를 모으지 않는 규칙은 @avocado/monitoring에 모았다.
 * NEXT_PUBLIC_SENTRY_DSN이 없으면(로컬, 테스트, DSN을 등록하기 전) 아무것도 보내지 않는다.
 */
export const sentryOptions = createSentryOptions({ dsn: process.env.NEXT_PUBLIC_SENTRY_DSN, service: "admin" });

// 브라우저: DSN이 있을 때만 첫 화면 뒤에 Sentry를 따로 받는다.
export const { initMonitoring, captureException } = createMonitoring(sentryOptions);

import { createSentryOptions } from "@avocado/monitoring/options";

/**
 * 홍보 사이트의 Sentry 설정(브라우저·서버 공통). 개인정보를 모으지 않는 규칙은 @avocado/monitoring에 모았다.
 * NEXT_PUBLIC_SENTRY_DSN이 없으면(로컬, 테스트) 아무것도 보내지 않는다.
 */
export const sentryOptions = createSentryOptions({ dsn: process.env.NEXT_PUBLIC_SENTRY_DSN, service: "web" });

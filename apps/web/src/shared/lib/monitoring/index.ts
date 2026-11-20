import { createMonitoring } from "@avocado/monitoring/client";

import { sentryOptions } from "@/shared/config";

// DSN이 있을 때만 첫 화면 뒤에 Sentry를 따로 받는다(지연 로딩 규칙은 @avocado/monitoring/client).
export const { initMonitoring, captureException } = createMonitoring(sentryOptions);

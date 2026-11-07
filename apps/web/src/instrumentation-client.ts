import * as Sentry from "@sentry/nextjs";

import { sentryOptions, withoutVisitorTracking } from "@/shared/config/sentry";
import { initAnalytics } from "@/shared/lib/analytics";

Sentry.init({ ...sentryOptions, integrations: withoutVisitorTracking });

// 분석은 화면을 그리는 데 필요 없으므로 기다리지 않는다.
void initAnalytics();

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

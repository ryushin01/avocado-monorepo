import * as Sentry from "@sentry/nextjs";

import { sentryOptions, withoutVisitorTracking } from "@/shared/config/sentry";

Sentry.init({ ...sentryOptions, integrations: withoutVisitorTracking });

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

import * as Sentry from "@sentry/nextjs";

import { sentryOptions } from "@/shared/config/sentry";

Sentry.init(sentryOptions);

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

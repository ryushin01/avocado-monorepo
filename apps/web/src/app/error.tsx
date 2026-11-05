"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

import { ErrorNotice } from "@/shared/ui/error-notice";

export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return <ErrorNotice error={error} retry={retry} />;
}

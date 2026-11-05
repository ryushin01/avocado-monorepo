"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

import { PageHeader } from "@/widgets/site-header";
import { ErrorNotice } from "@/shared/ui/error-notice";

export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col lg:grid lg:grid-cols-8">
      <PageHeader title="ERROR" />
      <ErrorNotice error={error} retry={retry} />
    </div>
  );
}

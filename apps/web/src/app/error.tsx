"use client";

import { useEffect } from "react";

import { PageHeader } from "@/widgets/site-header";
import { captureException } from "@/shared/lib/monitoring";
import { ErrorNotice } from "@/shared/ui/error-notice";

export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    captureException(error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col lg:grid lg:grid-cols-8">
      <PageHeader title="ERROR" />
      <ErrorNotice error={error} retry={retry} />
    </div>
  );
}

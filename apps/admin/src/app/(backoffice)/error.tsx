"use client";

import { ErrorNotice } from "@/shared/ui/error-notice";

export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  return <ErrorNotice error={error} retry={retry} insideMain />;
}

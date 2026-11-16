"use client";

import { ErrorNotice } from "@/shared/ui/error-notice";

/** 백오피스 화면 오류. 사이드바를 남긴 채 본문에서 안내한다. */
export function BackofficeError({ error, retry }: { error: unknown; retry: () => void }) {
  return <ErrorNotice error={error} retry={retry} insideMain />;
}

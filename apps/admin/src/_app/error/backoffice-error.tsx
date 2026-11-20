"use client";

import { useEffect } from "react";

import { captureException } from "@/shared/lib/monitoring";
import { ErrorNotice } from "@/shared/ui/error-notice";

/** 백오피스 화면 오류. 사이드바를 남긴 채 본문에서 안내한다. */
export function BackofficeError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    captureException(error);
  }, [error]);

  return <ErrorNotice error={error} retry={retry} insideMain />;
}

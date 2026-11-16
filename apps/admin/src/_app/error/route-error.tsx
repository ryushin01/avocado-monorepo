"use client";

import { useEffect } from "react";

import { captureException } from "@/shared/lib/monitoring";
import { ErrorNotice } from "@/shared/ui/error-notice";

/** 루트 레이아웃 안에서 난 화면 오류 (로그인 등 사이드바가 없는 화면) */
export function RouteError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    captureException(error);
  }, [error]);

  return <ErrorNotice error={error} retry={retry} />;
}

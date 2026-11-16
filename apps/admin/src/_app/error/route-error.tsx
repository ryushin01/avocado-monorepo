"use client";

import { ErrorNotice } from "@/shared/ui/error-notice";

/** 루트 레이아웃 안에서 난 화면 오류 (로그인 등 사이드바가 없는 화면) */
export function RouteError({ error, retry }: { error: unknown; retry: () => void }) {
  return <ErrorNotice error={error} retry={retry} />;
}

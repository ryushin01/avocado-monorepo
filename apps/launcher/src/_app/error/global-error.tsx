"use client";

import { useEffect } from "react";

import { captureException } from "@/shared/lib/monitoring";
import { ErrorNotice } from "@/shared/ui/error-notice";

import "../styles/globals.css";

/** 루트 레이아웃까지 실패했을 때의 화면. 레이아웃을 대신하므로 html·body를 직접 그린다. */
export function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    captureException(error);
  }, [error]);

  return (
    <html lang="ko" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-muted/40">
        <title>보드게임 카페 키오스크</title>
        <ErrorNotice error={error} retry={retry} />
      </body>
    </html>
  );
}

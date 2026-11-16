"use client";

import { useAutoRefresh } from "@avocado/ui/hooks/use-auto-refresh";

/** 화면이 보이는 동안 seconds초마다 서버 데이터를 다시 받는다. 연결이 끊겼던 화면도 다음 갱신 때 돌아온다. */
export function AutoRefresh({ seconds }: { seconds: number }) {
  useAutoRefresh(seconds * 1000);
  return null;
}

"use client";

import { useAutoRefresh } from "@avocado/ui/hooks/use-auto-refresh";
import { useState } from "react";

/** 알릴 항목: 처음 보는 id면 새로 생긴 것으로 본다. */
export type LiveItem = { id: string; label: string };

/** 카운터에 열어 둔 화면이 키오스크의 대기 등록·도착 알림을 새로고침 없이 보여 주도록 다시 받는 간격 */
const REFRESH_MS = 15_000;

/**
 * 예약·대기 화면을 주기적으로 다시 받고, 새 대기와 도착을 화면 낭독기에 알린다.
 * 알림 영역은 처음부터 두고 내용만 바꾼다. 매장·날짜가 바뀌면 부모가 key를 바꿔 처음부터 센다.
 */
export function LiveUpdates({ waiting, arrived }: { waiting: LiveItem[]; arrived: LiveItem[] }) {
  useAutoRefresh(REFRESH_MS);

  const [seen, setSeen] = useState({ waiting, arrived });
  const [message, setMessage] = useState("");
  if (seen.waiting !== waiting || seen.arrived !== arrived) {
    const added = (now: LiveItem[], before: LiveItem[]) =>
      now.filter((item) => !before.some((b) => b.id === item.id)).map((item) => item.label);
    const parts = [
      ...added(waiting, seen.waiting).map((label) => `현장 대기 ${label}님이 등록했습니다.`),
      ...added(arrived, seen.arrived).map((label) => `${label}님이 도착을 알렸습니다.`),
    ];
    setSeen({ waiting, arrived });
    if (parts.length > 0) setMessage(parts.join(" "));
  }

  return (
    <p role="status" className="sr-only" data-testid="live-updates">
      {message}
    </p>
  );
}

"use client";

import { useMinuteClock } from "@/hooks/use-minute-clock";
import { formatMinutes } from "@/lib/plays/format";
import { minutesBetween } from "@/lib/plays/time";

/** 이용 시작부터 지금까지 걸린 시간. 1분마다 저절로 늘어난다. */
export function ElapsedTime({ since, serverNow }: { since: string; serverNow: number }) {
  const now = useMinuteClock(serverNow);
  return <>{formatMinutes(minutesBetween(since, now))}째</>;
}

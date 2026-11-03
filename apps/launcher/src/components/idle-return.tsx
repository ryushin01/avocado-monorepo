"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** 손님이 한동안 화면을 만지지 않으면 처음 화면으로 돌아간다. */
export function IdleReturn({ seconds = 90 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    let timer = setTimeout(() => router.replace("/"), seconds * 1000);
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => router.replace("/"), seconds * 1000);
    };
    const events = ["pointerdown", "keydown", "scroll"] as const;
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [router, seconds]);
  return null;
}

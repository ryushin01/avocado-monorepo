"use client";

import { useEffect } from "react";

/** 화면이 확대돼 있는지 (손가락으로 벌려 키운 상태) */
const isZoomed = () => (window.visualViewport?.scale ?? 1) > 1.01;

/**
 * 손님이 한동안 화면을 만지지 않으면 처음 화면으로 돌아간다.
 * 다음 손님이 앞 손님의 확대 상태·입력을 이어받지 않도록 페이지를 새로 연다. 처음 화면에서는 확대돼 있을 때만 새로 연다.
 */
export function IdleReturn({ seconds = 90 }: { seconds?: number }) {
  useEffect(() => {
    const goHome = () => {
      if (window.location.pathname === "/" && !isZoomed()) return;
      window.location.replace("/");
    };
    let timer = setTimeout(goHome, seconds * 1000);
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(goHome, seconds * 1000);
    };
    const events = ["pointerdown", "keydown", "scroll"] as const;
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [seconds]);
  return null;
}

"use client";

import { useEffect, useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@avocado/ui/components/alert-dialog";

/** 경고를 띄운 뒤 처음 화면으로 돌아가기까지. 연장할 시간을 최소 20초 준다(KWCAG 6.2.1, WCAG 2.2.1). */
const WARNING_SECONDS = 20;

/** 화면이 확대돼 있는지 (손가락으로 벌려 키운 상태) */
const isZoomed = () => (window.visualViewport?.scale ?? 1) > 1.01;

/** 돌아갈 일이 있는지: 처음 화면이 아니거나, 처음 화면이라도 확대된 채 남았을 때 */
const shouldReturn = () => window.location.pathname !== "/" || isZoomed();

/** 화면을 만진 것으로 보는 입력. 경고 창의 '계속 보기'와 화면 낭독기의 누르기(click)도 여기에 든다. */
const ACTIVITY_EVENTS = ["pointerdown", "keydown", "scroll", "click"] as const;

/**
 * 손님이 seconds초 동안 화면을 만지지 않으면 "곧 처음 화면으로 돌아갑니다" 창을 띄우고, 20초 안에 아무것도 누르지 않으면
 * 처음 화면으로 돌아간다. 화면을 만지거나 '계속 보기'를 누르면 처음부터 다시 센다(몇 번이든 연장할 수 있다).
 * 다음 손님이 앞 손님의 확대 상태·입력을 이어받지 않도록 페이지를 새로 연다.
 */
export function IdleReturn({ seconds = 90 }: { seconds?: number }) {
  // 경고 창이 떠 있으면 남은 초, 아니면 null
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    let countdown: ReturnType<typeof setInterval> | undefined;
    const stopCountdown = () => {
      clearInterval(countdown);
      countdown = undefined;
    };
    const warn = () => {
      if (!shouldReturn()) return;
      // 남은 시간은 마감 시각으로 센다. 타이머가 늦게 불려도(절전 등) 마감이 지나면 바로 돌아간다.
      const deadline = Date.now() + WARNING_SECONDS * 1000;
      setRemaining(WARNING_SECONDS);
      countdown = setInterval(() => {
        const left = Math.ceil((deadline - Date.now()) / 1000);
        if (left > 0) return setRemaining(left);
        stopCountdown();
        window.location.replace("/");
      }, 1000);
    };
    let idleTimer = setTimeout(warn, seconds * 1000);
    const reset = () => {
      clearTimeout(idleTimer);
      stopCountdown();
      setRemaining(null);
      idleTimer = setTimeout(warn, seconds * 1000);
    };
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    return () => {
      clearTimeout(idleTimer);
      stopCountdown();
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [seconds]);

  return (
    <AlertDialog open={remaining !== null}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>곧 처음 화면으로 돌아갑니다</AlertDialogTitle>
          <AlertDialogDescription>
            {remaining}초 뒤 처음 화면으로 돌아갑니다. 계속 보시려면 아래 버튼을 눌러주세요.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          {/* 누르면 창 밖의 입력 감지(click)가 시간을 처음부터 다시 센다. */}
          <AlertDialogAction className="h-12 px-6 text-base">계속 보기</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

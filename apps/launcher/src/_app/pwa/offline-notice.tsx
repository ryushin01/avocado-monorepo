"use client";

import { WifiOff } from "lucide-react";
import { useOffline } from "next/offline";

import { cn } from "@avocado/ui/lib/utils";

/**
 * 태블릿의 인터넷이 끊기면 화면 맨 위에 알린다. 그동안 누른 화면 이동·예약 확인·대기 등록은
 * Next.js(experimental.useOffline)가 미뤄 두었다가 다시 연결되면 이어서 보낸다.
 * 화면 낭독기가 읽도록 알림 영역은 처음부터 두고 내용만 바꾼다.
 */
export function OfflineNotice() {
  const offline = useOffline();
  return (
    <div
      role="alert"
      className={cn(
        offline
          ? "sticky top-0 z-50 flex items-start gap-3 border-b border-destructive/40 bg-background p-4 text-destructive shadow-sm"
          : "sr-only",
      )}
    >
      {offline && (
        <>
          <WifiOff aria-hidden className="mt-0.5 size-6 shrink-0" />
          <div>
            <p className="text-base font-medium">인터넷 연결이 끊겼습니다</p>
            <p className="text-sm">
              다시 연결되면 하던 일을 이어서 진행합니다. 계속되면 직원에게 알려주세요.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

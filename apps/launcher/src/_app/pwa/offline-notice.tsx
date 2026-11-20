"use client";

import { WifiOff } from "lucide-react";
import { useOffline } from "next/offline";

import { Alert, AlertDescription, AlertTitle } from "@avocado/ui/components/alert";

/**
 * 태블릿의 인터넷이 끊기면 화면 맨 위에 알린다. 그동안 누른 화면 이동·예약 확인·대기 등록은
 * Next.js(experimental.useOffline)가 미뤄 두었다가 다시 연결되면 이어서 보낸다(보내는 동안 대기 등록의 '뒤로'는 막힘).
 * 화면 낭독기가 읽도록 알림 영역(Alert, role="alert")은 처음부터 두고 내용만 바꾼다.
 */
export function OfflineNotice() {
  const offline = useOffline();
  return (
    <Alert
      variant="destructive"
      className={
        offline ? "sticky top-0 z-50 rounded-none border-x-0 border-t-0 p-4 shadow-sm *:[svg]:size-6" : "sr-only"
      }
    >
      {offline && (
        <>
          <WifiOff aria-hidden />
          <AlertTitle className="text-base">인터넷 연결이 끊겼습니다</AlertTitle>
          <AlertDescription>다시 연결되면 하던 일을 이어서 진행합니다. 계속되면 직원에게 알려주세요.</AlertDescription>
        </>
      )}
    </Alert>
  );
}

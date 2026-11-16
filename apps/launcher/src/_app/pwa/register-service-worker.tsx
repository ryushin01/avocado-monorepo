"use client";

import { useEffect } from "react";

/**
 * 키오스크 서비스 워커(public/sw.js)를 등록한다. 인터넷이 끊긴 채 페이지를 새로 열 때 브라우저 오류 화면 대신
 * 안내 화면(public/offline.html)을 보여 준다. 개발 서버에서는 화면이 캐시에 묶이지 않게 등록하지 않는다.
 */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error: unknown) => {
      // 등록하지 못해도 키오스크는 그대로 돈다. 원인은 개발자 도구에 남긴다.
      console.warn("오프라인 안내(서비스 워커)를 등록하지 못했습니다.", error);
    });
  }, []);
  return null;
}

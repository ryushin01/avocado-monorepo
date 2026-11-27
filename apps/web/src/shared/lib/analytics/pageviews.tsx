"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { track } from "./analytics";

/**
 * 화면 안에서 주소만 바뀌는 이동(App Router의 링크)도 페이지 보기로 센다. 화면에는 아무것도 그리지 않는다.
 * 분석 SDK는 작은 slim 빌드라 주소 바뀜을 스스로 보지 않으므로 여기서 보낸다. 첫 화면은 SDK가 보낸다.
 */
export function Pageviews() {
  const pathname = usePathname();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    track("$pageview", {});
  }, [pathname]);
  return null;
}

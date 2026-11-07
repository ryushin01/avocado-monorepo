"use client";

import { useReportWebVitals } from "next/web-vitals";

import { toVitalEvent } from "@/shared/config/analytics";

import { track } from "./analytics";

/** 실제 방문자의 LCP, INP, CLS 등을 모은다. 화면에는 아무것도 그리지 않는다. */
export function WebVitals() {
  // 측정값은 화면을 떠날 때 보고되기도 하므로, 그 시점의 경로를 읽는다.
  useReportWebVitals((metric) => track("web_vitals", toVitalEvent(metric, window.location.pathname)));
  return null;
}

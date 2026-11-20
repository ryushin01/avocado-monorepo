import type { ReactNode } from "react";

import { DemoNotice } from "@/shared/ui/demo-notice";

/** 모든 화면 위에 공개 데모 안내를 붙인다(데모가 아니면 화면을 그대로 그린다). */
export function RootTemplate({ children }: { children: ReactNode }) {
  return (
    <>
      <DemoNotice />
      {children}
    </>
  );
}

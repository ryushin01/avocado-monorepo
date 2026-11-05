"use client";

import { ErrorNotice } from "@/shared/ui/error-notice";
import { IdleReturn } from "@/shared/ui/idle-return";

export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <>
      {/* 손님이 그대로 두고 떠나도 키오스크가 오류 화면에 머물지 않게 한다. */}
      <IdleReturn seconds={30} />
      <ErrorNotice error={error} retry={retry} />
    </>
  );
}

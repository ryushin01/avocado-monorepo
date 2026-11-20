import { CircleAlert } from "lucide-react";

import { Alert, AlertDescription } from "@avocado/ui/components/alert";

/**
 * 폼 전체의 오류(권한·다른 직원이 먼저 바꿈 등). 화면 낭독기가 바뀐 내용을 읽도록 알림 영역(Alert, role="alert")은
 * 처음부터 두고, 오류가 없으면 자리를 차지하지 않게 숨긴다.
 */
export function FormErrorAlert({ message }: { message?: string }) {
  return (
    <Alert variant="destructive" className={message ? undefined : "sr-only"}>
      {message && (
        <>
          <CircleAlert />
          <AlertDescription>{message}</AlertDescription>
        </>
      )}
    </Alert>
  );
}

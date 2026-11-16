import { cn } from "@avocado/ui/lib/utils";

/**
 * 손님에게 보여 주는 오류 알림. 화면 낭독기가 바뀐 내용을 읽도록 영역은 처음부터 두고 내용만 바꾼다.
 * 비어 있으면 화면에서 자리를 차지하지 않는다.
 */
export function AlertMessage({ message, className }: { message?: string; className?: string }) {
  return (
    <p
      role="alert"
      className={cn(
        message ? "rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-destructive" : "sr-only",
        className,
      )}
    >
      {message}
    </p>
  );
}

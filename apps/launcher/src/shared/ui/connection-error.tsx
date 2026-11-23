import { WifiOff } from "lucide-react";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@avocado/ui/components/empty";

/** 백오피스에 연결할 수 없거나 매장 설정이 잘못됐을 때 손님에게 보여주는 안내 */
export function ConnectionError({ reason }: { reason: "not-found" | "unreachable" | "rejected" }) {
  return (
    <Empty className="max-w-xl rounded-[10px] border border-solid border-input p-10">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <WifiOff />
        </EmptyMedia>
        <EmptyTitle className="text-3xl font-normal tracking-[-0.02em]">
          {reason === "not-found" ? "매장 정보를 찾을 수 없습니다" : "매장 시스템에 연결할 수 없습니다"}
        </EmptyTitle>
        <EmptyDescription className="text-base">잠시 후 다시 시도하시거나 직원에게 문의해주세요.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

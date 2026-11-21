import { CloudOff } from "lucide-react";

/**
 * 백오피스에 닿지 않아 함께 배포한 스냅숏으로 대신 보여 줄 때의 안내.
 * 화면 낭독기도 알 수 있게 role="status"로 둔다. 노란 바탕 위 amber-950 글자는 대비 4.5:1을 넘는다.
 */
export function OfflineDataNotice() {
  return (
    <p
      role="status"
      className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-4 text-base text-amber-950"
    >
      <CloudOff aria-hidden className="mt-0.5 size-5 shrink-0" />
      <span>
        <strong className="font-semibold">오프라인 데이터로 표시 중</strong> · 매장 시스템에 연결할 수 없어 저장해 둔
        게임 목록을 보여 드립니다. 이용 가능 여부는 직원에게 문의해 주세요.
      </span>
    </p>
  );
}

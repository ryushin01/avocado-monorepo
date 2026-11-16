import type { ReactNode } from "react";

/**
 * 차트와 같은 데이터의 표. 평소에는 화면에 보이지 않고(화면 낭독기는 읽음), Tab으로 초점을 받으면 차트 위에 나타난다.
 * 차트는 화면 낭독기에서 숨기고(aria-hidden) 초점도 받지 않으므로(accessibilityLayer={false}), 툴팁에만 있는 값
 * (박스 수, 잘린 게임 이름, 일별 횟수)을 마우스 없이 보는 사용자는 이 표로 본다(KWCAG 6.1.1).
 * 본문 바로가기 링크처럼 초점을 받을 때만 보여, 마우스로 보는 화면은 그대로다. 감싸는 요소는 relative여야 한다.
 */
export function ChartDataTable({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      role="region"
      aria-label={label}
      tabIndex={0}
      className="sr-only focus:not-sr-only focus:absolute focus:inset-0 focus:z-10 focus:overflow-auto focus:rounded-lg focus:bg-card focus:p-3 focus:text-sm focus:shadow-md focus:outline-none focus:ring-3 focus:ring-ring/50 [&_caption]:mb-2 [&_caption]:text-left [&_caption]:font-medium [&_table]:w-full [&_td]:px-2 [&_td]:py-1 [&_td]:tabular-nums [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_th]:font-medium"
    >
      {children}
    </div>
  );
}

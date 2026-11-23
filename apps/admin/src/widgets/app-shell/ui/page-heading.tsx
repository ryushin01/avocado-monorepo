import type { ReactNode } from "react";

import { NAV_ICONS } from "../model/nav-icons";
import type { NavIcon } from "../model/navigation";

/**
 * 화면 제목. 레퍼런스의 첫 화면 제목처럼 검은 판 라벨(고정폭 대문자) 한 줄 아래에 크고 굵은 제목을 둔다.
 * 라벨은 꾸밈이라 화면 낭독기에서 숨기고, h1의 이름은 화면 이름 그대로다.
 */
export function PageHeading({
  icon,
  title,
  description,
  actions,
}: {
  icon: NavIcon;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  const Icon = NAV_ICONS[icon];
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 pt-2 pb-2">
      <div className="flex min-w-0 flex-col gap-3">
        <p lang="en" aria-hidden className="bo-eyebrow flex flex-wrap items-center gap-4">
          <span className="bo-plate gap-2">
            <Icon className="size-4" />
            {icon}
          </span>
          <span>avocado backoffice</span>
        </p>
        <h1 className="text-[clamp(2rem,1.2rem+2.4vw,3.5rem)] leading-[1.1] font-bold tracking-[-0.03em]">
          {title}
        </h1>
        {description && (
          <p className="max-w-prose text-base leading-6 text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

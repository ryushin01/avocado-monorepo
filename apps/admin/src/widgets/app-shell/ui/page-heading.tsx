import type { ReactNode } from "react";

import { NAV_ICONS } from "../model/nav-icons";
import type { NavIcon } from "../model/navigation";

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
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Icon className="size-6 text-muted-foreground" />
          {title}
        </h1>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions}
    </div>
  );
}

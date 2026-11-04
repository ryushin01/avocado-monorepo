import {
  Boxes,
  ChartLine,
  Dices,
  LayoutDashboard,
  Store,
  Timer,
  Users,
  type LucideIcon,
} from "lucide-react";

import type { NavIcon } from "@/lib/navigation";

export const NAV_ICONS: Record<NavIcon, LucideIcon> = {
  dashboard: LayoutDashboard,
  stats: ChartLine,
  games: Dices,
  inventory: Boxes,
  plays: Timer,
  cafes: Store,
  staff: Users,
};

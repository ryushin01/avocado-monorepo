import { hasRole, type Role, type User } from "@/lib/auth/roles";

export type NavIcon = "dashboard" | "cafes" | "games" | "inventory" | "plays" | "staff";

export type NavItem = {
  title: string;
  href: string;
  icon: NavIcon;
  roles: readonly Role[];
};

export const NAV_ITEMS: readonly NavItem[] = [
  { title: "대시보드", href: "/", icon: "dashboard", roles: ["admin", "staff"] },
  { title: "보드게임", href: "/games", icon: "games", roles: ["admin", "staff"] },
  {
    title: "재고 관리",
    href: "/inventory",
    icon: "inventory",
    roles: ["admin", "staff"],
  },
  { title: "이용 기록", href: "/plays", icon: "plays", roles: ["admin", "staff"] },
  { title: "매장 관리", href: "/cafes", icon: "cafes", roles: ["admin"] },
  { title: "직원 관리", href: "/staff", icon: "staff", roles: ["admin"] },
];

export function getNavItemsFor(user: Pick<User, "role">) {
  return NAV_ITEMS.filter((item) => hasRole(user, item.roles));
}

export function findNavItem(pathname: string) {
  return NAV_ITEMS.find((item) =>
    item.href === "/" ? pathname === "/" : pathname.startsWith(item.href),
  );
}

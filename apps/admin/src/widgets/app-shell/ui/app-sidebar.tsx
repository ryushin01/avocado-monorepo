"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { NAV_ICONS } from "../model/nav-icons";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@avocado/ui/components/sidebar";
import { Skeleton } from "@avocado/ui/components/skeleton";
import { findNavItem, type NavItem } from "../model/navigation";

/**
 * 사이드바 틀. 사용자에 따라 달라지는 메뉴·계정 영역은 서버에서 Suspense로 감싸 슬롯으로 넣는다.
 *
 * 틀 자체를 Suspense 안에 두면, 모바일에서 바깥 레이아웃이 먼저 하이드레이션되며
 * useIsMobile이 true로 바뀐 뒤에 사이드바가 하이드레이션되어(데스크톱 div ↔ 모바일 Sheet)
 * 서버 HTML과 어긋난다. 그래서 틀은 Suspense 밖에 둔다.
 */
export function AppSidebar({ nav, footer }: { nav: ReactNode; footer: ReactNode }) {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/" />}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-[#f3f7ea]">
                <img src="/brand/logo.png" alt="" width={24} height={24} />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">보드게임 카페</span>
                <span className="truncate text-xs text-muted-foreground">
                  백오피스
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>메뉴</SidebarGroupLabel>
          <SidebarGroupContent>{nav}</SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>{footer}</SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

/** 사용자 역할에 맞는 메뉴 */
export function SidebarNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const active = findNavItem(pathname);

  return (
    <SidebarMenu>
      {items.map((item) => {
        const Icon = NAV_ICONS[item.icon];
        return (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton
              isActive={active?.href === item.href}
              tooltip={item.title}
              render={<Link href={item.href} />}
            >
              <Icon />
              <span>{item.title}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}

export function SidebarNavSkeleton() {
  // shadcn SidebarMenuSkeleton은 너비를 Math.random()으로 정해 정적 프리렌더를
  // 막으므로, 고정 너비로 직접 그린다.
  return (
    <SidebarMenu>
      {["70%", "55%", "80%", "60%"].map((width) => (
        <SidebarMenuItem key={width}>
          <div className="flex h-8 items-center gap-2 px-2">
            <Skeleton className="size-4 rounded-md" />
            <Skeleton className="h-4" style={{ width }} />
          </div>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}

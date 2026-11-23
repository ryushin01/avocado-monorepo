"use client";

import Image from "next/image";
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
      {/* 사이드바의 모든 내용(브랜드·메뉴·계정·너비 조절)을 랜드마크 안에 둔다. 레이아웃은 그대로 세로 흐름이다. */}
      <nav aria-label="백오피스 메뉴" className="flex min-h-0 flex-1 flex-col">
        <SidebarHeader className="px-3 pt-5 pb-4">
          <SidebarMenu>
            <SidebarMenuItem>
              {/* 레퍼런스의 워드마크: 테두리 상자 안의 로고와 큰 대문자 이름 */}
              <SidebarMenuButton
                size="lg"
                render={<Link href="/" />}
                className="h-auto gap-3 p-0 hover:bg-transparent active:bg-transparent group-data-[collapsible=icon]:size-8!"
              >
                <span className="flex size-10 shrink-0 items-center justify-center border border-foreground bg-background group-data-[collapsible=icon]:size-8">
                  <Image src="/brand/logo.png" alt="" width={26} height={26} unoptimized />
                </span>
                <span className="grid flex-1 text-left leading-none">
                  <span lang="en" className="truncate text-[1.375rem] font-semibold tracking-tight uppercase">
                    Avocado
                  </span>
                  <span className="mt-1 truncate font-mono text-xs text-muted-foreground">
                    보드게임 카페 백오피스
                  </span>
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup className="px-3">
            <SidebarGroupLabel className="h-6 px-0 font-mono text-xs tracking-[0.02em] text-muted-foreground">
              / 메뉴
            </SidebarGroupLabel>
            <SidebarGroupContent>{nav}</SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="px-3 pb-4">{footer}</SidebarFooter>
        <SidebarRail />
      </nav>
    </Sidebar>
  );
}

/** 사용자 역할에 맞는 메뉴 */
export function SidebarNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const active = findNavItem(pathname);

  return (
    <SidebarMenu className="gap-2">
      {items.map((item) => {
        const Icon = NAV_ICONS[item.icon];
        return (
          <SidebarMenuItem key={item.href}>
            {/* 레퍼런스의 경로 칩: 잉크 칸(아이콘) + 테두리 라벨. 접으면 아이콘 칸만 남는다. */}
            <SidebarMenuButton
              isActive={active?.href === item.href}
              tooltip={item.title}
              render={<Link href={item.href} />}
              className="h-8 p-0 hover:bg-transparent hover:text-sidebar-foreground active:bg-transparent data-active:bg-transparent data-active:font-normal group-data-[collapsible=icon]:p-0!"
            >
              <span className="bo-chip max-w-full">
                <span className="bo-chip__sign">
                  <Icon aria-hidden />
                </span>
                <span className="bo-chip__label">{item.title}</span>
              </span>
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
          <div className="flex h-8 items-center gap-0">
            <Skeleton className="size-8" />
            <Skeleton className="h-4" style={{ width }} />
          </div>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}

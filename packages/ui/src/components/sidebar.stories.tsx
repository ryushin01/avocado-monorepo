import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { CalendarClock, Dices, LayoutDashboard, Package } from "lucide-react";
import Link from "next/link";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "./sidebar";
import { TooltipProvider } from "./tooltip";

const NAV = [
  { href: "/", label: "대시보드", icon: LayoutDashboard, active: true },
  { href: "/games", label: "보드게임", icon: Dices },
  { href: "/inventory", label: "재고 관리", icon: Package },
  { href: "/reservations", label: "예약·대기", icon: CalendarClock },
];

const meta = {
  title: "부품/Sidebar",
  component: Sidebar,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Sidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 백오피스 앱 셸. 지금 화면의 메뉴는 aria-current로 알리고, 접은 상태는 다음에 열 때도 유지한다. */
export const AppShell: Story = {
  render: () => (
    <TooltipProvider>
      <SidebarProvider>
        <Sidebar>
          <SidebarHeader>
            <span lang="en" className="px-2 text-lg font-bold tracking-widest">
              avocado
            </span>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>매장 운영</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {NAV.map(({ href, label, icon: Icon, active }) => (
                    <SidebarMenuItem key={href}>
                      <SidebarMenuButton
                        isActive={active}
                        render={<Link href={href} aria-current={active ? "page" : undefined} />}
                      >
                        <Icon />
                        {label}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
        <SidebarInset>
          <header className="flex h-12 items-center gap-2 border-b px-4">
            <SidebarTrigger />
            <span className="font-medium">대시보드</span>
          </header>
          <div className="p-4 text-sm">본문</div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  ),
};

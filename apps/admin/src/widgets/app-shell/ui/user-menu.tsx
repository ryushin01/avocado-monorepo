"use client";

import { ChevronsUpDown, KeyRound, LogOut } from "lucide-react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useTransition } from "react";

import { Avatar, AvatarFallback } from "@avocado/ui/components/avatar";
import { Badge } from "@avocado/ui/components/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@avocado/ui/components/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@avocado/ui/components/sidebar";

import { ROLE_LABELS, type User } from "@/entities/user";

export function UserMenu({ user, cafeName }: { user: User; cafeName?: string }) {
  const [pending, startTransition] = useTransition();
  const logout = () => startTransition(() => signOut({ callbackUrl: "/login" }));

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                disabled={pending}
                className="border border-foreground bg-background hover:bg-foreground hover:text-background data-open:bg-foreground data-open:text-background group-data-[collapsible=icon]:border-0"
              />
            }
          >
            {/* 접근 이름은 보이는 이름·역할에 '계정 메뉴'를 덧붙인다(KWCAG 6.5.3). 첫 글자 아바타는 꾸밈이다. */}
            <Avatar className="size-8 rounded-none after:hidden" aria-hidden>
              <AvatarFallback className="rounded-none bg-foreground text-background">{user.name.slice(0, 1)}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{user.name}</span>
              <span className="truncate font-mono text-xs opacity-80">
                {ROLE_LABELS[user.role]}
                {cafeName && ` · ${cafeName}`}
              </span>
            </div>
            <span className="sr-only">계정 메뉴</span>
            <ChevronsUpDown className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" className="min-w-60">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="flex flex-col gap-1">
                <span className="flex items-center gap-2">
                  {user.name}
                  <Badge variant="secondary">{ROLE_LABELS[user.role]}</Badge>
                </span>
                <span className="text-xs font-normal text-muted-foreground">{user.email}</span>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href="/password" />}>
              <KeyRound />
              비밀번호 변경
            </DropdownMenuItem>
            <DropdownMenuItem onClick={logout}>
              <LogOut />
              로그아웃
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

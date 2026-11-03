"use client";

import { ChevronsUpDown, FlaskConical, LogOut } from "lucide-react";
import { useTransition } from "react";

import { switchMockUserAction } from "@/app/(backoffice)/mock-auth-actions";
import { Avatar, AvatarFallback } from "@avocado/ui/components/avatar";
import { Badge } from "@avocado/ui/components/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@avocado/ui/components/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@avocado/ui/components/sidebar";
import { ROLE_LABELS, type User } from "@/lib/auth/roles";

export function UserMenu({
  user,
  cafeName,
  accounts,
}: {
  user: User;
  cafeName?: string;
  /** 계정 전환(개발용)에 보여줄 재직 중인 직원 */
  accounts: Pick<User, "id" | "name" | "role">[];
}) {
  const [pending, startTransition] = useTransition();

  const switchUser = (id: unknown) => {
    if (typeof id !== "string" || id === user.id) return;
    startTransition(() => switchMockUserAction(id));
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                aria-label={`${user.name} 계정 메뉴`}
                disabled={pending}
              />
            }
          >
            <Avatar className="size-8 rounded-lg">
              <AvatarFallback className="rounded-lg">
                {user.name.slice(0, 1)}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{user.name}</span>
              <span className="truncate text-xs text-muted-foreground">
                {ROLE_LABELS[user.role]}
                {cafeName && ` · ${cafeName}`}
              </span>
            </div>
            <ChevronsUpDown className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" className="min-w-60">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="flex items-center gap-2">
                {user.name}
                <Badge variant="secondary">{ROLE_LABELS[user.role]}</Badge>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            {/* TODO: 인증 연동 후 제거한다. */}
            <DropdownMenuGroup>
              <DropdownMenuLabel className="flex items-center gap-1.5">
                <FlaskConical className="size-3.5" />
                계정 전환 (개발용)
              </DropdownMenuLabel>
              <DropdownMenuRadioGroup value={user.id} onValueChange={switchUser}>
                {accounts.map((u) => (
                  <DropdownMenuRadioItem key={u.id} value={u.id} closeOnClick>
                    {u.name} ({ROLE_LABELS[u.role]})
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            {/* TODO: 인증 연동 후 로그아웃 액션 연결 */}
            <DropdownMenuItem disabled>
              <LogOut />
              로그아웃
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

import { Suspense } from "react";

import {
  AppSidebar,
  SidebarNav,
  SidebarNavSkeleton,
  PageHeader,
  UserMenu,
  getNavItemsFor,
} from "@/widgets/app-shell";
import { SidebarInset, SidebarProvider } from "@avocado/ui/components/sidebar";
import { TooltipProvider } from "@avocado/ui/components/tooltip";
import { getCurrentUser } from "@/server/auth/current-user";
import { listCafes } from "@/server/cafes/data";

export default function BackofficeLayout({ children }: LayoutProps<"/">) {
  return (
    <TooltipProvider>
      <SidebarProvider>
        {/* 사용자(쿠키)를 읽는 부분만 Suspense로 감싸 나머지 화면을 막지 않는다. */}
        <AppSidebar
          nav={
            <Suspense fallback={<SidebarNavSkeleton />}>
              <UserNav />
            </Suspense>
          }
          footer={
            <Suspense fallback={null}>
              <UserFooter />
            </Suspense>
          }
        />
        <SidebarInset>
          <PageHeader />
          <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}

async function UserNav() {
  const user = await getCurrentUser();
  return <SidebarNav items={[...getNavItemsFor(user)]} />;
}

async function UserFooter() {
  const [user, cafes] = await Promise.all([getCurrentUser(), listCafes()]);
  const cafeName = cafes.find((c) => c.id === user.cafeId)?.name;
  return <UserMenu user={user} cafeName={cafeName} />;
}

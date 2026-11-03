"use client";

import { usePathname } from "next/navigation";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@avocado/ui/components/breadcrumb";
import { Separator } from "@avocado/ui/components/separator";
import { SidebarTrigger } from "@avocado/ui/components/sidebar";
import { NAV_ICONS } from "@/components/layout/nav-icons";
import { findNavItem } from "@/lib/navigation";

export function PageHeader() {
  const pathname = usePathname();
  const current = findNavItem(pathname);
  const Icon = current ? NAV_ICONS[current.icon] : null;

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage className="flex items-center gap-1.5">
              {Icon && <Icon className="size-4" />}
              {current?.title ?? ""}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </header>
  );
}

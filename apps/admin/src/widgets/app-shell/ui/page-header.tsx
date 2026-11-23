"use client";

import { usePathname } from "next/navigation";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@avocado/ui/components/breadcrumb";
import { SidebarTrigger } from "@avocado/ui/components/sidebar";
import { NAV_ICONS } from "../model/nav-icons";
import { findNavItem } from "../model/navigation";

/** 화면 위 머리글. 레퍼런스의 주소 칩(`www kovalseo.com`)처럼 지금 위치를 고정폭 칩으로 보인다. */
export function PageHeader() {
  const pathname = usePathname();
  const current = findNavItem(pathname);
  const Icon = current ? NAV_ICONS[current.icon] : null;

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border bg-background px-4 md:px-6">
      <SidebarTrigger className="size-8 border border-foreground hover:bg-foreground hover:text-background" />
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage className="bo-chip" data-current="">
              <span className="bo-chip__sign">
                {Icon ? <Icon className="size-4" aria-hidden /> : "/"}
              </span>
              <span className="bo-chip__label">{current?.title ?? ""}</span>
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <p
        lang="en"
        aria-hidden
        className="ml-auto hidden font-mono text-xs tracking-[0.02em] text-muted-foreground sm:block"
      >
        avocado / backoffice{current ? ` / ${current.icon}` : ""}
      </p>
    </header>
  );
}

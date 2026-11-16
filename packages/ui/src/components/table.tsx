"use client"

import * as React from "react"
import { cn } from "cn"

/**
 * label: 표 이름. 표가 가로로 넘쳐 스크롤해야 할 때는 그 영역이 초점을 받아 키보드(화살표)로 스크롤할 수 있게 하고,
 * 영역 이름으로도 쓴다(KWCAG 6.1.1). 같은 화면에 표가 여럿이면 이름이 겹치지 않게 준다.
 * (shadcn 원본에서 고친 곳: docs/conventions.md)
 */
function Table({ className, label, ...props }: React.ComponentProps<"table"> & { label?: string }) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [scrollable, setScrollable] = React.useState(false)

  React.useEffect(() => {
    const container = containerRef.current
    if (!container) return
    // 관찰을 시작할 때 한 번, 그 뒤로 크기가 바뀔 때마다 넘치는지 다시 본다.
    const observer = new ResizeObserver(() =>
      setScrollable(container.scrollWidth > container.clientWidth + 1)
    )
    observer.observe(container)
    if (container.firstElementChild) observer.observe(container.firstElementChild)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={containerRef}
      data-slot="table-container"
      className="relative w-full overflow-x-auto rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      {...(scrollable
        ? { role: "region", tabIndex: 0, "aria-label": `${label ?? "표"} (좌우로 스크롤)` }
        : {})}
    >
      <table
        data-slot="table"
        aria-label={label}
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:border-b", className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted",
        className
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-10 px-2 text-left align-middle font-medium whitespace-nowrap text-foreground [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}

import { FileQuestion, House } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@avocado/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@avocado/ui/components/empty";

import { IdleReturn } from "@/shared/ui/idle-return";

export default function NotFound() {
  return (
    <main id="main" tabIndex={-1} className="flex flex-1 items-center justify-center p-6">
      <IdleReturn seconds={30} />
      <Empty className="border bg-background">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FileQuestion />
          </EmptyMedia>
          <EmptyTitle>화면을 찾을 수 없습니다</EmptyTitle>
          <EmptyDescription>처음 화면에서 다시 골라주세요.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Link href="/" className={buttonVariants({ className: "h-16 px-6 text-base" })}>
            <House />
            처음 화면으로
          </Link>
        </EmptyContent>
      </Empty>
    </main>
  );
}

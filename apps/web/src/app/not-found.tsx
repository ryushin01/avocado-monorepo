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

export default function NotFound() {
  return (
    <main id="main" tabIndex={-1} className="flex flex-1 items-center justify-center p-6 outline-none">
      <Empty className="border bg-background">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FileQuestion />
          </EmptyMedia>
          <EmptyTitle>페이지를 찾을 수 없습니다</EmptyTitle>
          <EmptyDescription>주소가 바뀌었거나 없는 페이지입니다.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Link href="/" className={buttonVariants()}>
            <House />
            홈으로
          </Link>
        </EmptyContent>
      </Empty>
    </main>
  );
}

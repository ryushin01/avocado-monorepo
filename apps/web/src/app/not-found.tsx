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

import { PageHeader } from "@/widgets/site-header";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col lg:grid lg:grid-cols-8">
      <PageHeader title="NOT FOUND" />
  <main id="main" tabIndex={-1} className="flex min-w-0 flex-1 scroll-mt-14 items-center justify-center p-6 lg:col-span-6 lg:scroll-mt-0">
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
    </div>
  );
}

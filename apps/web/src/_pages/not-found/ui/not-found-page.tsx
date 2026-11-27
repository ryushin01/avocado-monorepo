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

export function NotFoundPage() {
  return (
    <div className="flex flex-1 flex-col lg:grid lg:grid-cols-8">
      <PageHeader title="NOT FOUND" />
      <main id="main" tabIndex={-1} className="flex min-w-0 flex-1 scroll-mt-14 items-center justify-center p-6 lg:col-span-6 lg:scroll-mt-0">
        <Empty className="border bg-background">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileQuestion />
            </EmptyMedia>
            {/* 화면 낭독기가 제목으로 바로 알 수 있게 안내 문구를 이 화면의 제목(h1)으로 둔다. */}
            <EmptyTitle>
              <h1>페이지를 찾을 수 없습니다</h1>
            </EmptyTitle>
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

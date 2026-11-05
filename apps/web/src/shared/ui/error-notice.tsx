"use client";

import { House, RotateCw, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import { Button, buttonVariants } from "@avocado/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@avocado/ui/components/empty";

export function ErrorNotice({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main id="main" tabIndex={-1} className="flex min-w-0 flex-1 scroll-mt-14 items-center justify-center p-6 lg:col-span-6 lg:scroll-mt-0">
      <Empty className="border bg-background">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <TriangleAlert />
          </EmptyMedia>
          <EmptyTitle>페이지를 불러오지 못했습니다</EmptyTitle>
          <EmptyDescription>잠시 후 다시 시도해주세요.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="flex-row justify-center">
          <Button onClick={retry}>
            <RotateCw />
            다시 시도
          </Button>
          <Link href="/" className={buttonVariants({ variant: "outline" })}>
            <House />
            홈으로
          </Link>
        </EmptyContent>
      </Empty>
    </main>
  );
}

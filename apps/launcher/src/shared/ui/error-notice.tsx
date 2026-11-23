"use client";

import { House, RotateCw, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import { Button, buttonVariants } from "@avocado/ui/components/button";
import { cn } from "@avocado/ui/lib/utils";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@avocado/ui/components/empty";

import { kioskOutlineButton, kioskSolidButton } from "./kiosk-header";

/** 손님이 보는 오류 화면. 손으로 누르기 쉽게 버튼을 크게 둔다. */
export function ErrorNotice({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main id="main" tabIndex={-1} className="flex flex-1 items-center justify-center p-6">
      <Empty className="max-w-xl rounded-[10px] border border-solid border-input p-10">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <TriangleAlert />
          </EmptyMedia>
          <EmptyTitle className="text-3xl font-normal tracking-[-0.02em]">화면을 불러오지 못했습니다</EmptyTitle>
          <EmptyDescription className="text-base">잠시 후 다시 시도하시거나 직원에게 문의해주세요.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="flex-row justify-center">
          <Button className={cn(kioskSolidButton, "h-16 px-7 text-base")} onClick={retry}>
            <RotateCw />
            다시 시도
          </Button>
          <Link href="/" className={buttonVariants({ variant: "outline", className: cn(kioskOutlineButton, "h-16 px-7 text-base") })}>
            <House />
            처음 화면으로
          </Link>
        </EmptyContent>
      </Empty>
    </main>
  );
}

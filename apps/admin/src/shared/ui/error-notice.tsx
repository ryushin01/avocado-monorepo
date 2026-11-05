"use client";

import { House, RotateCw, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import { Button, buttonVariants } from "@avocado/ui/components/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@avocado/ui/components/card";

/** 오류 화면. 오류 번호는 서버 로그의 digest와 같아서 문의를 받으면 로그를 찾을 수 있다. */
export function ErrorNotice({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const digest = error instanceof Error ? (error as Error & { digest?: string }).digest : undefined;

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TriangleAlert className="size-5 text-destructive" />
            화면을 불러오지 못했습니다
          </CardTitle>
          <CardDescription>
            잠시 후 다시 시도해주세요. 계속되면 {digest ? "아래 오류 번호를 " : ""}본사에 알려주세요.
            {digest && <span className="mt-2 block font-mono text-xs">오류 번호: {digest}</span>}
          </CardDescription>
        </CardHeader>
        <CardFooter className="gap-2">
          <Button onClick={retry}>
            <RotateCw />
            다시 시도
          </Button>
          <Link href="/" className={buttonVariants({ variant: "outline" })}>
            <House />
            대시보드로 이동
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}

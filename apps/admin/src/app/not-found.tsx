import { FileQuestion, House } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@avocado/ui/components/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@avocado/ui/components/card";

export default function NotFound() {
  return (
    <main id="main" tabIndex={-1} className="flex flex-1 items-center justify-center p-6 outline-none">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileQuestion className="size-5 text-muted-foreground" />
            페이지를 찾을 수 없습니다
          </CardTitle>
          <CardDescription>주소가 바뀌었거나 없는 페이지입니다.</CardDescription>
        </CardHeader>
        <CardFooter>
          <Link href="/" className={buttonVariants()}>
            <House />
            대시보드로 이동
          </Link>
        </CardFooter>
      </Card>
    </main>
  );
}

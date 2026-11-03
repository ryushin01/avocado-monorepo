import Link from "next/link";
import { House, ShieldAlert } from "lucide-react";

import { buttonVariants } from "@avocado/ui/components/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@avocado/ui/components/card";

export default function Forbidden() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="size-5 text-destructive" />
            접근 권한이 없습니다
          </CardTitle>
          <CardDescription>
            이 페이지는 관리자만 이용할 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Link href="/" className={buttonVariants()}>
            <House />
            대시보드로 이동
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}

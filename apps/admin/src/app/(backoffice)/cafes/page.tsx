import { Suspense } from "react";

import { CafeList } from "@/components/cafes/cafe-list";
import { CreateCafeDialog } from "@/components/cafes/create-cafe-dialog";
import { PageHeading } from "@/components/layout/page-heading";
import { ListSkeleton } from "@/components/list/list-empty";
import { requireRole } from "@/lib/auth/guard";
import { listCafeOverview } from "@/lib/cafes/data";

export default function CafesPage() {
  // 사용자(쿠키)를 읽어 권한을 확인하므로 Suspense 안에서 렌더링한다.
  return (
    <Suspense
      fallback={
        <>
          <PageHeading icon="cafes" title="매장 관리" />
          <ListSkeleton />
        </>
      }
    >
      <CafesContent />
    </Suspense>
  );
}

async function CafesContent() {
  await requireRole(["admin"]);
  const cafes = await listCafeOverview();
  const openCount = cafes.filter((c) => c.status === "open").length;

  return (
    <>
      <PageHeading
        icon="cafes"
        title="매장 관리"
        description="프랜차이즈 매장을 등록하고 정보를 고치거나 폐점 처리합니다."
        actions={<CreateCafeDialog />}
      />
      <p className="text-sm text-muted-foreground">
        운영 중 {openCount}개 · 폐점 {cafes.length - openCount}개
      </p>
      <CafeList cafes={cafes} />
    </>
  );
}

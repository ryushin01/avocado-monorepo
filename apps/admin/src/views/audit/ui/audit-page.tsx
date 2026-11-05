import { Suspense } from "react";

import { PageHeading } from "@/widgets/app-shell";
import { AuditList } from "@/widgets/audit-list";
import { requireRole } from "@/server/auth/guard";
import { listAuditLogs } from "@/server/audit/data";
import { LIST_PAGE_SIZE, pageRange, parsePage } from "@/shared/lib/list";
import { ListEmpty, ListSkeleton } from "@/shared/ui/list-empty";
import { ListPagination } from "@/shared/ui/list-pagination";

const DESCRIPTION = "누가 언제 재고·게임·매장·직원·키오스크 토큰을 바꿨는지 봅니다. 기록은 고치거나 지울 수 없습니다.";

export default function AuditPage({ searchParams }: PageProps<"/audit">) {
  return (
    <Suspense
      fallback={
        <>
          <PageHeading icon="audit" title="변경 이력" />
          <ListSkeleton />
        </>
      }
    >
      <AuditContent searchParams={searchParams} />
    </Suspense>
  );
}

async function AuditContent({ searchParams }: Pick<PageProps<"/audit">, "searchParams">) {
  await requireRole(["admin"]);
  const params = await searchParams;
  const first = await listAuditLogs(pageRange(1));
  const pageCount = Math.max(1, Math.ceil(first.total / LIST_PAGE_SIZE));
  // 범위를 벗어난 페이지는 마지막 페이지로 맞춘다.
  const page = Math.min(parsePage(params), pageCount);
  const current = page === 1 ? first : await listAuditLogs(pageRange(page));

  return (
    <>
      <PageHeading icon="audit" title="변경 이력" description={DESCRIPTION} />
      {first.total === 0 ? (
        <ListEmpty title="아직 기록이 없습니다" description="재고·게임·매장·직원을 바꾸면 여기에 남습니다." />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">총 {first.total}건</p>
          <AuditList entries={current.items} />
          <ListPagination page={page} pageCount={pageCount} path="/audit" params={{}} />
        </>
      )}
    </>
  );
}

import { Suspense } from "react";

import { CatalogInfiniteList } from "@/components/games/catalog-infinite-list";
import { CatalogTable } from "@/components/games/catalog-table";
import { CreateGameDialog } from "@/components/games/create-game-dialog";
import { PageHeading } from "@/components/layout/page-heading";
import { ListEmpty, ListSkeleton } from "@/components/list/list-empty";
import { ListPagination } from "@/components/list/list-pagination";
import { ListToolbar } from "@/components/list/list-toolbar";
import { getCurrentUser } from "@/lib/auth/current-user";
import { canManageCatalog } from "@/lib/auth/permissions";
import { listCatalog } from "@/lib/games/data";
import { parseGameListFilter } from "@/lib/games/schema";
import { LIST_PAGE_SIZE, pageRange, parsePage } from "@/lib/list";

export default function GamesPage({ searchParams }: PageProps<"/games">) {
  return (
    <Suspense
      fallback={
        <>
          <PageHeading icon="games" title="보드게임" />
          <ListSkeleton />
        </>
      }
    >
      <GamesContent searchParams={searchParams} />
    </Suspense>
  );
}

async function GamesContent({
  searchParams,
}: Pick<PageProps<"/games">, "searchParams">) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const canEdit = canManageCatalog(user);
  const filter = parseGameListFilter(params);
  const filterKey = JSON.stringify(filter);

  const first = await listCatalog(filter, pageRange(1));
  const pageCount = Math.max(1, Math.ceil(first.total / LIST_PAGE_SIZE));
  // 범위를 벗어난 페이지는 마지막 페이지로 맞춘다.
  const page = Math.min(parsePage(params), pageCount);
  const current = page === 1 ? first : await listCatalog(filter, pageRange(page));

  return (
    <>
      <PageHeading
        icon="games"
        title="보드게임"
        description="모든 매장이 함께 쓰는 게임 카탈로그입니다."
        actions={canEdit && <CreateGameDialog />}
      />
      {/* key: URL이 바뀌면 툴바 입력값(defaultValue)을 URL과 다시 맞춘다 */}
      <ListToolbar key={filterKey} action="/games" values={filter} />
      <p className="text-sm text-muted-foreground">총 {first.total}개</p>

      {first.total === 0 ? (
        <ListEmpty />
      ) : (
        <>
          {/* 데스크톱(md 이상): 페이지 번호 */}
          <div className="hidden flex-col gap-4 md:flex">
            <CatalogTable games={current.items} canEdit={canEdit} />
            <ListPagination
              page={page}
              pageCount={pageCount}
              path="/games"
              params={filter}
            />
          </div>
          {/* 모바일: 무한 스크롤. 항상 첫 묶음부터 시작한다. */}
          <div className="md:hidden">
            <CatalogInfiniteList
              key={filterKey}
              filter={filter}
              firstPage={first.items}
              total={first.total}
              canEdit={canEdit}
            />
          </div>
        </>
      )}
    </>
  );
}

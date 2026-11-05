import { Suspense } from "react";

import { AddInventoryDialog } from "@/features/manage-inventory";
import { InventoryInfiniteList, InventoryTable } from "@/widgets/inventory-list";
import { PageHeading } from "@/widgets/app-shell";
import { ListEmpty, ListSkeleton } from "@/shared/ui/list-empty";
import { ListPagination } from "@/shared/ui/list-pagination";
import { ListToolbar } from "@/features/filter-list";
import { getCurrentUser } from "@/server/auth/current-user";
import { resolveCafe, visibleCafes } from "@/entities/user";
import { listCafes } from "@/server/cafes/data";
import { firstParam } from "@/shared/lib/search-params";
import { listInventory } from "@/server/inventory/data";
import { parseInventoryFilter } from "@/entities/inventory/schema";
import { LIST_PAGE_SIZE, pageRange, parsePage } from "@/shared/lib/list";

export default function InventoryPage({ searchParams }: PageProps<"/inventory">) {
  return (
    <Suspense
      fallback={
        <>
          <PageHeading icon="inventory" title="재고 관리" />
          <ListSkeleton />
        </>
      }
    >
      <InventoryContent searchParams={searchParams} />
    </Suspense>
  );
}

async function InventoryContent({
  searchParams,
}: Pick<PageProps<"/inventory">, "searchParams">) {
  const params = await searchParams;
  const [user, cafes] = await Promise.all([getCurrentUser(), listCafes()]);
  // 스태프는 cafe 파라미터와 관계없이 소속 매장만 본다.
  const cafe = resolveCafe(user, cafes, firstParam(params.cafe));

  if (!cafe) {
    return (
      <>
        <PageHeading icon="inventory" title="재고 관리" />
        <ListEmpty
          title="관리할 매장이 없습니다"
          description="소속 매장이 지정되지 않았습니다. 관리자에게 문의해주세요."
        />
      </>
    );
  }

  const filter = parseInventoryFilter(params);
  const listParams = { cafe: cafe.id, ...filter };
  const listKey = JSON.stringify(listParams);

  const first = await listInventory(cafe.id, filter, pageRange(1));
  const pageCount = Math.max(1, Math.ceil(first.total / LIST_PAGE_SIZE));
  const page = Math.min(parsePage(params), pageCount);
  const current =
    page === 1 ? first : await listInventory(cafe.id, filter, pageRange(page));

  const cafeOptions =
    user.role === "admin"
      ? visibleCafes(user, cafes).map((c) => ({ value: c.id, label: c.name }))
      : undefined;

  return (
    <>
      <PageHeading
        icon="inventory"
        title={`재고 관리 · ${cafe.name}`}
        description={
          user.role === "admin"
            ? "매장을 골라 보유 게임과 수량·상태를 관리합니다."
            : "소속 매장의 보유 게임과 수량·상태를 관리합니다."
        }
        actions={<AddInventoryDialog cafeId={cafe.id} cafeName={cafe.name} />}
      />
      <ListToolbar
        key={listKey}
        action="/inventory"
        values={listParams}
        cafes={cafeOptions}
        showStatus
      />
      <p className="text-sm text-muted-foreground">보유 {first.total}종</p>

      {first.total === 0 ? (
        <ListEmpty />
      ) : (
        <>
          <div className="hidden flex-col gap-4 md:flex">
            <InventoryTable entries={current.items} />
            <ListPagination
              page={page}
              pageCount={pageCount}
              path="/inventory"
              params={listParams}
            />
          </div>
          <div className="md:hidden">
            <InventoryInfiniteList
              key={listKey}
              cafeId={cafe.id}
              filter={filter}
              firstPage={first.items}
              total={first.total}
            />
          </div>
        </>
      )}
    </>
  );
}

import { Suspense } from "react";

import { PageHeading } from "@/components/layout/page-heading";
import { ListEmpty, ListSkeleton } from "@/components/list/list-empty";
import { ListPagination } from "@/components/list/list-pagination";
import { ListToolbar } from "@/components/list/list-toolbar";
import { ActivePlayList } from "@/components/plays/active-play-list";
import { PlayHistoryInfiniteList } from "@/components/plays/play-history-infinite-list";
import { PlayHistoryTable } from "@/components/plays/play-history-table";
import { StartPlayDialog } from "@/components/plays/start-play-dialog";
import { getCurrentUser } from "@/lib/auth/current-user";
import { resolveCafe, visibleCafes } from "@/lib/auth/permissions";
import { listCafes } from "@/lib/cafes/data";
import { firstParam } from "@/lib/games/schema";
import { LIST_PAGE_SIZE, pageRange, parsePage } from "@/lib/list";
import { listActivePlays, listPlayHistory } from "@/lib/plays/data";
import { parsePlayHistoryFilter } from "@/lib/plays/schema";

export default function PlaysPage({ searchParams }: PageProps<"/plays">) {
  return (
    <Suspense
      fallback={
        <>
          <PageHeading icon="plays" title="이용 기록" />
          <ListSkeleton />
        </>
      }
    >
      <PlaysContent searchParams={searchParams} />
    </Suspense>
  );
}

async function PlaysContent({ searchParams }: Pick<PageProps<"/plays">, "searchParams">) {
  const params = await searchParams;
  const [user, cafes] = await Promise.all([getCurrentUser(), listCafes()]);
  // 스태프는 cafe 파라미터와 관계없이 소속 매장만 본다.
  const cafe = resolveCafe(user, cafes, firstParam(params.cafe));

  if (!cafe) {
    return (
      <>
        <PageHeading icon="plays" title="이용 기록" />
        <ListEmpty
          title="기록할 매장이 없습니다"
          description="소속 매장이 없거나 폐점했습니다. 관리자에게 문의해주세요."
        />
      </>
    );
  }

  const filter = parsePlayHistoryFilter(params);
  const listParams = { cafe: cafe.id, ...filter };
  const listKey = JSON.stringify(listParams);

  const [active, first] = await Promise.all([
    listActivePlays(cafe.id),
    listPlayHistory(cafe.id, filter, pageRange(1)),
  ]);
  const pageCount = Math.max(1, Math.ceil(first.total / LIST_PAGE_SIZE));
  const page = Math.min(parsePage(params), pageCount);
  const current =
    page === 1 ? first : await listPlayHistory(cafe.id, filter, pageRange(page));

  const cafeOptions =
    user.role === "admin"
      ? visibleCafes(user, cafes).map((c) => ({ value: c.id, label: c.name }))
      : undefined;

  return (
    <>
      <PageHeading
        icon="plays"
        title={`이용 기록 · ${cafe.name}`}
        description="손님이 가져간 게임을 기록하고, 돌려받으면 반납 처리합니다."
        actions={<StartPlayDialog cafeId={cafe.id} cafeName={cafe.name} />}
      />
      {cafeOptions && (
        <ListToolbar
          key={`cafe:${cafe.id}`}
          action="/plays"
          values={{ cafe: cafe.id }}
          cafes={cafeOptions}
          showSearch={false}
          showCategory={false}
        />
      )}

      <section aria-labelledby="active-plays" className="flex flex-col gap-3">
        <h2 id="active-plays" className="text-lg font-semibold">
          지금 이용 중 <span className="text-muted-foreground tabular-nums">{active.plays.length}</span>
        </h2>
        <ActivePlayList plays={active.plays} now={active.now} />
      </section>

      <section aria-labelledby="play-history" className="flex flex-col gap-3">
        <h2 id="play-history" className="text-lg font-semibold">
          지난 기록
        </h2>
        <ListToolbar
          key={listKey}
          action="/plays"
          values={listParams}
          hidden={{ cafe: cafeOptions ? cafe.id : undefined }}
          showCategory={false}
          showDate
        />
        <p className="text-sm text-muted-foreground">반납 {first.total}건</p>
        {first.total === 0 ? (
          <ListEmpty
            title="기록이 없습니다"
            description={
              filter.q || filter.date
                ? "검색어나 날짜를 바꿔서 다시 시도해보세요."
                : "반납한 이용 기록이 여기에 쌓입니다."
            }
          />
        ) : (
          <>
            <div className="hidden flex-col gap-4 md:flex">
              <PlayHistoryTable plays={current.items} />
              <ListPagination
                page={page}
                pageCount={pageCount}
                path="/plays"
                params={listParams}
              />
            </div>
            <div className="md:hidden">
              <PlayHistoryInfiniteList
                key={listKey}
                cafeId={cafe.id}
                filter={filter}
                firstPage={first.items}
                total={first.total}
              />
            </div>
          </>
        )}
      </section>
    </>
  );
}

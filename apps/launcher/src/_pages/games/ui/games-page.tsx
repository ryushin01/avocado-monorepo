import { Suspense } from "react";

import { Skeleton } from "@avocado/ui/components/skeleton";
import { cn } from "@avocado/ui/lib/utils";

import { ConnectionError } from "@/shared/ui/connection-error";
import { IdleReturn } from "@/shared/ui/idle-return";
import { KIOSK_GUTTER, KioskDivider, KioskHeader, MonoLabel } from "@/shared/ui/kiosk-header";
import { fetchCafeGamesOrSnapshot } from "@/shared/api/index.server";
import { OfflineDataNotice } from "@/shared/ui/offline-data-notice";
import { filterKioskGames, parseKioskFilter } from "../model/filter-games";
import { FilterChips } from "./filter-chips";
import { GameCard } from "./game-card";

export default function GamesPage({ searchParams }: PageProps<"/games">) {
  return (
    <>
      <KioskHeader current="games" />
      <main id="main" tabIndex={-1} className={cn("flex w-full flex-col gap-10 pt-4 pb-16 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring", KIOSK_GUTTER)}>
        <IdleReturn />
        <Suspense fallback={<GamesSkeleton />}>
          <GamesContent searchParams={searchParams} />
        </Suspense>
      </main>
    </>
  );
}

async function GamesContent({ searchParams }: Pick<PageProps<"/games">, "searchParams">) {
  const [params, result] = await Promise.all([searchParams, fetchCafeGamesOrSnapshot()]);
  if (!result.ok) return <ConnectionError reason={result.reason} />;

  const filter = parseKioskFilter(params);
  const games = filterKioskGames(result.data.games, filter);
  return (
    <>
      {/* 세리프 매장 이름과 산세리프 '보유 게임'을 한 줄에 섞은 큰 제목, 오른쪽 위에 찾은 수 */}
      <div className="grid items-end gap-6 md:grid-cols-[1fr_auto]">
        <h1 className="kiosk-rise text-[clamp(2.75rem,6vw,4.25rem)] leading-[1.05] tracking-[-0.02em]">
          <span>
            <span className="font-serif font-light uppercase">{result.data.cafe.name}</span>{" "}
            <span className="font-medium">보유 게임</span>
          </span>
        </h1>
        <p className="flex items-baseline gap-2 pb-2 tabular-nums">
          <MonoLabel>
            찾은 게임 <span aria-hidden>►</span>
          </MonoLabel>
          <span className="text-2xl">{games.length}종</span>
        </p>
      </div>
      {result.offline && <OfflineDataNotice />}
      <FilterChips filter={filter} />
      <KioskDivider />
      {games.length === 0 ? (
        <p className="rounded-[10px] border border-input p-10 text-center text-lg text-muted-foreground">
          조건에 맞는 게임이 없습니다. 조건을 바꿔보세요.
        </p>
      ) : (
        <ul className="grid gap-x-[clamp(1.5rem,4vw,4rem)] gap-y-8 md:grid-cols-2 xl:grid-cols-3">
          {games.map((game, i) => (
            <li key={game.id}>
              <GameCard game={game} index={i + 1} showAvailability={!result.offline} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function GamesSkeleton() {
  return (
    <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="h-36 rounded-[5px]" />
      ))}
    </div>
  );
}

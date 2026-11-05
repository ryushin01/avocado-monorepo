import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { buttonVariants } from "@avocado/ui/components/button";
import { Skeleton } from "@avocado/ui/components/skeleton";

import { ConnectionError } from "@/shared/ui/connection-error";
import { FilterChips } from "@/features/filter-games";
import { GameCard } from "@/entities/game/ui";
import { IdleReturn } from "@/shared/ui/idle-return";
import { fetchCafeGames } from "@/shared/api/backoffice";
import { filterKioskGames, parseKioskFilter } from "@/entities/game";

export default function GamesPage({ searchParams }: PageProps<"/games">) {
  return (
    <main id="main" tabIndex={-1} className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
      <IdleReturn />
      <Link href="/" className={buttonVariants({ variant: "ghost", size: "lg", className: "h-12 self-start px-4 text-base" })}>
        <ArrowLeft />
        처음으로
      </Link>
      <Suspense fallback={<GamesSkeleton />}>
        <GamesContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function GamesContent({ searchParams }: Pick<PageProps<"/games">, "searchParams">) {
  const [params, result] = await Promise.all([searchParams, fetchCafeGames()]);
  if (!result.ok) return <ConnectionError reason={result.reason} />;

  const filter = parseKioskFilter(params);
  const games = filterKioskGames(result.data.games, filter);
  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">{result.data.cafe.name} 보유 게임</h1>
      <FilterChips filter={filter} />
      <p className="text-muted-foreground tabular-nums">{games.length}종</p>
      {games.length === 0 ? (
        <p className="rounded-xl border bg-background p-10 text-center text-lg text-muted-foreground">
          조건에 맞는 게임이 없습니다. 조건을 바꿔보세요.
        </p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {games.map((game) => (
            <li key={game.id}>
              <GameCard game={game} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function GamesSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="h-32 rounded-xl" />
      ))}
    </div>
  );
}

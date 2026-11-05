"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import type { CatalogGame } from "@avocado/domain/catalog";
import { buttonVariants } from "@avocado/ui/components/button";

import { GameTile } from "@/entities/game/ui";
import { GAME_SORT_LABELS, GAME_SORTS, parseGameSort, sortGames } from "@/entities/game";

export function SortedGames({ categoryKey, games }: { categoryKey: string; games: CatalogGame[] }) {
  const sort = parseGameSort(useSearchParams().get("sort") ?? undefined);
  const sorted = sortGames(games, sort);
  return (
    <>
      <nav aria-label="정렬" className="flex flex-wrap items-center gap-2">
        {GAME_SORTS.map((s) => (
          <Link
            key={s}
            href={s === "ranking" ? `/games/${categoryKey}` : `/games/${categoryKey}?sort=${s}`}
            replace
            scroll={false}
            aria-current={s === sort ? "true" : undefined}
            className={buttonVariants({ variant: s === sort ? "default" : "outline", size: "sm" })}
          >
            {GAME_SORT_LABELS[s]}
          </Link>
        ))}
        <span className="ml-auto text-sm text-muted-foreground tabular-nums">{sorted.length}종</span>
      </nav>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {sorted.map((game) => (
          <li key={game.bggId}>
            <GameTile game={game} sizes="(min-width: 1280px) 20vw, (min-width: 768px) 33vw, 50vw" />
          </li>
        ))}
      </ul>
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { CATEGORY_INFO, catalogGamesIn, type CategoryInfo } from "@avocado/domain/catalog";
import { buttonVariants } from "@avocado/ui/components/button";
import { Skeleton } from "@avocado/ui/components/skeleton";

import { GameTile } from "@/components/game-tile";
import { GAME_SORT_LABELS, GAME_SORTS, parseGameSort, sortGames } from "@/lib/sort-games";

const findCategory = (key: string) => CATEGORY_INFO.find((c) => c.key === key);

export function generateStaticParams() {
  return CATEGORY_INFO.map((c) => ({ category: c.key }));
}

export async function generateMetadata({
  params,
}: PageProps<"/games/[category]">): Promise<Metadata> {
  const category = findCategory((await params).category);
  return category ? { title: category.label, description: category.description } : {};
}

export default function CategoryPage({ params, searchParams }: PageProps<"/games/[category]">) {
  // Partial Prefetching에서는 params도 Suspense 안에서 읽어야 바로 이동하는 틀이 만들어진다.
  return (
    <main className="mx-auto max-w-7xl px-4 md:px-6">
      <div className="flex flex-col gap-8 rounded-lg bg-card px-5 py-10 text-card-foreground md:px-12 md:py-16">
        <Suspense fallback={<GridSkeleton />}>
          <CategoryContent params={params} searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

async function CategoryContent({ params, searchParams }: PageProps<"/games/[category]">) {
  const category = findCategory((await params).category);
  if (!category) notFound();

  return (
    <>
      <header className="flex flex-col gap-2">
        <p className="text-sm font-medium tracking-widest text-primary">
          {category.bggType.toUpperCase()}
        </p>
        <h1 className="text-3xl font-bold">{category.label}</h1>
        <p className="text-muted-foreground">{category.description}</p>
      </header>
      {/* 정렬은 주소(sort)로 정하므로 요청 시점에 그린다. */}
      <Suspense fallback={<GridSkeleton />}>
        <SortedGames category={category} searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function SortedGames({
  category,
  searchParams,
}: {
  category: CategoryInfo;
  searchParams: PageProps<"/games/[category]">["searchParams"];
}) {
  const sort = parseGameSort((await searchParams).sort);
  const games = sortGames(catalogGamesIn(category.key), sort);
  return (
    <>
      <nav aria-label="정렬" className="flex flex-wrap items-center gap-2">
        {GAME_SORTS.map((s) => (
          <Link
            key={s}
            href={s === "ranking" ? `/games/${category.key}` : `/games/${category.key}?sort=${s}`}
            replace
            scroll={false}
            aria-current={s === sort ? "true" : undefined}
            className={buttonVariants({ variant: s === sort ? "default" : "outline", size: "sm" })}
          >
            {GAME_SORT_LABELS[s]}
          </Link>
        ))}
        <span className="ml-auto text-sm text-muted-foreground tabular-nums">{games.length}종</span>
      </nav>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {games.map((game) => (
          <li key={game.bggId}>
            <GameTile game={game} sizes="(min-width: 1280px) 20vw, (min-width: 768px) 33vw, 50vw" />
          </li>
        ))}
      </ul>
    </>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      {Array.from({ length: 10 }, (_, i) => (
        <Skeleton key={i} className="aspect-[2/3] rounded-lg" />
      ))}
    </div>
  );
}

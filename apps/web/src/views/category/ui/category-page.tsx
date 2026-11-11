import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { CATEGORY_INFO, catalogGamesIn, type CategoryInfo } from "@avocado/domain/catalog";
import { buttonVariants } from "@avocado/ui/components/button";
import { Skeleton } from "@avocado/ui/components/skeleton";

import { PageHeader } from "@/widgets/site-header";
import { GameTile, GameTileSkeleton } from "@/entities/game/ui";
import { GAME_SORT_LABELS, GAME_SORTS, parseGameSort, sortGames } from "@/entities/game";
import { pageMetadata } from "@/shared/lib/page-metadata";

const findCategory = (key: string) => CATEGORY_INFO.find((c) => c.key === key);

export function generateStaticParams() {
  return CATEGORY_INFO.map((c) => ({ category: c.key }));
}

export async function generateMetadata({
  params,
}: PageProps<"/games/[category]">): Promise<Metadata> {
  const category = findCategory((await params).category);
  return category
    ? pageMetadata({ title: category.label, description: category.description, path: `/games/${category.key}` })
    : {};
}

const BACK_HOME = { href: "/", label: "홈으로" };

export default function CategoryPage({ params, searchParams }: PageProps<"/games/[category]">) {
  // Partial Prefetching에서는 params도 Suspense 안에서 읽어야 바로 이동하는 틀이 만들어진다.
  // 불러오는 동안 바로가기로 들어와도 초점이 사라지지 않도록 main은 Suspense 밖에 둔다.
  return (
    <div className="flex flex-1 flex-col lg:grid lg:grid-cols-8">
      <Suspense fallback={<PageHeader title={<Skeleton className="h-7 w-32 lg:h-10" />} back={BACK_HOME} />}>
        <CategoryHeader params={params} />
      </Suspense>
      <main id="main" tabIndex={-1} className="min-w-0 scroll-mt-14 lg:col-span-6 lg:scroll-mt-0">
        <div className="flex flex-col gap-8 rounded-lg border border-page bg-card px-5 py-10 text-card-foreground lg:min-h-screen lg:px-[60px] lg:py-[100px]">
          <Suspense fallback={<GridSkeleton />}>
            <CategoryContent params={params} searchParams={searchParams} />
          </Suspense>
        </div>
      </main>
    </div>
  );
}

async function CategoryHeader({ params }: Pick<PageProps<"/games/[category]">, "params">) {
  const category = findCategory((await params).category);
  if (!category) notFound();
  return <PageHeader title={category.bggType.toUpperCase()} back={BACK_HOME} />;
}

async function CategoryContent({ params, searchParams }: PageProps<"/games/[category]">) {
  const category = findCategory((await params).category);
  if (!category) notFound();

  return (
    <>
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">{category.label}</h1>
        <p className="tracking-tighter text-muted-foreground">{category.description}</p>
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
        <span className="ml-auto font-stat text-sm text-muted-foreground tabular-nums">{games.length}종</span>
      </nav>
      <ul className="-mx-5 grid grid-cols-2 bg-page md:grid-cols-3 lg:mx-0 xl:grid-cols-4 2xl:grid-cols-5">
        {games.map((game) => (
          <li key={game.bggId}>
            <GameTile game={game} sizes="(min-width: 1536px) 14vw, (min-width: 1280px) 17vw, (min-width: 1024px) 23vw, (min-width: 768px) 33vw, 50vw" />
          </li>
        ))}
      </ul>
    </>
  );
}

function GridSkeleton() {
  return (
    <div
      role="status"
      aria-label="게임 목록을 불러오는 중입니다"
      className="-mx-5 grid grid-cols-2 bg-page md:grid-cols-3 lg:mx-0 xl:grid-cols-4 2xl:grid-cols-5"
    >
      {Array.from({ length: 10 }, (_, i) => (
        <GameTileSkeleton key={i} />
      ))}
    </div>
  );
}

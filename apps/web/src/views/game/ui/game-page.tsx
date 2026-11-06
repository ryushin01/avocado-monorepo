import { Gauge, MapPin, Star, Trophy } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import {
  CATALOG_GAMES,
  CATEGORY_INFO,
  findCatalogGame,
  GAME_CATEGORY_LABELS,
  GAME_DIFFICULTY_LABELS,
} from "@avocado/domain/catalog";
import { Badge } from "@avocado/ui/components/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@avocado/ui/components/breadcrumb";
import { Skeleton } from "@avocado/ui/components/skeleton";

import { PageHeader } from "@/widgets/site-header";
import { GameImage } from "@/entities/game/ui";
import { pageMetadata } from "@/shared/lib/page-metadata";

export function generateStaticParams() {
  return CATALOG_GAMES.map((g) => ({ bggId: String(g.bggId) }));
}

const gameOf = async (params: PageProps<"/game/[bggId]">["params"]) =>
  findCatalogGame(Number((await params).bggId));

export async function generateMetadata({ params }: PageProps<"/game/[bggId]">): Promise<Metadata> {
  const game = await gameOf(params);
  return game
    ? pageMetadata({
        title: game.name,
        description: `${game.name} (${game.englishName}) 게임 정보`,
        path: `/game/${game.bggId}`,
      })
    : {};
}

const PANEL =
  "flex flex-col gap-10 rounded-lg border border-page bg-card px-5 py-10 text-card-foreground lg:min-h-screen lg:px-[60px] lg:py-[100px]";

const range = (min: number, max: number, unit: string) =>
  min === max ? `${min}${unit}` : `${min}–${max}${unit}`;

const TITLE = "DETAIL";

export default function GamePage({ params }: PageProps<"/game/[bggId]">) {
  // Partial Prefetching에서는 params도 Suspense 안에서 읽어야 바로 이동하는 틀이 만들어진다.
  // 불러오는 동안 바로가기로 들어와도 초점이 사라지지 않도록 main은 Suspense 밖에 둔다.
  return (
    <div className="flex flex-1 flex-col lg:grid lg:grid-cols-8">
      <Suspense fallback={<PageHeader title={TITLE} back={{ href: "/", label: "홈으로" }} />}>
        <GameHeader params={params} />
      </Suspense>
      <main id="main" tabIndex={-1} className="min-w-0 scroll-mt-14 lg:col-span-6 lg:scroll-mt-0">
        <Suspense fallback={<GameSkeleton />}>
          <GameContent params={params} />
        </Suspense>
      </main>
    </div>
  );
}

const mainCategoryOf = (game: NonNullable<ReturnType<typeof findCatalogGame>>) =>
  CATEGORY_INFO.find((c) => c.key === game.categories[0])!;

async function GameHeader({ params }: Pick<PageProps<"/game/[bggId]">, "params">) {
  const game = await gameOf(params);
  if (!game) notFound();
  const category = mainCategoryOf(game);
  return <PageHeader title={TITLE} back={{ href: `/games/${category.key}`, label: `${category.label} 목록으로` }} />;
}

/** 상세 화면과 같은 자리를 잡아 내용이 들어올 때 화면이 밀리지 않게 한다. */
function GameSkeleton() {
  return (
    <div
      role="status"
      aria-label="게임 정보를 불러오는 중입니다"
      className={`${PANEL} motion-reduce:[&_*]:animate-none`}
    >
      <Skeleton className="h-5 w-48" />
      <div className="flex flex-col gap-10 lg:flex-row">
        <div className="flex flex-col gap-4 lg:w-2/5">
          <Skeleton className="aspect-square rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
        </div>
        <div className="flex flex-1 flex-col gap-4">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-6 w-1/2" />
          {Array.from({ length: 9 }, (_, i) => (
            <Skeleton key={i} className="h-5 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

async function GameContent({ params }: Pick<PageProps<"/game/[bggId]">, "params">) {
  const game = await gameOf(params);
  if (!game) notFound();
  const mainCategory = mainCategoryOf(game);

  const info: [string, string][] = [
    ["게임명", `${game.name} (${game.englishName})`],
    ["디자이너", game.designers.join(", ")],
    ["출시년도", `${game.yearReleased}년`],
    ["장르", game.categories.map((c) => GAME_CATEGORY_LABELS[c]).join(", ")],
    ["카테고리", game.tags.join(", ")],
    ["플레이 인원", range(game.minPlayers, game.maxPlayers, "명")],
    ["추천 인원", `${game.bestPlayers}명`],
    ["플레이 시간", range(game.playTimeMin, game.playTimeMax, "분")],
    ["권장 나이", `${game.minAge}세 이상`],
  ];

  return (
      <article className={PANEL}>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/" />}>홈</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href={`/games/${mainCategory.key}`} />}>
                {mainCategory.label}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{game.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex flex-col gap-10 lg:flex-row">
          <div className="flex flex-col gap-4 lg:w-2/5">
            <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
              <GameImage
                src={game.imageUrl}
                alt={`${game.name} 표지`}
                fill
                priority
                sizes="(min-width: 1024px) 30vw, 100vw"
                skeletonClassName="inset-6 rounded-md"
                className="object-contain p-6"
              />
            </div>
            <dl className="grid grid-cols-3 rounded-lg bg-page py-5 text-center text-white">
              <Stat icon={Trophy} label="순위" value={`${game.rank}위`} />
              <Stat icon={Star} label="평점" value={game.rating.toFixed(1)} />
              <Stat icon={Gauge} label="난이도" value={`${game.weight.toFixed(2)} · ${GAME_DIFFICULTY_LABELS[game.difficulty]}`} />
            </dl>
          </div>

          <div className="flex flex-1 flex-col gap-10">
            <header className="flex flex-col gap-2">
              <h1 className="text-3xl font-bold md:text-4xl">{game.name}</h1>
              <p className="text-lg text-muted-foreground">{game.englishName}</p>
              <div className="flex flex-wrap gap-1.5">
                {game.categories.map((c) => (
                  <Badge key={c} variant="outline">
                    {GAME_CATEGORY_LABELS[c]}
                  </Badge>
                ))}
                {game.koreanEdition && <Badge>한국어판</Badge>}
              </div>
            </header>
            <section aria-labelledby="game-info" className="flex flex-col gap-4">
              <h2 id="game-info" className="text-xl font-bold">
                게임 정보
              </h2>
              <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-[auto_1fr]">
                {info.map(([label, value]) => (
                  <div key={label} className="contents">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </section>
            <section className="flex items-start gap-3 rounded-lg border p-5">
              <MapPin className="mt-0.5 size-5 shrink-0 text-primary" />
              <div>
                <h2 className="font-bold">매장에서 직접 즐겨보세요</h2>
                <p className="text-sm text-muted-foreground">
                  매장마다 보유 게임이 다릅니다. 방문 전 매장에 문의하시면 정확히 안내해드립니다.
                </p>
                <Link
                  href="/about#stores"
                  className="mt-2 inline-flex min-h-11 items-center text-sm font-bold underline underline-offset-4"
                >
                  매장 안내 보기
                </Link>
              </div>
            </section>
          </div>
        </div>
      </article>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Star; label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1 border-white/20 [&:not(:first-child)]:border-l">
      <dt className="flex items-center gap-1 text-xs text-white/70">
        <Icon className="size-4" />
        {label}
      </dt>
      <dd className="font-bold tabular-nums">{value}</dd>
    </div>
  );
}

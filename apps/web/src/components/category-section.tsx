import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { type CategoryInfo, catalogGamesIn } from "@avocado/domain/catalog";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@avocado/ui/components/carousel";

import { CATEGORY_BANNERS } from "@/lib/site";

import { GameTile } from "./game-tile";

const PREVIEW_COUNT = 10;

/** 홈 화면의 유형 소개: 설명, 순위 상위 게임 넘겨 보기, 전체 목록 링크 */
export function CategorySection({ category }: { category: CategoryInfo }) {
  const games = catalogGamesIn(category.key).slice(0, PREVIEW_COUNT);
  const banner = CATEGORY_BANNERS[category.key];
  return (
    <section aria-labelledby={`category-${category.key}`} className="flex flex-col gap-4">
      <div className="flex flex-col gap-8 rounded-lg bg-card px-5 py-10 text-card-foreground md:px-12 md:py-16">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium tracking-widest text-primary">{category.bggType.toUpperCase()}</p>
          <h2 id={`category-${category.key}`} className="text-3xl font-bold">
            {category.label}
          </h2>
          <p className="text-muted-foreground">{category.description}</p>
        </div>
        <Carousel opts={{ align: "start" }} aria-label={`${category.label} 순위 상위 게임`}>
          <CarouselContent>
            {games.map((game) => (
              <CarouselItem key={game.bggId} className="basis-2/3 sm:basis-1/3 lg:basis-1/4 xl:basis-1/5">
                <GameTile game={game} sizes="(min-width: 1280px) 20vw, (min-width: 640px) 33vw, 66vw" />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="-left-4 hidden md:flex" />
          <CarouselNext className="-right-4 hidden md:flex" />
        </Carousel>
        <Link
          href={`/games/${category.key}`}
          className="flex items-center gap-3 font-medium underline-offset-4 hover:underline"
        >
          {category.label} 전체 목록 보기
          <span className="h-px flex-1 bg-border" />
          <ArrowRight className="size-4" />
        </Link>
      </div>
      {banner && (
        <div className="relative h-[50vw] overflow-hidden rounded-lg md:h-[24vw]">
          <Image src={banner.src} alt={banner.alt} fill sizes="100vw" className="object-cover" />
        </div>
      )}
    </section>
  );
}

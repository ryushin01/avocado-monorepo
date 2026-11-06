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

import { CATEGORY_BANNERS } from "@/shared/config/site";

import { GameTile } from "@/entities/game/ui";

const PREVIEW_COUNT = 10;
// 끝에 닿은 쪽 버튼은 감추되, 키보드로 초점이 오면 보여 준다.
const ARROW = "size-10 bg-card/90 aria-disabled:opacity-0 aria-disabled:focus-visible:opacity-50";

/** 홈 화면의 유형 소개: 설명, 순위 상위 게임 넘겨 보기, 전체 목록 링크 */
export function CategorySection({ category }: { category: CategoryInfo }) {
  const games = catalogGamesIn(category.key).slice(0, PREVIEW_COUNT);
  const banner = CATEGORY_BANNERS[category.key];
  return (
    <section aria-labelledby={`category-${category.key}`}>
      <div className="flex flex-col gap-12 rounded-lg border border-page bg-card px-5 py-12 text-card-foreground lg:px-12 lg:py-24">
        <div className="flex flex-col gap-4">
          <h2 id={`category-${category.key}`} className="flex flex-col gap-1 text-4xl">
            <span lang="en" className="text-sm tracking-[4px] text-muted-foreground">
              {category.bggType.toUpperCase()}
            </span>
            {category.label}
          </h2>
          <p className="tracking-tighter text-muted-foreground">{category.description}</p>
        </div>
        <Carousel
          opts={{ align: "start" }}
          aria-label={`${category.label} 순위 상위 게임`}
          className="-mx-5 bg-page lg:mx-0"
        >
          <CarouselContent className="ml-0">
            {games.map((game) => (
              <CarouselItem key={game.bggId} className="basis-5/6 pl-0 md:basis-1/3 xl:basis-1/4 2xl:basis-1/5">
                <GameTile
                  game={game}
                  sizes="(min-width: 1536px) 14vw, (min-width: 1280px) 17vw, (min-width: 768px) 33vw, 84vw"
                />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className={`left-2 ${ARROW}`} />
          <CarouselNext className={`right-2 ${ARROW}`} />
        </Carousel>
        <Link
          href={`/games/${category.key}`}
          className="flex items-center gap-3 tracking-tighter underline-offset-4 hover:underline"
        >
          {category.label}
          <span aria-hidden className="h-px flex-1 bg-page" />
          전체 목록 보기
          <ArrowRight className="size-4" />
        </Link>
      </div>
      {banner && (
        <div className="relative h-[50vw] overflow-hidden rounded-lg border border-page lg:h-[28vw]">
          <Image
            src={banner.src}
            alt={banner.alt}
            fill
            sizes="(min-width: 1024px) 67vw, 100vw"
            className="object-cover"
            style={{ objectPosition: banner.position }}
          />
        </div>
      )}
    </section>
  );
}

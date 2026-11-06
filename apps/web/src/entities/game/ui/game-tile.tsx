import Image from "next/image";
import Link from "next/link";

import type { CatalogGame } from "@avocado/domain/catalog";
import { Skeleton } from "@avocado/ui/components/skeleton";

import { GameImage } from "./game-image";

const COVER_SLOT = "inset-x-4 top-4 bottom-20 rounded-md";

/** 표지 카드 (avocado 목록 카드). 10위 안이면 배지를 붙인다. */
export function GameTile({ game, sizes }: { game: CatalogGame; sizes: string }) {
  return (
    <Link
      href={`/game/${game.bggId}`}
      className="group relative block aspect-[2/3] overflow-hidden rounded-lg border border-page bg-[url('/images/game-placeholder.png')] bg-cover bg-center outline-none focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-ring"
    >
      <GameImage
        src={game.imageUrl}
        alt=""
        fill
        sizes={sizes}
        skeletonClassName={COVER_SLOT}
        className="object-contain px-4 pt-4 pb-20 transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
      />
      {game.rank <= 10 && (
        <Image src="/images/top-ten.png" alt="10위권" width={40} height={40} className="absolute top-2 left-2" />
      )}
      <span className="absolute inset-x-0 bottom-0 flex flex-col bg-gradient-to-t from-black/90 via-black/75 to-transparent p-4 pt-10 text-white">
        <span className="line-clamp-2 font-bold">{game.name}</span>
        <span className="text-sm text-white/90">
          {game.rank}위 · {game.yearReleased}
        </span>
      </span>
    </Link>
  );
}

/** 목록을 불러오는 동안 카드 자리를 그대로 잡아 두는 모양 */
export function GameTileSkeleton() {
  return (
    <div
      aria-hidden
      className="relative aspect-[2/3] overflow-hidden rounded-lg border border-page bg-muted"
    >
      <Skeleton className={`absolute bg-neutral-300 motion-reduce:animate-none ${COVER_SLOT}`} />
      <div className="absolute inset-x-4 bottom-4 flex flex-col gap-2">
        <Skeleton className="h-4 w-3/4 bg-neutral-300 motion-reduce:animate-none" />
        <Skeleton className="h-3 w-1/2 bg-neutral-300 motion-reduce:animate-none" />
      </div>
    </div>
  );
}

import Image from "next/image";
import Link from "next/link";

import type { CatalogGame } from "@avocado/domain/catalog";

// CSS의 url()은 저장소 하위 경로(GitHub Pages)를 자동으로 붙이지 못한다.
const PLACEHOLDER = `url('${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/images/game-placeholder.png')`;

/** 표지 카드 (avocado 목록 카드). 10위 안이면 배지를 붙인다. */
export function GameTile({ game, sizes }: { game: CatalogGame; sizes: string }) {
  return (
    <Link
      href={`/game/${game.bggId}`}
      style={{ backgroundImage: PLACEHOLDER }}
      className="group relative block aspect-[2/3] overflow-hidden rounded-lg bg-cover bg-center outline-none focus-visible:ring-3 focus-visible:ring-ring"
    >
      <Image
        src={game.imageUrl}
        alt=""
        fill
        sizes={sizes}
        className="object-contain px-4 pt-4 pb-16 transition-transform duration-300 group-hover:scale-105"
      />
      {game.rank <= 10 && (
        <Image src="/images/top-ten.png" alt="10위권" width={40} height={40} className="absolute top-2 left-2" />
      )}
      <span className="absolute inset-x-0 bottom-0 flex flex-col bg-gradient-to-t from-black/70 to-transparent p-4 pt-10 text-white">
        <span className="truncate font-bold">{game.name}</span>
        <span className="text-sm text-white/80">
          {game.rank}위 · {game.yearReleased}
        </span>
      </span>
    </Link>
  );
}

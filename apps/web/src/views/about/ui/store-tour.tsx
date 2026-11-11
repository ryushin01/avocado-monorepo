import Image from "next/image";

import { HERO_IMAGES } from "@/shared/config/site";

/** 공간 둘러보기에 붙이는 이름. 사진 순서(HERO_IMAGES)와 같다. */
const SPACES = ["체스 테이블", "탐험 테이블", "일꾼 놓기 테이블", "타일 테이블", "파티 테이블"];

/**
 * 매장 공간 둘러보기. 더 현대 서울처럼 큰 공간 사진을 화면에 고정해 두고, 세로 스크롤로 옆으로 걸어가듯 넘긴다.
 * 움직임은 CSS 스크롤 타임라인으로만 만들고, 지원하지 않거나 동작 줄이기를 켜면 사진을 차례로 쌓아 보여 준다.
 */
export function StoreTour() {
  return (
    <section aria-labelledby="tour-title" className="store-tour">
      <div className="store-tour-stage">
        <div className="flex flex-col gap-2 px-5 lg:px-[60px]">
          <p lang="en" className="text-sm tracking-[4px] text-muted-foreground">
            SPACE TOUR
          </p>
          <h2 id="tour-title" className="text-2xl font-bold">
            매장 둘러보기
          </h2>
        </div>
        <ol className="store-tour-track">
          {HERO_IMAGES.map((image, i) => (
            <li key={image.src} className="store-tour-room">
              <div className="store-tour-photo">
                <Image src={image.src} alt={image.alt} fill sizes="(min-width: 1024px) 50vw, 85vw" className="object-cover" />
              </div>
              <p className="flex items-baseline gap-3">
                <span lang="en" className="font-stat text-sm text-muted-foreground tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="font-bold">{SPACES[i]}</span>
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

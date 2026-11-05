"use client";

import Autoplay from "embla-carousel-autoplay";
import Image from "next/image";
import { useState } from "react";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@avocado/ui/components/carousel";

import { HERO_IMAGES } from "@/shared/config/site";

/** 홈 화면 큰 사진. 3.5초마다 넘어가고, 손님이 만지면 멈춘다. */
export function HeroCarousel() {
  // 플러그인은 한 번만 만든다 (렌더링마다 새로 만들면 자동 넘김이 처음부터 다시 시작된다).
  const [plugins] = useState(() => [Autoplay({ delay: 3500, stopOnInteraction: true })]);
  return (
    <Carousel opts={{ loop: true }} plugins={plugins} className="h-full" aria-label="매장 분위기 사진">
      <CarouselContent className="ml-0 h-full">
        {HERO_IMAGES.map((image, i) => (
          <CarouselItem key={image.src} className="relative h-[60vh] max-h-[720px] pl-0 md:h-[70vh]">
            <Image
              src={image.src}
              alt={image.alt}
              fill
              priority={i === 0}
              sizes="100vw"
              className="object-cover"
            />
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="left-4 hidden md:flex" />
      <CarouselNext className="right-4 hidden md:flex" />
    </Carousel>
  );
}

"use client";

import Autoplay from "embla-carousel-autoplay";
import { Pause, Play } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

import { Button } from "@avocado/ui/components/button";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@avocado/ui/components/carousel";

import { HERO_IMAGES } from "@/shared/config/site";

const CONTROL = "size-10 rounded-full border-white/60 bg-black/40 text-white hover:bg-black/60 hover:text-white";

/** 홈 화면 큰 사진. 3.5초마다 넘어가고, 손님이 만지거나 정지 버튼을 누르면 멈춘다. */
export function HeroCarousel() {
  // 플러그인은 한 번만 만든다 (렌더링마다 새로 만들면 자동 넘김이 처음부터 다시 시작된다).
  const [plugins] = useState(() => [Autoplay({ delay: 3500, stopOnInteraction: true })]);
  const [api, setApi] = useState<CarouselApi>();
  const [selected, setSelected] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setSelected(api.selectedScrollSnap());
    const onPlay = () => setPlaying(true);
    const onStop = () => setPlaying(false);
    api.on("select", onSelect);
    api.on("autoplay:play", onPlay);
    api.on("autoplay:stop", onStop);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) plugins[0].stop();
    return () => {
      api.off("select", onSelect);
      api.off("autoplay:play", onPlay);
      api.off("autoplay:stop", onStop);
    };
  }, [api, plugins]);

  return (
    <Carousel opts={{ loop: true }} plugins={plugins} setApi={setApi} aria-label="매장 분위기 사진">
      <CarouselContent className="ml-0">
        {HERO_IMAGES.map((image, i) => (
          <CarouselItem key={image.src} className="relative h-[90svh] pl-0 lg:h-screen">
            <Image
              src={image.src}
              alt={image.alt}
              fill
              priority={i === 0}
              sizes="(min-width: 1024px) 34vw, 100vw"
              className="object-cover"
            />
          </CarouselItem>
        ))}
      </CarouselContent>
      <div className="absolute inset-x-5 bottom-5 z-20 flex items-center gap-2 lg:inset-x-[60px] lg:bottom-10">
        <div aria-hidden className="mr-2 h-0.5 flex-1 bg-white/40">
          <div
            className="h-full bg-white transition-[width] duration-300 motion-reduce:transition-none"
            style={{ width: `${((selected + 1) / HERO_IMAGES.length) * 100}%` }}
          />
        </div>
        <CarouselPrevious className={`static ${CONTROL}`} />
        <Button
          variant="outline"
          size="icon"
          aria-label={playing ? "자동 넘김 정지" : "자동 넘김 재생"}
          // 캐러셀이 준비되기 전에 누르면 클릭이 사라지므로 그때까지 막는다.
          disabled={!api}
          onClick={() => (playing ? plugins[0].stop() : plugins[0].play())}
          className={CONTROL}
        >
          {playing ? <Pause /> : <Play />}
        </Button>
        <CarouselNext className={`static ${CONTROL}`} />
      </div>
    </Carousel>
  );
}

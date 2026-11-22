"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

import { Skeleton } from "@avocado/ui/components/skeleton";

/**
 * 표지가 도착할 때까지 자리에 스켈레톤을 보여 준다.
 * 스켈레톤을 이미지 뒤에 깔기만 하므로 스크립트가 없어도 표지는 그대로 보인다.
 * 원본(BoardGameGeek)을 받지 못하면(오프라인·원본 서버 장애) 함께 배포한 작은 썸네일(fallbackSrc)로 바꾸고,
 * 그것도 실패하면 둘 다 치워 카드 바탕을 보여 준다.
 */
export function GameImage({
  skeletonClassName,
  alt,
  src,
  fallbackSrc,
  ...image
}: ImageProps & { skeletonClassName: string; fallbackSrc?: string }) {
  const [status, setStatus] = useState<"loading" | "loaded" | "failed">("loading");
  const [useFallback, setUseFallback] = useState(false);
  const onError = () => {
    if (fallbackSrc && !useFallback) setUseFallback(true);
    else setStatus("failed");
  };
  return (
    <>
      {status === "loading" && (
        <Skeleton
          aria-hidden
          data-testid="game-image-skeleton"
          className={`absolute bg-neutral-300 motion-reduce:animate-none ${skeletonClassName}`}
        />
      )}
      {status !== "failed" &&
        (useFallback && fallbackSrc ? (
          // 썸네일은 이미 작은 webp라 최적화 서버를 거치지 않는다.
          <Image
            key="fallback"
            {...image}
            src={fallbackSrc}
            alt={alt}
            unoptimized
            data-fallback=""
            onLoad={() => setStatus("loaded")}
            onError={onError}
          />
        ) : (
          <Image key="original" {...image} src={src} alt={alt} onLoad={() => setStatus("loaded")} onError={onError} />
        ))}
    </>
  );
}

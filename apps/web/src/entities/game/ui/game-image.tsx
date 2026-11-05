"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

import { Skeleton } from "@avocado/ui/components/skeleton";

/**
 * 표지가 도착할 때까지 자리에 스켈레톤을 보여 준다.
 * 스켈레톤을 이미지 뒤에 깔기만 하므로 스크립트가 없어도 표지는 그대로 보인다. 실패하면 둘 다 치워 카드 바탕을 보여 준다.
 */
export function GameImage({
  skeletonClassName,
  alt,
  ...image
}: ImageProps & { skeletonClassName: string }) {
  const [status, setStatus] = useState<"loading" | "loaded" | "failed">("loading");
  return (
    <>
      {status === "loading" && (
        <Skeleton
          aria-hidden
          data-testid="game-image-skeleton"
          className={`absolute bg-neutral-300 motion-reduce:animate-none ${skeletonClassName}`}
        />
      )}
      {status !== "failed" && (
        <Image {...image} alt={alt} onLoad={() => setStatus("loaded")} onError={() => setStatus("failed")} />
      )}
    </>
  );
}

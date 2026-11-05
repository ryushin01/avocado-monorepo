import { securityHeaders } from "@avocado/config/security-headers";
import type { NextConfig } from "next";

// 게임 표지는 Next.js 이미지 최적화를 거쳐 같은 주소에서 나간다.
const headers = securityHeaders();

// GitHub Pages용 정적 빌드. 정적 내보내기는 헤더 설정, Cache Components, 이미지 최적화를 쓸 수 없다.
const staticExport = process.env.STATIC_EXPORT === "1";
const basePath = "/avocado-monorepo";

const nextConfig: NextConfig = {
  ...(staticExport
    ? { output: "export" as const, basePath, trailingSlash: true, env: { NEXT_PUBLIC_BASE_PATH: basePath } }
    : {}),
  poweredByHeader: false,
  reactCompiler: true,
  ...(staticExport ? {} : { headers: async () => [{ source: "/(.*)", headers }] }),
  cacheComponents: !staticExport,
  partialPrefetching: !staticExport,
  images: {
    ...(staticExport ? { loader: "custom" as const, loaderFile: "./src/shared/lib/image-loader.ts" } : {}),
    // 게임 표지는 avocado 데이터의 BoardGameGeek 원본을 Next.js가 크기에 맞게 줄여서 보낸다.
    remotePatterns: [new URL("https://cf.geekdo-images.com/**")],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

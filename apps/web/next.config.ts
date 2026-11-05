import { securityHeaders } from "@avocado/config/security-headers";
import type { NextConfig } from "next";

// 게임 표지는 Next.js 이미지 최적화를 거쳐 같은 주소에서 나간다.
const headers = securityHeaders();

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactCompiler: true,
  headers: async () => [{ source: "/(.*)", headers }],
  cacheComponents: true,
  partialPrefetching: true,
  images: {
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

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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

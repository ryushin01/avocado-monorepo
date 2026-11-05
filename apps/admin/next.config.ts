import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // PGlite는 자기 WASM·데이터 파일을 패키지 폴더에서 읽으므로 번들하지 않고 Node가 직접 불러오게 한다.
  serverExternalPackages: ["@electric-sql/pglite"],
  partialPrefetching: true,
  experimental: {
    authInterrupts: true,
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

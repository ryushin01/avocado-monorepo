import { securityHeaders } from "@avocado/config/security-headers";
import type { NextConfig } from "next";

// 관리자가 원본 이미지 주소(http·https)를 직접 입력할 수 있다.
const headers = securityHeaders({ imgSrc: ["http:", "https:"] });

const nextConfig: NextConfig = {
  poweredByHeader: false,
  headers: async () => [{ source: "/(.*)", headers }],
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

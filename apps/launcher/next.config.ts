import { securityHeaders } from "@avocado/config/security-headers";
import type { NextConfig } from "next";

// 게임 표지는 백오피스의 썸네일이거나 관리자가 입력한 원본 주소(http·https)다.
const headers = securityHeaders({ imgSrc: ["http:", "https:"] });

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactCompiler: true,
  headers: async () => [{ source: "/(.*)", headers }],
  cacheComponents: true,
  partialPrefetching: true,
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

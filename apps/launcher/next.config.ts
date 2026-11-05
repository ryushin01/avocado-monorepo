import { securityHeaders } from "@avocado/config/security-headers";
import type { NextConfig } from "next";

// 게임 썸네일은 백오피스 주소에서 불러온다. 설정값은 빌드 때 읽는다.
const headers = securityHeaders({
  imgSrc: [new URL(process.env.BACKOFFICE_URL ?? "http://localhost:3000").origin],
});

const nextConfig: NextConfig = {
  poweredByHeader: false,
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

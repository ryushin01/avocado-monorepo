import { securityHeaders } from "@avocado/config/security-headers";
import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";

// 관리자가 원본 이미지 주소(http·https)를 직접 입력할 수 있다.
const headers = securityHeaders({ imgSrc: ["http:", "https:"] });

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactCompiler: true,
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

export default withSentryConfig(nextConfig, {
  // 브라우저는 같은 주소(/monitoring)로만 보낸다. CSP의 connect-src 'self'를 넓히지 않아도 된다.
  tunnelRoute: "/monitoring",
  silent: true,
  telemetry: false,
  // 소스맵 올리기는 SENTRY_AUTH_TOKEN이 있을 때만 동작한다.
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
});

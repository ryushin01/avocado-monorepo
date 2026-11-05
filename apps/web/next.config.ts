import { securityHeaders } from "@avocado/config/security-headers";
import { withSentryConfig } from "@sentry/nextjs/config";
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

export default withSentryConfig(nextConfig, {
  // 방문자 브라우저는 같은 주소로만 보낸다. CSP의 connect-src 'self'를 넓히지 않아도 되고 광고 차단기에도 덜 막힌다.
  tunnelRoute: "/monitoring",
  silent: true,
  telemetry: false,
  // 소스맵 올리기는 SENTRY_AUTH_TOKEN이 있을 때만 동작한다.
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
});

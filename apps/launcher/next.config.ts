import { securityHeaders } from "@avocado/config/security-headers";
import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";

// 게임 표지는 백오피스의 썸네일이거나 관리자가 입력한 원본 주소(http·https)다.
const headers = securityHeaders({ imgSrc: ["http:", "https:"] });

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactCompiler: true,
  headers: async () => [
    { source: "/(.*)", headers },
    // 서비스 워커는 늘 새로 받아(캐시 금지) 고친 내용이 바로 키오스크에 닿게 한다.
    {
      source: "/sw.js",
      headers: [
        { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
      ],
    },
  ],
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // 태블릿의 인터넷이 끊겨도 화면 이동·서버 액션을 실패로 끝내지 않고, 다시 연결되면 이어서 보낸다.
    // 끊긴 동안은 OfflineNotice(useOffline)가 알린다. 새로 여는 페이지는 서비스 워커(public/sw.js)가 맡는다.
    useOffline: true,
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

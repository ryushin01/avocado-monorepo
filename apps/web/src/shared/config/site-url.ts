/** 절대 주소가 필요한 곳(공유 정보, sitemap, robots)의 사이트 주소. SITE_URL이 먼저이고, 없으면 Vercel이 넣어 주는 운영 주소를 쓴다. */
export function siteUrl() {
  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const url = process.env.SITE_URL || (vercelHost ? `https://${vercelHost}` : "http://localhost:3002");
  // 뒤에 "/about"처럼 붙이므로 끝의 슬래시는 뺀다.
  return url.replace(/\/+$/, "");
}

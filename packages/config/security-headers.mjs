// 세 앱이 함께 쓰는 보안 헤더. next.config의 headers()에서 쓴다.
//
// script-src에 'unsafe-inline'이 남는 이유: 인라인 스크립트를 막는 nonce 방식은 모든 페이지를 동적으로
// 렌더링해야 하고 Partial Prefetching과 함께 쓸 수 없다(Next.js CSP 문서). 그래서 외부 스크립트와
// 프레임 삽입, base·form 변조를 막는 데까지만 적용한다.

/** @param {{ imgSrc?: string[] }} [options] imgSrc: 'self' 외에 이미지를 불러올 곳 */
export function securityHeaders({ imgSrc = [] } = {}) {
  const dev = process.env.NODE_ENV === "development";
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src ${["'self'", "data:", "blob:", ...imgSrc].join(" ")}`,
    "font-src 'self' data:",
    `connect-src 'self'${dev ? " ws:" : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");

  return [
    { key: "Content-Security-Policy", value: csp },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    // 브라우저는 HTTPS 응답에서만 따른다. 같은 도메인의 다른 서비스에 영향이 없도록 하위 도메인은 넣지 않는다.
    { key: "Strict-Transport-Security", value: "max-age=31536000" },
  ];
}

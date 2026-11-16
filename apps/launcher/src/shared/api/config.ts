import "server-only";

const production = process.env.NODE_ENV === "production";

/**
 * 이 키오스크가 읽을 백오피스와 매장. 매장마다 환경 변수로 정한다(.env.example 참고).
 * 개발 중에는 비어 있으면 로컬 백오피스·강남점을 쓰지만, 운영에서는 기본값을 쓰지 않는다.
 * 빠뜨린 채 띄운 키오스크가 엉뚱한 매장이나 주소를 읽지 않게 하고, 무엇이 빠졌는지는 로그로 남긴다(backoffice.ts).
 */
export const LAUNCHER_CONFIG = {
  backofficeUrl: process.env.BACKOFFICE_URL || (production ? "" : "http://localhost:3000"),
  cafeId: process.env.LAUNCHER_CAFE_ID || (production ? "" : "c_gangnam"),
  /** 이 기기의 키오스크 토큰 (백오피스 매장 관리에서 발급, 그 매장에서만 쓸 수 있음) */
  apiToken: process.env.KIOSK_API_TOKEN ?? "",
};

/** 운영에서 빠진 설정의 환경 변수 이름. 개발 중에는 늘 빈 배열 */
export function missingLauncherConfig(): string[] {
  if (!production) return [];
  const { backofficeUrl, cafeId, apiToken } = LAUNCHER_CONFIG;
  return [
    ["BACKOFFICE_URL", backofficeUrl],
    ["LAUNCHER_CAFE_ID", cafeId],
    ["KIOSK_API_TOKEN", apiToken],
  ].flatMap(([name, value]) => (value ? [] : [name]));
}

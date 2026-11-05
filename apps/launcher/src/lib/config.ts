import "server-only";

/** 이 키오스크가 읽을 백오피스와 매장. 매장마다 환경 변수로 정한다(.env.example 참고). */
export const LAUNCHER_CONFIG = {
  backofficeUrl: process.env.BACKOFFICE_URL ?? "http://localhost:3000",
  cafeId: process.env.LAUNCHER_CAFE_ID ?? "c_gangnam",
  /** 이 기기의 키오스크 토큰 (백오피스 매장 관리에서 발급, 그 매장에서만 쓸 수 있음) */
  apiToken: process.env.KIOSK_API_TOKEN ?? "",
};

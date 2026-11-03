import "server-only";

/** 이 키오스크가 읽을 백오피스와 매장. 매장마다 환경 변수로 정한다(.env.example 참고). */
export const LAUNCHER_CONFIG = {
  backofficeUrl: process.env.BACKOFFICE_URL ?? "http://localhost:3000",
  cafeId: process.env.LAUNCHER_CAFE_ID ?? "c_gangnam",
};

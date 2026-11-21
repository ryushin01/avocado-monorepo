// 서버 컴포넌트(화면)가 읽는 백오피스 키오스크 API. server-only라 클라이언트 컴포넌트에서는 가져올 수 없다.
export { fetchCafeGames, fetchCafeGamesOrSnapshot, fetchWaitlist, type ApiResult } from "./backoffice";

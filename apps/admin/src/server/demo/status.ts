import "server-only";

// 화면(앱 층)이 공개 데모의 DB 대체 여부를 읽는 곳. DB 연결 세부는 src/db/server.ts에 있다.
export { isDemoDbOffline } from "@/db/server";

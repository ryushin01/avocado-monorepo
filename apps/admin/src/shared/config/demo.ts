/**
 * 공개 데모 배포 설정. Vercel 데모 프로젝트에만 NEXT_PUBLIC_DEMO_MODE=1을 넣는다.
 * 켜면 개발용 시드로 시작하고 정해 둔 간격마다 처음 상태로 되돌린다. DB는 DATABASE_URL(데모 전용 Neon)이 있으면
 * 모든 함수가 그 PostgreSQL을 함께 쓰고, 없으면 메모리 DB(PGlite) 하나를 함께 쓴다(src/db/server.ts).
 * 로그인 화면의 데모 계정 버튼과 화면 위쪽 데모 안내를 보여 준다.
 * NEXT_PUBLIC_ 이름이라 Turborepo 빌드(엄격 모드)에도 그대로 전달된다.
 */
export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "1";
}

/** 방문자가 바꾼 데모 데이터를 처음 상태로 되돌리는 간격(분). 메모리 DB는 서버가 쉬었다 다시 켜질 때도 처음 상태가 된다. */
export const DEMO_RESET_MINUTES = 30;

/** 함께 보는 키오스크 데모 주소 (없으면 링크를 숨긴다) */
export function demoKioskUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_DEMO_KIOSK_URL || undefined;
}

/**
 * 공개 데모 배포 설정. Vercel 데모 프로젝트에만 NEXT_PUBLIC_DEMO_MODE=1을 넣는다.
 * 켜면 화면 위쪽에 데모 안내와 함께 보는 백오피스 데모 링크를 보여 준다.
 * NEXT_PUBLIC_ 이름이라 Turborepo 빌드(엄격 모드)에도 그대로 전달된다.
 */
export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "1";
}

/** 함께 보는 백오피스 데모 주소 (없으면 링크를 숨긴다) */
export function demoBackofficeUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_DEMO_BACKOFFICE_URL || undefined;
}

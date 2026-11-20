// 브라우저에서 나중에 받는 Sentry 조각. 쓰는 함수만 다시 내보낸다.
// 패키지 전체를 import()하면 쓰지 않는 기능(리플레이·피드백 등)까지 이 조각에 들어간다.
export { captureException, init, withScope } from "@sentry/nextjs";

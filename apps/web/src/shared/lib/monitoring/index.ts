import { sentryOptions, withoutVisitorTracking } from "@/shared/config/sentry";

type SentryModule = typeof import("./sentry");

/** Sentry를 받기 전에 모아 둘 오류 수. 오류가 반복돼도 메모리를 계속 쓰지 않게 한다. */
const MAX_EARLY_ERRORS = 20;

let sentry: Promise<SentryModule | null> | null = null;
let ready: SentryModule | null = null;
/** Sentry를 받는 동안 난 오류. type이 있으면 전역 처리기가 잡은 처리되지 않은 오류다. */
const early: { error: unknown; type?: string }[] = [];
const keep = (error: unknown, type?: string) => {
  if (early.length < MAX_EARLY_ERRORS) early.push({ error, type });
};

/**
 * DSN이 있을 때만 Sentry를 첫 화면 뒤(load 이후 한가할 때)에 따로 받는다. DSN이 없는 배포(로컬, 미리보기)는 받지 않는다.
 * 받는 동안 난 오류는 MAX_EARLY_ERRORS까지 모았다가 처리되지 않은 오류로 보낸다.
 */
export function initMonitoring() {
  if (!sentryOptions.enabled || sentry || typeof window === "undefined") return;
  const onError = (event: ErrorEvent) => keep(event.error ?? event.message, "onerror");
  const onRejection = (event: PromiseRejectionEvent) => keep(event.reason, "onunhandledrejection");
  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);
  const stopBuffering = () => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
  };
  sentry = afterFirstPaint()
    .then(() => import("./sentry"))
    .then((Sentry) => {
      Sentry.init({ ...sentryOptions, integrations: withoutVisitorTracking });
      stopBuffering();
      ready = Sentry;
      for (const { error, type } of early.splice(0)) {
        if (type) captureUnhandled(Sentry, error, type);
        else Sentry.captureException(error);
      }
      return Sentry;
    })
    // Sentry를 받지 못해도 사이트는 그대로 돈다. 모아 둔 오류는 버리고, 원인은 개발자 도구에 남긴다.
    .catch((error: unknown) => {
      console.warn("오류 모니터링(Sentry)을 불러오지 못했습니다.", error);
      stopBuffering();
      early.length = 0;
      return null;
    });
}

/**
 * 페이지를 다 받은 뒤(load) 브라우저가 한가할 때 풀린다. 첫 화면을 그리는 동안 Sentry를 받느라 대역폭을 나눠 쓰지 않게 한다.
 * requestIdleCallback이 없는 브라우저(Safari 등)는 바로 다음 차례에 푼다. load가 10초 안에 오지 않으면 그때 바로 푼다.
 */
function afterFirstPaint(): Promise<void> {
  return new Promise((resolve) => {
    const idle = () =>
      "requestIdleCallback" in window
        ? window.requestIdleCallback(() => resolve(), { timeout: 3000 })
        : setTimeout(resolve, 0);
    if (document.readyState === "complete") idle();
    else {
      window.addEventListener("load", idle, { once: true });
      // 끝나지 않는 요청(스트림, 멈춘 이미지 등)이 load를 붙잡아도 10초가 지나면 바로 받기 시작한다.
      setTimeout(resolve, 10_000);
    }
  });
}

/** 오류 화면(error.tsx)이 받은 오류를 보낸다. Sentry를 받는 중이면 한도 안에서 모아 두었다가 보낸다. */
export function captureException(error: unknown) {
  if (!sentryOptions.enabled) return;
  if (ready) {
    ready.captureException(error);
    return;
  }
  initMonitoring();
  if (sentry) keep(error);
}

/** 전역 처리기가 잡은 것처럼 '처리되지 않은 오류'로 표시해 보낸다. (captureException은 기본으로 handled: true) */
function captureUnhandled(Sentry: SentryModule, error: unknown, type: string) {
  Sentry.withScope((scope) => {
    scope.addEventProcessor((event) => {
      for (const value of event.exception?.values ?? []) value.mechanism = { type, handled: false };
      return event;
    });
    Sentry.captureException(error);
  });
}

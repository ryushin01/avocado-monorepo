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
 * DSN이 있을 때만 Sentry를 첫 화면 뒤에 따로 받는다. DSN이 없는 배포(로컬, 미리보기)는 받지 않는다.
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
  sentry = import("./sentry")
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
    // Sentry를 받지 못해도 사이트는 그대로 돈다. 모아 둔 오류는 버린다.
    .catch(() => {
      stopBuffering();
      early.length = 0;
      return null;
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

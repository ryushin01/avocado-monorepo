import { withoutVisitorTracking, type SentryOptions } from "./options";

type SentryModule = typeof import("./sentry");

/** Sentry를 받기 전에 모아 둘 오류 수. 오류가 반복돼도 메모리를 계속 쓰지 않게 한다. */
const MAX_EARLY_ERRORS = 20;
/** Sentry를 받지 못했을 때 다시 받기까지 기다리는 시간. 실패할 때마다 두 배로 늘리고 10분을 넘기지 않는다. */
const RETRY_BASE_MS = 30_000;
const RETRY_MAX_MS = 10 * 60_000;

/**
 * 브라우저 오류 모니터링. 앱마다 한 번 만들어(shared의 monitoring) instrumentation-client.ts와 오류 화면에서 쓴다.
 * DSN이 있을 때만 Sentry를 첫 화면 뒤(load 이후 한가할 때)에 따로 받아, 첫 화면의 자바스크립트를 늘리지 않는다.
 */
export function createMonitoring(sentryOptions: SentryOptions) {
  let sentry: Promise<SentryModule | null> | null = null;
  let ready: SentryModule | null = null;
  let failures = 0;
  let retryAt = 0;
  /** Sentry를 받는 동안 난 오류. type이 있으면 전역 처리기가 잡은 처리되지 않은 오류다. */
  const early: { error: unknown; type?: string }[] = [];
  const keep = (error: unknown, type?: string) => {
    if (early.length < MAX_EARLY_ERRORS) early.push({ error, type });
  };

  /** 받는 동안 난 오류는 MAX_EARLY_ERRORS까지 모았다가 처리되지 않은 오류로 보낸다. DSN이 없으면 아무것도 하지 않는다. */
  function initMonitoring() {
    if (!sentryOptions.enabled || sentry || typeof window === "undefined" || Date.now() < retryAt) return;
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
        failures = 0;
        ready = Sentry;
        for (const { error, type } of early.splice(0)) {
          if (type) captureUnhandled(Sentry, error, type);
          else Sentry.captureException(error);
        }
        return Sentry;
      })
      // Sentry를 받지 못해도 화면은 그대로 돈다. 모아 둔 오류는 버리고, 원인은 개발자 도구에 남긴다.
      // 일시적인 연결 끊김일 수 있으므로 간격을 두고 다시 받는다(키오스크는 하루 종일 켜져 있다).
      .catch((error: unknown) => {
        console.warn("오류 모니터링(Sentry)을 불러오지 못했습니다.", error);
        stopBuffering();
        early.length = 0;
        failures += 1;
        const delay = Math.min(RETRY_BASE_MS * 2 ** (failures - 1), RETRY_MAX_MS);
        retryAt = Date.now() + delay;
        sentry = null;
        setTimeout(initMonitoring, delay);
        return null;
      });
  }

  /** 오류 화면(error.tsx)이 받은 오류를 보낸다. Sentry를 받는 중이면 한도 안에서 모아 두었다가 보낸다. */
  function captureException(error: unknown) {
    if (!sentryOptions.enabled) return;
    if (ready) {
      ready.captureException(error);
      return;
    }
    initMonitoring();
    if (sentry) keep(error);
  }

  return { initMonitoring, captureException };
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
      // 끝나지 않는 요청(스트림, 멈춘 이미지 등)이 load를 붙잡아도 10초가 지나면 바로 받기 시작한다.
      // load가 먼저 오면 이 기한을 거두고 한가할 때를 기다린다.
      const deadline = setTimeout(resolve, 10_000);
      const onLoad = () => {
        clearTimeout(deadline);
        idle();
      };
      window.addEventListener("load", onLoad, { once: true });
    }
  });
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

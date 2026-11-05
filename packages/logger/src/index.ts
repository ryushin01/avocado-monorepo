// 서버 오류를 한 줄 JSON으로 표준 오류에 남긴다. 호스팅의 로그 수집기가 그대로 읽을 수 있다.
// 손님 전화번호·토큰·쿠키가 로그에 남지 않게 요청 헤더와 쿼리 문자열은 기록하지 않는다.

type Fields = Record<string, unknown>;

/** Drizzle 오류 메시지의 "params: ..."에는 전화번호 같은 실제 값이 들어 있어 지운다. 줄바꿈이 든 값도 함께 지운다. */
export function redactSecrets(text: string) {
  return text.replace(/\nparams: [\s\S]*?(?=\n\s+at |$)/g, "\nparams: [생략]");
}

/** /api/kiosk/games?phone4=1234 → /api/kiosk/games */
export const stripQuery = (path: string) => path.split("?")[0];

function describeError(error: unknown): Fields {
  if (!(error instanceof Error)) return { message: redactSecrets(String(error)) };
  const cause = error.cause as { message?: unknown; code?: unknown } | undefined;
  const digest = (error as { digest?: unknown }).digest;
  return {
    name: error.name,
    message: redactSecrets(error.message),
    stack: error.stack ? redactSecrets(error.stack) : undefined,
    digest: typeof digest === "string" ? digest : undefined,
    cause: typeof cause?.message === "string" ? redactSecrets(cause.message) : undefined,
    causeCode: typeof cause?.code === "string" ? cause.code : undefined,
  };
}

function redactError(error: Error) {
  const copy = new Error(redactSecrets(error.message));
  copy.name = error.name;
  copy.stack = error.stack ? redactSecrets(error.stack) : undefined;
  // 원인 오류는 값이 담긴 속성(detail 등)이 있을 수 있어 메시지만 옮긴다.
  const cause = error.cause as { message?: unknown } | undefined;
  if (typeof cause?.message === "string") copy.cause = redactSecrets(cause.message);
  const digest = (error as { digest?: unknown }).digest;
  return digest === undefined ? copy : Object.assign(copy, { digest });
}

/**
 * Next.js가 서버 오류를 직접 console.error로 출력할 때도 쿼리 값을 가린다.
 * instrumentation.ts의 register에서 한 번 부른다.
 */
export function redactConsoleErrors() {
  const original = console.error;
  console.error = (...args: unknown[]) => {
    original(
      ...args.map((arg) => {
        if (arg instanceof Error) return redactError(arg);
        return typeof arg === "string" ? redactSecrets(arg) : arg;
      }),
    );
  };
}

export function logError(service: string, event: string, fields: Fields = {}) {
  const { error, ...rest } = fields;
  console.error(
    JSON.stringify({
      level: "error",
      time: new Date().toISOString(),
      service,
      event,
      ...rest,
      ...(error === undefined ? {} : describeError(error)),
    }),
  );
}

/** instrumentation.ts의 onRequestError에서 부른다. digest는 오류 화면의 오류 번호와 같다. */
export function logRequestError(
  service: string,
  error: unknown,
  request: { path: string; method: string },
  context: { routePath?: string; routeType?: string; renderSource?: string },
) {
  logError(service, "request_error", {
    method: request.method,
    path: stripQuery(request.path),
    routePath: context.routePath,
    routeType: context.routeType,
    renderSource: context.renderSource,
    error,
  });
}

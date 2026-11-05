import { logRequestError } from "@avocado/logger";
import type { Instrumentation } from "next";

/** 서버에서 잡힌 오류를 남긴다. 외부 모니터링을 붙일 때도 여기서 보낸다. */
export const onRequestError: Instrumentation.onRequestError = (error, request, context) => {
  logRequestError("launcher", error, request, context);
};

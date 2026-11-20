import type { ErrorEvent } from "@sentry/nextjs";
import { describe, expect, it } from "vitest";

import { createSentryOptions, scrubBreadcrumb, scrubEvent, withoutVisitorTracking } from "./options";

const DSN = "https://key@example.ingest.sentry.io/1";

describe("createSentryOptions", () => {
  it("DSN이 있을 때만 보내고, 앱 이름을 태그로 붙인다", () => {
    expect(createSentryOptions({ dsn: undefined, service: "admin" }).enabled).toBe(false);
    expect(createSentryOptions({ dsn: "", service: "admin" }).enabled).toBe(false);
    const options = createSentryOptions({ dsn: DSN, service: "launcher" });
    expect(options.enabled).toBe(true);
    expect(options.initialScope).toEqual({ tags: { service: "launcher" } });
  });

  it("방문자 정보를 모으지 않는다", () => {
    expect(createSentryOptions({ dsn: DSN, service: "web" }).dataCollection).toMatchObject({
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
    });
  });
});

describe("scrubEvent", () => {
  it("오류 내용이 아닌 콜백 인수·거부 객체의 필드·주소의 쿼리와 # 뒤는 지운다", () => {
    expect(
      scrubEvent({
        type: undefined,
        extra: { arguments: ["입력"], __serialized__: { email: "a@b.c" }, other: 1 },
        request: { url: "https://a.b/menu?q=김철수#token" },
      }),
    ).toEqual({ type: undefined, extra: { other: 1 }, request: { url: "https://a.b/menu" } });
  });

  it("요청의 헤더·쿠키·본문·쿼리와 사용자 정보를 지운다", () => {
    const event = scrubEvent({
      type: undefined,
      user: { id: "u1", email: "a@b.c" },
      request: { url: "https://a.b/x", headers: { cookie: "s" }, cookies: { s: "1" }, data: "phone=010", query_string: "phone4=1234" },
    } as ErrorEvent);
    expect(event).toEqual({ type: undefined, request: { url: "https://a.b/x" } });
  });

  it("DB 오류 메시지의 쿼리 값(손님 전화번호 등)을 가린다", () => {
    const event = scrubEvent({
      type: undefined,
      message: "Failed query: insert\nparams: 01012345678",
      exception: { values: [{ type: "Error", value: "Failed query: select\nparams: 01099998888,김철수" }] },
    });
    expect(event.message).toBe("Failed query: insert\nparams: [생략]");
    expect(event.exception?.values?.[0].value).toBe("Failed query: select\nparams: [생략]");
  });
});

describe("withoutVisitorTracking", () => {
  it("방문 세션과 브레드크럼만 뺀다", () => {
    const integrations = [{ name: "BrowserSession" }, { name: "Breadcrumbs" }, { name: "GlobalHandlers" }];
    expect(withoutVisitorTracking(integrations)).toEqual([{ name: "GlobalHandlers" }]);
  });
});

describe("scrubBreadcrumb", () => {
  it("콘솔 기록은 버린다(가리기 전 원문 인수가 들 수 있음)", () => {
    expect(scrubBreadcrumb({ category: "console", message: "params: 01012345678" })).toBeNull();
    expect(createSentryOptions({ dsn: DSN, service: "admin" }).beforeBreadcrumb).toBe(scrubBreadcrumb);
  });

  it("요청 기록의 주소에서 쿼리 문자열과 # 뒤를 뺀다", () => {
    const crumb = scrubBreadcrumb({
      category: "fetch",
      data: { method: "GET", url: "https://admin.example.com/api/kiosk/cafes/c_a/reservations?phone4=5678#x", status_code: 200 },
    });
    expect(crumb?.data).toEqual({ method: "GET", url: "https://admin.example.com/api/kiosk/cafes/c_a/reservations", status_code: 200 });
  });

  it("오류에 붙은 기록도 보내기 전에 거른다", () => {
    const event = {
      breadcrumbs: [
        { category: "console", message: "Failed query params: 01012345678" },
        { category: "fetch", data: { url: "https://admin.example.com/a?phone4=1234" } },
      ],
    } as ErrorEvent;
    expect(scrubEvent(event)?.breadcrumbs).toEqual([{ category: "fetch", data: { url: "https://admin.example.com/a" } }]);
  });
});

import { describe, expect, it } from "vitest";
import { z } from "zod";

import { formDataToObject, formError, parseVersion } from "./form";

describe("formDataToObject", () => {
  it("같은 이름이 여러 번 오면 배열로 모은다", () => {
    const fd = new FormData();
    fd.append("name", "아줄");
    fd.append("categories", "abstract");
    fd.append("categories", "family");
    expect(formDataToObject(fd)).toEqual({
      name: "아줄",
      categories: ["abstract", "family"],
    });
  });
});

describe("formError", () => {
  it("문자열은 폼 전체 오류, Zod 오류는 필드 오류로 만든다", () => {
    expect(formError({ a: "1" }, "권한 없음")).toEqual({
      status: "error",
      formError: "권한 없음",
      fieldErrors: {},
      values: { a: "1" },
    });
    const parsed = z.object({ a: z.number() }).safeParse({ a: "x" });
    const state = formError({ a: "x" }, parsed.error!);
    expect(state.status === "error" && Object.keys(state.fieldErrors)).toEqual(["a"]);
  });
});

describe("parseVersion", () => {
  it("1 이상의 정수만 버전으로 읽고, 없거나 잘못된 값은 null", () => {
    expect(parseVersion({ version: "3" })).toBe(3);
    expect(parseVersion({})).toBeNull();
    expect(parseVersion({ version: "" })).toBeNull();
    expect(parseVersion({ version: "0" })).toBeNull();
    expect(parseVersion({ version: "1.5" })).toBeNull();
    expect(parseVersion({ version: ["1", "2"] })).toBeNull();
  });
});

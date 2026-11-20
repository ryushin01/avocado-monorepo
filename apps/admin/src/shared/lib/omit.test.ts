import { describe, expect, it } from "vitest";

import { omit } from "./omit";

describe("omit", () => {
  it("고른 키만 뺀 복사본을 주고 원래 값은 그대로 둔다", () => {
    const original = { a: 1, b: "x", c: undefined };
    expect(omit(original, "b")).toEqual({ a: 1, c: undefined });
    expect(omit(original, "a", "c")).toEqual({ b: "x" });
    expect(original).toEqual({ a: 1, b: "x", c: undefined });
  });
});

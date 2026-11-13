import { describe, expect, it } from "vitest";

import { descriptionIdOf, errorIdOf, fieldA11y } from "./field-a11y";

describe("fieldA11y", () => {
  it("값이 맞으면 아무것도 붙이지 않는다", () => {
    expect(fieldA11y("cafe-name", false)).toEqual({
      "aria-invalid": undefined,
      "aria-errormessage": undefined,
      "aria-describedby": undefined,
    });
  });

  it("잘못된 값이면 aria-invalid와 오류 문구 연결을 붙인다", () => {
    expect(fieldA11y("cafe-name", true)).toEqual({
      "aria-invalid": true,
      "aria-errormessage": "cafe-name-error",
      "aria-describedby": "cafe-name-error",
    });
  });

  it("도움말은 늘 잇고, 오류가 있으면 도움말 뒤에 잇는다", () => {
    expect(fieldA11y("staff-password", false, { described: true })["aria-describedby"]).toBe(
      "staff-password-description",
    );
    expect(fieldA11y("staff-password", true, { described: true })["aria-describedby"]).toBe(
      "staff-password-description staff-password-error",
    );
  });

  it("짝이 되는 문구 id를 만든다", () => {
    expect(errorIdOf("a")).toBe("a-error");
    expect(descriptionIdOf("a")).toBe("a-description");
  });
});

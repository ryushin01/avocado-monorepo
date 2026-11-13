import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FormTextField } from "./form-text-field";

const formState = (errors: Record<string, string[]> = {}, values: Record<string, string> = {}) => ({
  text: (name: string) => values[name] ?? "",
  invalid: (name: string) => Boolean(errors[name]?.length),
  errors: (name: string) => errors[name]?.map((message) => ({ message })),
});

describe("FormTextField", () => {
  it("라벨로 칸을 찾을 수 있고, 처음에는 오류 속성을 붙이지 않는다", () => {
    render(<FormTextField formState={formState()} idPrefix="cafe" name="name" label="매장 이름" />);
    const input = screen.getByLabelText("매장 이름");
    expect(input).toHaveAttribute("id", "cafe-name");
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(input).not.toHaveAttribute("aria-describedby");
  });

  it("잘못된 값이면 입력한 값을 되살리고 오류 문구를 칸에 잇는다", () => {
    render(
      <FormTextField
        formState={formState({ phone: ["전화번호 형식이 아닙니다."] }, { phone: "02-12" })}
        idPrefix="cafe"
        name="phone"
        label="전화번호"
        type="tel"
      />,
    );
    const input = screen.getByLabelText("전화번호");
    expect(input).toHaveValue("02-12");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("전화번호 형식이 아닙니다.");
    expect(input).toHaveAttribute("aria-errormessage", "cafe-phone-error");
  });
});

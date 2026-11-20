import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FieldError } from "@avocado/ui/components/field";

import { FormErrorAlert } from "./form-error-alert";

// 화면 낭독기는 처음부터 있는 알림 영역의 내용이 바뀔 때 읽으므로, 오류가 없을 때도 영역을 둔다(자리는 차지하지 않음).
describe("알림 영역을 처음부터 둔다", () => {
  it("폼 오류(FormErrorAlert): 비어 있을 때도 같은 영역이 있고, 오류가 나면 그 안의 내용만 바뀐다", () => {
    const { rerender } = render(<FormErrorAlert />);
    const region = screen.getByRole("alert");
    expect(region).toHaveTextContent("");
    expect(region).toHaveClass("sr-only");

    rerender(<FormErrorAlert message="다른 직원이 먼저 이 예약을 바꿨습니다." />);
    expect(screen.getByRole("alert")).toBe(region);
    expect(region).toHaveTextContent("다른 직원이 먼저 이 예약을 바꿨습니다.");
    expect(region).not.toHaveClass("sr-only");
  });

  it("칸 오류(FieldError): 비어 있을 때도 id가 있는 영역이 있고, 오류가 나면 같은 영역에 보인다", () => {
    const { rerender } = render(<FieldError id="name-error" />);
    const region = screen.getByRole("alert");
    expect(region).toHaveAttribute("id", "name-error");
    expect(region).toHaveClass("sr-only");

    rerender(<FieldError id="name-error" errors={[{ message: "이름을 입력해주세요." }]} />);
    expect(screen.getByRole("alert")).toBe(region);
    expect(region).toHaveTextContent("이름을 입력해주세요.");
    expect(region).not.toHaveClass("sr-only");
  });
});

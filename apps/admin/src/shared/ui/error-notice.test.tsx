import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ErrorNotice } from "./error-notice";

afterEach(() => vi.restoreAllMocks());

describe("ErrorNotice", () => {
  it("오류 번호를 보여 주고, 다시 시도를 부른다", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const retry = vi.fn();
    render(<ErrorNotice error={Object.assign(new Error("x"), { digest: "123" })} retry={retry} />);

    expect(screen.getByText("오류 번호: 123")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it("Error가 아닌 값이어도 안내를 보여 주고, 오류 원문은 화면에 내지 않는다", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<ErrorNotice error="비밀 메시지" retry={() => {}} />);

    expect(screen.getByText("화면을 불러오지 못했습니다")).toBeInTheDocument();
    expect(screen.queryByText(/오류 번호/)).not.toBeInTheDocument();
    expect(screen.queryByText("비밀 메시지")).not.toBeInTheDocument();
  });

  it("이미 main 안에 그릴 때는 main을 겹치지 않는다", () => {
    const { container, rerender } = render(<ErrorNotice error={new Error("x")} retry={() => {}} />);
    expect(container.querySelector("main#main")).not.toBeNull();
    rerender(<ErrorNotice error={new Error("x")} retry={() => {}} insideMain />);
    expect(container.querySelector("main")).toBeNull();
  });
});

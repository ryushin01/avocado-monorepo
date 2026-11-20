import { fireEvent, render, screen } from "@testing-library/react";
import type { FormEvent } from "react";
import { describe, expect, it, vi } from "vitest";

import { Dialog, DialogContent } from "@avocado/ui/components/dialog";

import { DialogFormFooter } from "./dialog-form-footer";

const renderFooter = (props: { pending: boolean; disabled?: boolean }, onSubmit = (event: FormEvent) => event.preventDefault()) =>
  render(
    <Dialog open>
      <DialogContent>
        <form onSubmit={onSubmit}>
          <DialogFormFooter submitLabel="저장" {...props} />
        </form>
      </DialogContent>
    </Dialog>,
  );

describe("DialogFormFooter", () => {
  it("취소와 제출 버튼을 그리고, 막지 않을 때는 누르면 제출한다", () => {
    const submit = vi.fn((event: FormEvent) => event.preventDefault());
    renderFooter({ pending: false }, submit);
    expect(screen.getByRole("button", { name: "취소" })).toBeEnabled();
    const button = screen.getByRole("button", { name: "저장" });
    expect(button).not.toHaveAttribute("aria-disabled", "true");
    fireEvent.click(button);
    expect(submit).toHaveBeenCalledOnce();
  });

  it("처리 중이거나 막아 둘 때는 제출을 막고, 초점은 잃지 않게 한다(aria-disabled)", () => {
    const submit = vi.fn((event: FormEvent) => event.preventDefault());
    const { unmount } = renderFooter({ pending: true }, submit);
    const button = screen.getByRole("button", { name: "저장" });
    expect(button).toHaveAttribute("aria-disabled", "true");
    button.focus();
    expect(button).toHaveFocus();
    fireEvent.click(button);
    expect(submit).not.toHaveBeenCalled();
    unmount();

    renderFooter({ pending: false, disabled: true }, submit);
    expect(screen.getByRole("button", { name: "저장" })).toHaveAttribute("aria-disabled", "true");
  });
});

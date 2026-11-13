import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Dialog, DialogContent } from "@avocado/ui/components/dialog";

import { DialogFormFooter } from "./dialog-form-footer";

const renderFooter = (props: { pending: boolean; disabled?: boolean }) =>
  render(
    <Dialog open>
      <DialogContent>
        <form>
          <DialogFormFooter submitLabel="저장" {...props} />
        </form>
      </DialogContent>
    </Dialog>,
  );

describe("DialogFormFooter", () => {
  it("취소와 제출 버튼을 그린다", () => {
    renderFooter({ pending: false });
    expect(screen.getByRole("button", { name: "취소" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "저장" })).toBeEnabled();
  });

  it("처리 중이거나 막아 둘 때는 제출을 막는다", () => {
    const { unmount } = renderFooter({ pending: true });
    expect(screen.getByRole("button", { name: "저장" })).toBeDisabled();
    unmount();
    renderFooter({ pending: false, disabled: true });
    expect(screen.getByRole("button", { name: "저장" })).toBeDisabled();
  });
});

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { InUseBadge, InventoryStatusBadge } from "./inventory-status-badge";

describe("InventoryStatusBadge", () => {
  it("상태를 한국어 이름으로 보여 준다", () => {
    render(<InventoryStatusBadge status="maintenance" />);
    expect(screen.getByText("점검 중")).toBeInTheDocument();
  });
});

describe("InUseBadge", () => {
  it("이용 중인 박스 수를 보여 준다", () => {
    render(<InUseBadge count={2} />);
    expect(screen.getByText("이용 중 2")).toBeInTheDocument();
  });

  it("이용 중인 박스가 없으면 그리지 않는다", () => {
    const { container } = render(<InUseBadge count={0} />);
    expect(container).toBeEmptyDOMElement();
  });
});

import { describe, expect, it } from "vitest";

import { describeInventoryChange } from "./describe-change";

describe("describeInventoryChange", () => {
  it("바뀐 값만 적는다", () => {
    expect(
      describeInventoryChange({ quantity: 3, status: "available" }, { quantity: 5, status: "available" }),
    ).toBe("수량 3개 → 5개");
    expect(
      describeInventoryChange({ quantity: 3, status: "available" }, { quantity: 5, status: "maintenance" }),
    ).toBe("수량 3개 → 5개, 상태 이용 가능 → 점검 중");
  });

  it("바뀐 것이 없거나 이전 값을 모르면 적지 않는다", () => {
    const same = { quantity: 3, status: "available" } as const;
    expect(describeInventoryChange(same, same)).toBeUndefined();
    expect(describeInventoryChange(null, same)).toBeUndefined();
  });
});

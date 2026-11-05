import { expect, test } from "@playwright/test";

import { loginAs, USERS } from "./helpers";

test.describe("통계 (관리자)", () => {
  test("기간·매장을 바꾸면 주소와 설명이 바뀌고, 차트가 그려진다", async ({ page }) => {
    await page.goto("/stats");
    await expect(page.getByText(/전체 매장 · .*\(어제까지 28일\)/)).toBeVisible();
    await expect(page.getByTestId("kpi-tile")).toHaveCount(4);
    await expect(page.locator("[data-slot=chart] svg.recharts-surface").first()).toBeVisible();
    await expect(page.getByText("매장별 비교")).toBeVisible();

    await page.getByRole("combobox", { name: "기간" }).click();
    await page.getByRole("option", { name: "최근 7일" }).click();
    await expect(page).toHaveURL(/period=7/);
    await expect(page.getByText(/\(어제까지 7일\)/)).toBeVisible();

    await page.getByRole("combobox", { name: "매장" }).click();
    await page.getByRole("option", { name: "홍대점" }).click();
    await expect(page).toHaveURL(/period=7&cafe=c_hongdae/);
    await expect(page.getByText(/^홍대점 · /)).toBeVisible();
    // 매장 하나를 볼 때는 매장 비교가 없다.
    await expect(page.getByText("매장별 비교")).toHaveCount(0);
  });

  test("히트맵은 Tab 한 번으로 들어가 화살표로 칸을 옮긴다", async ({ page }) => {
    await page.goto("/stats");
    const grid = page.getByRole("grid", { name: "요일·시간대별 이용 시작 횟수" });
    await expect(grid.locator('[role=gridcell][tabindex="0"]')).toHaveCount(1);
    await grid.getByRole("gridcell").first().focus();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowRight");
    await expect(page.locator(":focus")).toHaveAttribute("aria-label", /^화요일 \d+시 \d+회$/);
  });
});

test.describe("통계 (스태프)", () => {
  test.beforeEach(async ({ context }) => loginAs(context, USERS.hongdaeStaff));

  test("소속 매장만 보이고 매장 선택이 없다", async ({ page }) => {
    await page.goto("/stats?cafe=c_gangnam");
    await expect(page.getByText(/^홍대점 · /)).toBeVisible();
    await expect(page.getByRole("combobox", { name: "매장" })).toHaveCount(0);
  });
});

import { expect, test } from "@playwright/test";

test("사이드바 메뉴로 페이지를 이동한다", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "대시보드" })).toBeVisible();

  await page.getByRole("link", { name: "보드게임", exact: true }).click();
  await expect(page).toHaveURL("/games");
  await expect(page.getByRole("heading", { name: "보드게임" })).toBeVisible();

  await page.getByRole("link", { name: "재고 관리" }).click();
  await expect(page).toHaveURL("/inventory");
  await expect(page.getByRole("heading", { name: /^재고 관리 · / })).toBeVisible();

  await page.getByRole("link", { name: "매장 관리" }).click();
  await expect(page).toHaveURL("/cafes");
  await expect(page.getByRole("heading", { name: "매장 관리" })).toBeVisible();
});

test("개발용 계정 전환으로 스태프 화면을 확인한다", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "김관리 계정 메뉴" }).click();
  await page.getByRole("menuitemradio", { name: "박스태프 (스태프)" }).click();

  await expect(page.getByRole("button", { name: "박스태프 계정 메뉴" })).toBeVisible();
  await expect(page.getByText("홍대점의 재고 현황입니다.")).toBeVisible();
  await expect(page.getByRole("link", { name: "매장 관리" })).toHaveCount(0);
});

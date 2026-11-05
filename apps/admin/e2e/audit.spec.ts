import { expect, test } from "@playwright/test";

import { loginAs, USERS } from "./helpers";

test("매장을 등록하면 변경 이력에 직원·작업·대상이 남는다", async ({ page }) => {
  const name = `이력${Date.now() % 100000}점`;
  await page.goto("/cafes");
  await page.getByRole("button", { name: "매장 등록" }).click();
  const dialog = page.getByRole("dialog", { name: "매장 등록" });
  await dialog.getByLabel("매장 이름").fill(name);
  await dialog.getByLabel("지역").fill("서울");
  await dialog.getByLabel("개점일").fill("2026-01-01");
  await dialog.getByRole("button", { name: "등록" }).click();
  await expect(page.getByText(`'${name}'을(를) 등록했습니다.`)).toBeVisible();

  await page.getByRole("link", { name: "변경 이력" }).click();
  await expect(page).toHaveURL("/audit");
  const row = page.getByRole("row").filter({ hasText: name });
  await expect(row).toContainText("김관리");
  await expect(row).toContainText("매장 등록");
});

test("스태프는 변경 이력 메뉴가 없고 주소로 들어가도 막힌다", async ({ context, page }) => {
  await loginAs(context, USERS.hongdaeStaff);
  await page.goto("/");
  await expect(page.getByRole("button", { name: "박스태프 계정 메뉴" })).toBeVisible();
  await expect(page.getByRole("link", { name: "변경 이력" })).toHaveCount(0);

  await page.goto("/audit");
  await expect(page.getByText("접근 권한이 없습니다")).toBeVisible();
});

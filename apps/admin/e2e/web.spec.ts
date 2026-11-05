import { expect, test } from "@playwright/test";

import { WEB_URL } from "./helpers";

// 홈페이지는 로그인이 없다.
test.use({ storageState: { cookies: [], origins: [] } });

test("홈에서 유형 목록을 거쳐 게임 상세까지 이동한다", async ({ page }) => {
  const violations: string[] = [];
  page.on("console", (message) => {
    if (message.text().includes("Content Security Policy")) violations.push(message.text());
  });

  await page.goto(WEB_URL);
  const strategy = page.getByRole("banner").getByRole("link", { name: "전략 게임" }).first();
  await expect(strategy).toBeVisible();
  // 공통 컴포넌트의 화면 낭독기 문구도 한국어다.
  await expect(page.getByRole("button", { name: "다음 슬라이드" }).first()).toBeVisible();

  await strategy.click();
  await expect(page).toHaveURL(/\/games\/[\w-]+/);
  await expect(page.getByRole("heading", { level: 1, name: "전략 게임" })).toBeVisible();

  const first = page.locator('main a[href^="/game/"]').first();
  await expect(first).toBeVisible();
  await first.click();
  await expect(page).toHaveURL(/\/game\/\d+/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText("플레이 인원")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "현재 위치" })).toBeVisible();

  expect(violations).toEqual([]);
});

test("없는 게임·유형·주소는 안내 화면에서 홈으로 돌아간다", async ({ page }) => {
  for (const path of ["/game/0", "/games/없는유형", "/없는-페이지"]) {
    await page.goto(`${WEB_URL}${path}`);
    await expect(page.getByText("페이지를 찾을 수 없습니다")).toBeVisible();
  }
  await page.getByRole("link", { name: "홈으로" }).click();
  await expect(page).toHaveURL(`${WEB_URL}/`);
});

test("홈페이지에도 보안 헤더가 있다", async ({ request }) => {
  const headers = (await request.get(WEB_URL)).headers();
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["x-powered-by"]).toBeUndefined();
});

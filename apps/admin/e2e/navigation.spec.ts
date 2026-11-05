import { expect, test } from "@playwright/test";

import { DEV_PASSWORD, LAUNCHER_URL, USERS, WEB_URL } from "./helpers";

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

test("로그아웃하고 스태프로 다시 로그인하면 소속 매장 화면만 보인다", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "김관리 계정 메뉴" }).click();
  await page.getByRole("menuitem", { name: "로그아웃" }).click();
  await expect(page).toHaveURL(/\/login/);

  await page.getByLabel("이메일").fill(USERS.hongdaeStaff.email);
  await page.getByLabel("비밀번호").fill(DEV_PASSWORD);
  await page.getByRole("button", { name: "로그인" }).click();

  await expect(page.getByRole("button", { name: "박스태프 계정 메뉴" })).toBeVisible();
  await expect(page.getByText("홍대점의 재고 현황입니다.")).toBeVisible();
  await expect(page.getByRole("link", { name: "매장 관리" })).toHaveCount(0);
});

test("사이드바 핸들을 드래그해 너비를 바꾸고, 새로고침해도 유지하며, 키보드로도 조절한다", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");

  const sidebar = page.locator('[data-slot="sidebar-container"]');
  const handle = page.getByRole("separator", { name: "사이드바 너비 조절" });
  await expect(sidebar).toBeVisible();
  const widthOf = async () => (await sidebar.boundingBox())!.width;
  await expect.poll(widthOf).toBe(256);

  const box = (await handle.boundingBox())!;
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width / 2, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 64, y, { steps: 4 });
  await page.mouse.up();
  await expect.poll(widthOf).toBe(320);
  // 드래그 끝의 click으로 접히면 안 된다.
  await expect(page.locator('[data-slot="sidebar"]')).toHaveAttribute("data-state", "expanded");

  await page.reload();
  await expect(sidebar).toBeVisible();
  await expect.poll(widthOf).toBe(320);

  await page.getByRole("separator", { name: "사이드바 너비 조절" }).focus();
  await page.keyboard.press("ArrowLeft");
  await expect.poll(widthOf).toBe(304);
  await page.keyboard.press("Home");
  await expect.poll(widthOf).toBe(192);
  await page.keyboard.press("End");
  await expect.poll(widthOf).toBe(384);

  // 드래그 없이 클릭하면 접힌다.
  await page.getByRole("separator", { name: "사이드바 너비 조절" }).click();
  await expect(page.locator('[data-slot="sidebar"]')).toHaveAttribute("data-state", "collapsed");
  await page.getByRole("button", { name: "사이드바 펼치기" }).click();
  await expect(page.locator('[data-slot="sidebar"]')).toHaveAttribute("data-state", "expanded");
  await expect.poll(widthOf).toBe(384);
});

test("접어 둔 사이드바는 새로고침해도 접혀 있고, 화면 스크립트가 돌기 전에도 접힌 모양이다", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  const sidebar = page.locator('[data-slot="sidebar"]');
  await expect(sidebar).toHaveAttribute("data-state", "expanded");

  await page.getByRole("button", { name: "사이드바 접기·펼치기" }).click();
  await expect(sidebar).toHaveAttribute("data-state", "collapsed");

  await page.reload();
  await expect(sidebar).toHaveAttribute("data-state", "collapsed");
  await expect(page.locator('[data-slot="sidebar-container"]')).toHaveCSS("width", "48px");

  // 번들을 막아 하이드레이션 없이 서버 HTML과 인라인 스크립트만으로 접힌 모양인지 본다.
  await page.route("**/_next/static/**/*.js", (route) => route.abort());
  await page.reload();
  await expect(sidebar).toHaveAttribute("data-state", "collapsed");
  await expect(sidebar).toHaveAttribute("data-collapsible", "icon");
  await page.unroute("**/_next/static/**/*.js");

  await page.reload();
  await page.getByRole("button", { name: "사이드바 접기·펼치기" }).click();
  await expect(sidebar).toHaveAttribute("data-state", "expanded");
  await page.reload();
  await expect(sidebar).toHaveAttribute("data-state", "expanded");
});

test("없는 주소는 안내 화면을 보여 주고 대시보드로 돌아간다", async ({ page }) => {
  const response = await page.goto("/없는-페이지");
  expect(response?.status()).toBe(404);
  await expect(page.getByText("페이지를 찾을 수 없습니다")).toBeVisible();
  await page.getByRole("link", { name: "대시보드로 이동" }).click();
  await expect(page).toHaveURL("/");
});

test.describe("본문 바로가기", () => {
  const pages = [
    ["백오피스", "/"],
    ["백오피스 없는 주소", "/no-such-page"],
    ["홈페이지", WEB_URL],
    ["홈페이지 게임 목록", `${WEB_URL}/games`],
    ["홈페이지 없는 주소", `${WEB_URL}/no-such-page`],
    ["매장 런처", LAUNCHER_URL],
    ["매장 런처 없는 주소", `${LAUNCHER_URL}/no-such-page`],
  ] as const;

  for (const [name, url] of pages) {
    test(`${name}: 첫 Tab에 나타나고 Enter로 본문에 초점이 간다`, async ({ page }) => {
      await page.goto(url);
      await expect(page.locator("main")).toBeVisible();
      await page.keyboard.press("Tab");
      const link = page.getByRole("link", { name: "본문 바로가기" });
      await expect(link).toBeFocused();
      await expect(link).toBeInViewport();
      await page.keyboard.press("Enter");
      await expect(page.locator("main#main")).toBeFocused();
    });
  }
});

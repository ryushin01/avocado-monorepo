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
  // 공통 컴포넌트의 화면 낭독기 문구도 한국어다.
  await expect(page.getByRole("button", { name: "다음 슬라이드" }).first()).toBeVisible();

  await page.getByRole("button", { name: "메뉴 열기" }).click();
  await page.getByRole("dialog").getByRole("link", { name: "전략 게임", exact: true }).click();
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

test("메뉴는 키보드로 열고 닫으며 초점이 버튼으로 돌아온다", async ({ page }) => {
  await page.goto(WEB_URL);
  const trigger = page.getByRole("button", { name: "메뉴 열기" });
  await trigger.focus();
  await page.keyboard.press("Enter");

  const menu = page.getByRole("dialog", { name: "사이트 메뉴" });
  await expect(menu.getByRole("link", { name: "전략 게임", exact: true })).toBeVisible();
  await expect(menu.locator(":focus")).toHaveCount(1);

  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("데스크톱에서 왼쪽 패널은 화면 높이로 고정되고 오른쪽만 스크롤된다", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const stuckTop = async (selector: string) => {
    // 목록은 스트리밍되므로 페이지가 길어질 때까지 다시 스크롤한다.
    await expect
      .poll(() =>
        page.evaluate(() => {
          window.scrollTo(0, 1500);
          return window.scrollY;
        }),
      )
      .toBeGreaterThan(1000);
    const box = await page.locator(selector).boundingBox();
    expect(box?.y).toBe(0);
    expect(box?.height).toBe(900);
  };

  await page.goto(WEB_URL);
  await stuckTop("#hero");

  await page.goto(`${WEB_URL}/games/strategy`);
  await stuckTop('header:has(a[href="/"])');
});

test("모바일에서 머리글은 사진을 지나면 흰 바탕이 되고 가로로 넘치지 않는다", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(WEB_URL);
  const banner = page.getByRole("banner");
  const background = () => banner.evaluate((el) => getComputedStyle(el).backgroundColor);
  const before = await background();
  await page.evaluate(() => window.scrollTo(0, 2000));
  await expect.poll(background).not.toBe(before);

  for (const path of ["", "/games/strategy", "/game/174430"]) {
    await page.goto(`${WEB_URL}${path}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, path).toBe(0);
  }
});

test("큰 사진의 자동 넘김을 멈추고 다시 켤 수 있다", async ({ page }) => {
  await page.goto(WEB_URL);
  const hero = page.locator("#hero");
  await hero.getByRole("button", { name: "자동 넘김 정지" }).click();
  await hero.getByRole("button", { name: "자동 넘김 재생" }).click();
  await expect(hero.getByRole("button", { name: "자동 넘김 정지" })).toBeVisible();
});

test("표지가 오기 전에는 스켈레톤을 보여 주고 오면 치운다", async ({ page }) => {
  let release = () => {};
  const arrived = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(/\/_next\/image\?url=https/, async (route) => {
    await arrived;
    await route.continue().catch(() => {}); // 테스트가 먼저 끝나면 남은 요청은 버려진다.
  });

  await page.goto(`${WEB_URL}/games/strategy`);
  const firstTile = page.locator('main a[href^="/game/"]').first();
  await expect(firstTile.getByTestId("game-image-skeleton")).toBeVisible();

  release();
  await expect(firstTile.getByTestId("game-image-skeleton")).toHaveCount(0);
  await expect(firstTile.locator("img").first()).toHaveJSProperty("complete", true);
});

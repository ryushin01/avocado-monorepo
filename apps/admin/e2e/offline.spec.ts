import AxeBuilder from "@axe-core/playwright";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

import { LAUNCHER_URL, WEB_URL } from "./helpers";

/**
 * 오프라인 검증: localhost 밖으로 나가는 브라우저 요청을 모두 끊은 채, 세 화면 축(홍보 사이트·백오피스·키오스크)의
 * 주요 화면이 내용과 함께 뜨는지 본다. 서버는 .env 없이 메모리 PGlite·개발용 시드로 뜬다(playwright.config.ts).
 * 글꼴·스크립트는 모두 같은 주소에서 나가야 하므로, 끊긴 요청이 하나라도 있으면 실패한다.
 * 게임 표지 원본(BoardGameGeek)은 서버의 이미지 최적화가 받으므로, 그 요청을 끊어 원본 서버 장애를 흉내 내고
 * 함께 배포한 썸네일로 대신하는지 확인한다.
 */
async function blockExternal(context: BrowserContext) {
  const blocked: string[] = [];
  await context.route(
    (url) => url.hostname !== "localhost" && url.hostname !== "127.0.0.1",
    (route) => {
      blocked.push(route.request().url());
      return route.abort("internetdisconnected");
    },
  );
  // 원본 표지 서버가 끊긴 상황: 최적화 경로 중 외부 원본을 가리키는 요청만 실패시킨다(로컬 썸네일은 그대로).
  await context.route(/\/_next\/image\?url=https?%3A%2F%2F/, (route) => route.abort("internetdisconnected"));
  return blocked;
}

/** `ignoreContrast`: 백오피스 개편 화면은 사용자 지시로 글자 대비(color-contrast)를 검사하지 않는다. 다른 규칙은 그대로 본다. */
async function expectNoViolations(page: Page, { ignoreContrast = false } = {}) {
  const axe = new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"]);
  if (ignoreContrast) axe.disableRules(["color-contrast"]);
  const { violations } = await axe.analyze();
  expect(
    violations.map((v) => ({ rule: v.id, impact: v.impact, targets: v.nodes.map((n) => n.html.slice(0, 160)) })),
  ).toEqual([]);
}

test.describe("오프라인 · 홍보 사이트", () => {
  test("홈·유형·게임 화면이 외부 요청 없이 내용과 함께 뜨고, 표지는 로컬 썸네일로 대신한다", async ({ context, page }) => {
    const blocked = await blockExternal(context);

    await page.goto(WEB_URL);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator('main a[href^="/game/"]').first()).toBeVisible();
    await expectNoViolations(page);

    await page.goto(`${WEB_URL}/games/strategy`);
    await expect(page.getByRole("heading", { level: 1, name: "전략 게임" })).toBeVisible();
    const firstTile = page.locator('main a[href^="/game/"]').first();
    await expect(firstTile.locator("img[data-fallback]")).toBeVisible();
    await expectNoViolations(page);

    await firstTile.click();
    await expect(page).toHaveURL(/\/game\/\d+/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText("플레이 인원")).toBeVisible();
    const cover = page.getByRole("img", { name: /표지$/ });
    await expect(cover).toHaveAttribute("data-fallback", "");
    await expect.poll(() => cover.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
    await expectNoViolations(page);

    expect(blocked).toEqual([]);
  });
});

test.describe("오프라인 · 백오피스", () => {
  test("로그인 화면", async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const blocked = await blockExternal(context);
    const page = await context.newPage();
    await page.goto("/login");
    await expect(page.getByLabel("이메일")).toBeVisible();
    await expectNoViolations(page, { ignoreContrast: true });
    expect(blocked).toEqual([]);
    await context.close();
  });

  for (const [name, path, heading] of [
    ["대시보드", "/", /^대시보드/],
    ["보드게임", "/games", /^보드게임/],
    ["예약·대기", "/reservations", /^예약·대기/],
  ] as const) {
    test(`${name} 화면이 시드 데이터와 함께 뜬다`, async ({ context, page }) => {
      const blocked = await blockExternal(context);
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
      if (path === "/") await expect(page.locator("svg.recharts-surface").first()).toBeVisible();
      if (path === "/games") await expect(page.locator("tbody tr").first()).toBeVisible();
      await expectNoViolations(page, { ignoreContrast: true });
      expect(blocked).toEqual([]);
    });
  }
});

test.describe("오프라인 · 키오스크", () => {
  test("처음 화면과 보유 게임 화면이 외부 요청 없이 뜬다", async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 1024, height: 900 } });
    const blocked = await blockExternal(context);
    const page = await context.newPage();

    await page.goto(LAUNCHER_URL);
    await expect(page.getByRole("heading", { name: "무엇을 도와드릴까요?" })).toBeVisible();
    await expect(page.getByText(/보유 게임 \d+종/)).toBeVisible();
    await expectNoViolations(page, { ignoreContrast: true });

    await page.goto(`${LAUNCHER_URL}/games`);
    await expect(page.getByRole("heading", { level: 1, name: /보유 게임$/ })).toBeVisible();
    await expect(page.getByTestId("kiosk-game").first()).toBeVisible();
    await expectNoViolations(page, { ignoreContrast: true });

    expect(blocked).toEqual([]);
    await context.close();
  });
});

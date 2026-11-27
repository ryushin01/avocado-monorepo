import { expect, test, type Page } from "@playwright/test";

import { blockExternal } from "./checks";
import { LAUNCHER_URL, USERS, WEB_URL } from "./helpers";

/**
 * 시각 회귀: 세 앱의 주요 화면을 데스크톱·모바일·키오스크 해상도로 찍어 기준 이미지(e2e/__screenshots__)와 비교한다.
 * 기준 이미지는 리눅스(Playwright 공식 Docker 이미지)에서 만들므로 이 검사는 그 안에서만 돈다(`pnpm check visual`).
 * 같은 결과가 나오도록 외부 요청을 끊어(표지는 로컬 썸네일) 움직임을 줄이고, 시각에 따라 바뀌는 글자(이용 현황 수 등)는 가린다.
 * 다른 E2E와 데이터를 섞지 않도록 visual 프로젝트만 새 서버로 따로 돌린다.
 */
const VIEWPORTS = {
  desktop: { width: 1280, height: 800 },
  mobile: { width: 390, height: 844 },
  kiosk: { width: 1280, height: 800 },
} as const;

test.use({ reducedMotion: "reduce", colorScheme: "light" });

async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await expect
    .poll(() => page.evaluate(() => [...document.images].every((img) => img.complete)))
    .toBe(true);
}

async function snap(page: Page, name: string, mask: ReturnType<Page["locator"]>[] = []) {
  await settle(page);
  await expect(page).toHaveScreenshot(`${name}.png`, { fullPage: true, mask, animations: "disabled", caret: "hide" });
}

test.describe("홍보 사이트", () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  for (const [size, viewport] of [
    ["desktop", VIEWPORTS.desktop],
    ["mobile", VIEWPORTS.mobile],
  ] as const) {
    test(`주요 화면 (${size})`, async ({ context, page }) => {
      await blockExternal(context);
      await page.setViewportSize(viewport);
      for (const [name, path] of [
        ["home", "/"],
        ["category", "/games/strategy"],
        ["game", "/game/174430"],
        ["about", "/about"],
        ["reservation", "/reservation"],
        ["not-found", "/없는-화면"],
      ] as const) {
        await page.goto(`${WEB_URL}${path}`);
        await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
        await snap(page, `web-${name}-${size}`);
      }
    });
  }
});

test.describe("백오피스", () => {
  for (const [size, viewport] of [
    ["desktop", VIEWPORTS.desktop],
    ["mobile", VIEWPORTS.mobile],
  ] as const) {
    test(`로그인 화면 (${size})`, async ({ browser }) => {
      const context = await browser.newContext({ storageState: { cookies: [], origins: [] }, viewport, reducedMotion: "reduce" });
      await blockExternal(context);
      const page = await context.newPage();
      await page.goto("/login");
      await expect(page.getByRole("button", { name: "로그인" })).toBeEnabled();
      await snap(page, `admin-login-${size}`);
      await context.close();
    });

    test(`보드게임·비밀번호 변경 화면 (${size})`, async ({ browser }) => {
      const context = await browser.newContext({ storageState: USERS.admin.storageState, viewport, reducedMotion: "reduce" });
      await blockExternal(context);
      const page = await context.newPage();
      await page.goto("/games");
      await expect(page.getByRole("heading", { level: 1, name: /^보드게임/ })).toBeVisible();
      await expect(size === "mobile" ? page.getByTestId("list-item").first() : page.locator("tbody tr").first()).toBeVisible();
      // 목록은 화면 근처만 그리므로 첫 화면만 찍는다.
      await settle(page);
      await expect(page).toHaveScreenshot(`admin-games-${size}.png`, { animations: "disabled", caret: "hide" });

      await page.goto("/password");
      await expect(page.getByLabel("지금 비밀번호")).toBeVisible();
      await snap(page, `admin-password-${size}`);
      await context.close();
    });
  }
});

test.describe("키오스크", () => {
  test.use({ storageState: { cookies: [], origins: [] }, viewport: VIEWPORTS.kiosk });

  test("처음·보유 게임·예약 확인·대기 등록 화면", async ({ context, page }) => {
    await blockExternal(context);
    // 이용 현황은 시각에 따라 바뀌므로 가린다.
    const live = () => [page.getByText(/지금 바로 이용 가능|이용 가능|이용 중|팀이 기다리고/)];

    await page.goto(LAUNCHER_URL);
    await expect(page.getByRole("heading", { name: "무엇을 도와드릴까요?" })).toBeVisible();
    await snap(page, "kiosk-home", live());

    await page.goto(`${LAUNCHER_URL}/games`);
    await expect(page.getByTestId("kiosk-game").first()).toBeVisible();
    await settle(page);
    await expect(page).toHaveScreenshot("kiosk-games.png", { mask: live(), animations: "disabled", caret: "hide" });

    await page.goto(`${LAUNCHER_URL}/reservation`);
    await expect(page.getByRole("button", { name: "1", exact: true })).toBeVisible();
    await snap(page, "kiosk-reservation");

    await page.goto(`${LAUNCHER_URL}/waitlist`);
    await page.getByRole("button", { name: "대기 등록하기" }).click();
    await expect(page.getByLabel("휴대전화")).toBeVisible();
    await snap(page, "kiosk-waitlist-form", live());
  });
});

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { LAUNCHER_URL, waitForMobileList } from "./helpers";

/**
 * 화면마다 axe로 자동 접근성 검사를 한다(WCAG 2.2 A·AA 규칙).
 * axe를 통과해도 KWCAG 준수는 아니므로, 새 화면은 키보드·화면 낭독기로 직접도 확인한다.
 * 홍보 사이트는 Lighthouse(접근성 100점)가 CI에서 따로 검사한다.
 */
/** `ignoreContrast`: 백오피스 개편 화면은 사용자 지시로 글자 대비(color-contrast)를 검사하지 않는다. 다른 규칙은 그대로 본다. */
async function expectNoViolations(page: Page, { ignoreContrast = false } = {}) {
  const axe = new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"]);
  if (ignoreContrast) axe.disableRules(["color-contrast"]);
  const { violations } = await axe.analyze();
  // 실패하면 규칙 id와 걸린 요소를 보여 준다.
  expect(
    violations.map((v) => ({ rule: v.id, impact: v.impact, targets: v.nodes.map((n) => n.html.slice(0, 160)) })),
  ).toEqual([]);
}

test.describe("백오피스 (관리자)", () => {
  const pages: [string, string, RegExp][] = [
    ["대시보드", "/", /^대시보드/],
    ["통계", "/stats", /^통계/],
    ["보드게임", "/games", /^보드게임/],
    ["재고 관리", "/inventory", /^재고 관리/],
    ["이용 기록", "/plays", /^이용 기록/],
    ["예약·대기", "/reservations", /^예약·대기/],
    ["매장 관리", "/cafes", /^매장 관리/],
    ["직원 관리", "/staff", /^직원 관리/],
    ["변경 이력", "/audit", /^변경 이력/],
    ["비밀번호 변경", "/password", /^비밀번호 변경/],
  ];
  for (const [name, path, heading] of pages) {
    test(`${name} 화면`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
      if (path === "/" || path === "/stats") await expect(page.locator("svg.recharts-surface").first()).toBeVisible();
      await expectNoViolations(page, { ignoreContrast: true });
    });
  }

  test("모바일 목록과 열린 대화상자", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/inventory");
    await waitForMobileList(page);
    await expectNoViolations(page, { ignoreContrast: true });

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/reservations?cafe=c_hongdae");
    await page.getByRole("button", { name: "예약 등록" }).click();
    await expect(page.getByRole("dialog", { name: "예약 등록" })).toBeVisible();
    await expectNoViolations(page, { ignoreContrast: true });
  });
});

test.describe("로그인 전", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("로그인 화면", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("button", { name: "로그인" })).toBeEnabled();
    await expectNoViolations(page, { ignoreContrast: true });
  });
});

test.describe("키오스크", () => {
  test.use({ storageState: { cookies: [], origins: [] }, viewport: { width: 1024, height: 900 } });

  test("시작·게임 둘러보기 화면", async ({ page }) => {
    await page.goto(LAUNCHER_URL);
    await expect(page.getByRole("heading", { name: "무엇을 도와드릴까요?" })).toBeVisible();
    await expectNoViolations(page);

    await page.goto(`${LAUNCHER_URL}/games`);
    await expect(page.getByRole("heading", { name: /보유 게임$/ })).toBeVisible();
    await expectNoViolations(page);
  });

  test("예약 확인·대기 등록 화면", async ({ page }) => {
    await page.goto(`${LAUNCHER_URL}/reservation`);
    await expect(page.getByRole("button", { name: "1", exact: true })).toBeVisible();
    await expectNoViolations(page);

    await page.goto(`${LAUNCHER_URL}/waitlist`);
    await expect(page.getByText(/팀이 기다리고 있습니다/)).toBeVisible();
    await expectNoViolations(page);
    await page.getByRole("button", { name: "대기 등록하기" }).click();
    await expect(page.getByLabel("휴대전화")).toBeVisible();
    await expectNoViolations(page);
  });
});

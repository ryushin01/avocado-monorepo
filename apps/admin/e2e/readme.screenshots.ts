import { expect, type Page, test } from "@playwright/test";

import { LAUNCHER_URL, waitForMobileList, WEB_URL } from "./helpers";

/**
 * README 화면 촬영 (pnpm --dir apps/admin screenshots)
 * 결과: 저장소 루트의 docs/images/*.jpg. 화면의 데이터는 모두 개발용 시드(가상 매장·가상 기록)입니다.
 * 평소 E2E(chromium 프로젝트)에는 들어가지 않습니다.
 */
const OUT = "../../docs/images";

// 변경 이력 화면을 만들려고 매장을 등록하므로, 다른 화면을 먼저 찍도록 차례로 실행합니다.
test.describe.configure({ mode: "serial" });

const shoot = async (page: Page, name: string) => {
  // 글꼴과 이미지를 다 받은 뒤 찍습니다.
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/${name}.jpg`, type: "jpeg", quality: 82 });
};

/** 텍스트가 있는 요소가 화면 위쪽(viewport 높이의 ratio)에 오도록 스크롤합니다. */
async function scrollToText(page: Page, text: string, ratio = 0.1) {
  await page.getByText(text, { exact: false }).first().evaluate((element, at) => {
    const top = element.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: top - window.innerHeight * at, behavior: "instant" });
  }, ratio);
  await page.waitForTimeout(1200);
}

test.describe("백오피스", () => {
  test.use({ storageState: "e2e/.auth/admin.json" });

  test.describe("데스크톱", () => {
    test.use({ viewport: { width: 1440, height: 1250 }, deviceScaleFactor: 1 });

    test("대시보드와 통계", async ({ page }) => {
      await page.goto("/");
      await expect(page.getByRole("heading", { name: "대시보드" })).toBeVisible();
      await shoot(page, "admin-dashboard");
      await page.goto("/stats");
      await expect(page.getByRole("heading", { name: "통계" })).toBeVisible();
      await shoot(page, "admin-stats");
    });
  });

  test.describe("데스크톱 900", () => {
    test.use({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });

    test("예약·재고·변경 이력", async ({ page }) => {
      await page.goto("/reservations?cafe=c_seomyeon");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await shoot(page, "admin-reservations");
      await page.goto("/inventory?cafe=c_seomyeon");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await shoot(page, "admin-inventory");
    });
  });

  test.describe("모바일", () => {
    test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

    test("재고 카드 목록", async ({ page }) => {
      await page.goto("/inventory?cafe=c_seomyeon");
      await waitForMobileList(page);
      await shoot(page, "admin-mobile");
    });
  });
});

test.describe("변경 이력", () => {
  test.use({ storageState: "e2e/.auth/admin.json", viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });

  test("매장 등록 뒤 남은 이력", async ({ page }) => {
    // 가상 매장 두 곳을 등록해 이력을 남깁니다(테스트용 메모리 DB라 실제 데이터에 남지 않음).
    for (const [name, region] of [
      ["광주 상무점", "광주"],
      ["제주 노형점", "제주"],
    ]) {
      await page.goto("/cafes");
      await page.getByRole("button", { name: "매장 등록" }).click();
      const dialog = page.getByRole("dialog", { name: "매장 등록" });
      await dialog.getByLabel("매장 이름").fill(name);
      await dialog.getByLabel("지역").fill(region);
      await dialog.getByLabel("개점일").fill("2026-11-01");
      await dialog.getByRole("button", { name: "등록" }).click();
      await expect(page.getByText(`'${name}'을(를) 등록했습니다.`)).toBeVisible();
    }
    await page.goto("/audit");
    await expect(page.getByRole("row").filter({ hasText: "제주 노형점" })).toBeVisible();
    await shoot(page, "admin-audit");
  });
});

test.describe("키오스크", () => {
  test.use({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 1 });

  test("시작 화면과 게임 목록", async ({ page }) => {
    await page.goto(LAUNCHER_URL);
    await shoot(page, "kiosk-home");
    await page.goto(`${LAUNCHER_URL}/games`);
    await shoot(page, "kiosk-games");
  });
});

test.describe("홍보 사이트", () => {
  test.use({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });

  test("홈과 소개", async ({ page }) => {
    await page.goto(WEB_URL);
    await shoot(page, "web-home");
    // 유형 소개 사이에서 화면 폭 가득 펼쳐지는 사진
    await page.getByAltText("붉은 용 피규어와 기사 피규어").first().evaluate((element) => {
      const rect = element.getBoundingClientRect();
      window.scrollTo({ top: rect.top + window.scrollY - window.innerHeight * 0.3, behavior: "instant" });
    });
    await page.waitForTimeout(2000);
    await shoot(page, "web-space");

    await page.goto(`${WEB_URL}/about`);
    await shoot(page, "web-about");
    await scrollToText(page, "매장 둘러보기", 0.05);
    await page.evaluate(() => window.scrollBy({ top: window.innerHeight * 1.2, behavior: "instant" }));
    await page.waitForTimeout(1500);
    await shoot(page, "web-tour");
  });
});

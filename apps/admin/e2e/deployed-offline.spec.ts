import { expect, test, type Page } from "@playwright/test";

import { blockExternal, expectNoViolations } from "./checks";
import { DEPLOYED_ADMIN_URL, DEPLOYED_LAUNCHER_URL, DEPLOYED_WEB_URL } from "./helpers";

/**
 * 배포본에서 외부가 끊겼을 때: 같은 프로덕션 빌드를 공개 데모 설정(NEXT_PUBLIC_DEMO_MODE=1)으로 따로 띄우고,
 * 공유 데모 DB(DATABASE_URL)와 백오피스 주소(BACKOFFICE_URL)를 아무도 듣지 않는 포트로 준다(playwright.config.ts).
 * 서버 쪽 외부 요청이 모두 실패해도 docs/demo.md의 '오프라인 동작' 표대로 대신 보여 주는지 본다.
 * 브라우저의 localhost 밖 요청도 함께 끊는다.
 */
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("배포본 · 공유 데모 DB가 끊긴 백오피스", () => {
  /** 로그인 화면의 데모 계정 버튼으로 들어간다. */
  async function enterDemo(page: Page) {
    await page.goto(`${DEPLOYED_ADMIN_URL}/login`);
    await page.getByRole("button", { name: /본사 관리자로 둘러보기/ }).click();
    await expect(page.getByRole("heading", { level: 1, name: /^대시보드/ })).toBeVisible();
  }

  test("데모 계정으로 들어가면 임시 데이터로 대시보드를 보여 주고 그렇다고 알린다", async ({ context, page }) => {
    const blocked = await blockExternal(context);
    await page.goto(`${DEPLOYED_ADMIN_URL}/login`);
    await expect(page.getByRole("button", { name: /본사 관리자로 둘러보기/ })).toBeVisible();
    await expectNoViolations(page, { ignoreContrast: true });
    await enterDemo(page);
    await expect(page.getByRole("status").filter({ hasText: "오프라인 데이터로 표시 중" })).toBeVisible();
    await expect(page.locator("svg.recharts-surface").first()).toBeVisible();
    await expectNoViolations(page, { ignoreContrast: true });
    expect(blocked).toEqual([]);
  });

  for (const [path, heading] of [
    ["/stats", /^통계/],
    ["/games", /^보드게임/],
    ["/inventory", /^재고 관리/],
    ["/plays", /^이용 기록/],
    ["/reservations", /^예약·대기/],
    ["/cafes", /^매장 관리/],
    ["/staff", /^직원 관리/],
    ["/audit", /^변경 이력/],
  ] as const) {
    test(`${path} 화면도 임시 데이터로 내용과 함께 뜬다`, async ({ context, page }) => {
      const blocked = await blockExternal(context);
      await enterDemo(page);
      await page.goto(`${DEPLOYED_ADMIN_URL}${path}`);
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
      if (path === "/reservations") await expect(page.getByRole("heading", { name: /^현장 대기 \d+팀$/ })).toBeVisible();
      else if (path === "/stats") await expect(page.locator("svg.recharts-surface").first()).toBeVisible();
      else await expect(page.locator("tbody tr").first()).toBeVisible();
      await expectNoViolations(page, { ignoreContrast: true });
      expect(blocked).toEqual([]);
    });
  }
});

test.describe("배포본 · 백오피스에 닿지 않는 키오스크", () => {
  test.use({ viewport: { width: 1024, height: 900 } });

  test("처음·보유 게임 화면은 카탈로그 스냅숏으로, 예약 확인·대기 등록은 연결 안내로 대신한다", async ({ context, page }) => {
    const blocked = await blockExternal(context);
    // 스트리밍 중에는 숨은 영역에 같은 글자가 잠깐 하나 더 있으므로, 글자로 찾을 때는 보이는 것만 본다.
    const snapshotNotice = page.getByText("오프라인 데이터로 표시 중").filter({ visible: true });

    await page.goto(DEPLOYED_LAUNCHER_URL);
    await expect(page.getByRole("heading", { name: "무엇을 도와드릴까요?" })).toBeVisible();
    await expect(page.getByText(/보유 게임 \d+종/).filter({ visible: true })).toBeVisible();
    await expectNoViolations(page, { ignoreContrast: true });

    await page.goto(`${DEPLOYED_LAUNCHER_URL}/games`);
    await expect(page.getByRole("heading", { level: 1, name: /보유 게임$/ })).toBeVisible();
    await expect(snapshotNotice).toBeVisible();
    const cards = page.getByTestId("kiosk-game");
    await expect(cards.first()).toBeVisible();
    // 이용 현황은 알 수 없어 숨긴다.
    await expect(cards.first()).not.toContainText("이용 가능");
    await expect.poll(() => cards.first().locator("img").evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
    await expectNoViolations(page, { ignoreContrast: true });

    await page.goto(`${DEPLOYED_LAUNCHER_URL}/waitlist`);
    await expect(page.getByText("매장 시스템에 연결할 수 없습니다").filter({ visible: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "대기 등록하기" })).toBeVisible();
    await expectNoViolations(page, { ignoreContrast: true });

    await page.goto(`${DEPLOYED_LAUNCHER_URL}/reservation`);
    for (const d of "1234") await page.getByRole("button", { name: d, exact: true }).click();
    await expect(page.getByText("예약을 불러오지 못했습니다. 직원에게 문의해주세요.").filter({ visible: true })).toBeVisible();
    await expectNoViolations(page, { ignoreContrast: true });

    expect(blocked).toEqual([]);
  });
});

test.describe("배포본 · 백오피스에 닿지 않는 홍보 사이트", () => {
  test("정적 화면은 그대로 뜨고, 온라인 예약은 매장 전화 예약을 안내한다", async ({ context, page }) => {
    const blocked = await blockExternal(context);

    await page.goto(DEPLOYED_WEB_URL);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator('main a[href^="/game/"]').first()).toBeVisible();

    await page.goto(`${DEPLOYED_WEB_URL}/reservation`);
    await expect(page.getByRole("heading", { level: 1, name: "온라인 예약" })).toBeVisible();
    await expect(page.getByText("전화로 예약해 주세요")).toBeVisible();
    await expect(page.getByText(/예약 서버에 연결하지 못했습니다/)).toBeVisible();
    await expect(page.getByRole("link", { name: /\d{2,4}-\d{3,4}-\d{4}/ }).first()).toBeVisible();
    await expectNoViolations(page);

    expect(blocked).toEqual([]);
  });
});

test.describe("배포본 · 이미지 최적화가 막힌 홍보 사이트", () => {
  // Vercel 무료 요금제는 이미지 변환 한도를 넘으면 /_next/image에 402를 돌려준다(1.2.1에서 백오피스 로고가 깨졌던 원인).
  // 원본 표지는 로컬 썸네일로 대신하고, 사이트 사진은 최적화를 거치지 않고 원본 파일을 받아 그대로 보여야 한다.
  test("모든 사진과 표지가 깨지지 않고 보인다", async ({ context, page }) => {
    const blocked = await blockExternal(context);
    await context.route(/\/_next\/image\?/, (route) => route.fulfill({ status: 402, body: "PAYMENT_REQUIRED" }));
    const broken = () =>
      page.evaluate(() =>
        [...document.images]
          .filter((img) => img.complete && img.naturalWidth === 0 && (img.currentSrc || img.src))
          .map((img) => img.currentSrc || img.src),
      );

    for (const path of ["/", "/about", "/games/strategy", "/game/174430"]) {
      await page.goto(`${DEPLOYED_WEB_URL}${path}`);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      // 지연 로딩 사진도 받도록 끝까지 내린다.
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await expect.poll(broken).toEqual([]);
    }
    await page.getByRole("button", { name: "메뉴 열기" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect.poll(broken).toEqual([]);

    expect(blocked).toEqual([]);
  });
});

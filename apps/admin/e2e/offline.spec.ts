import { expect, test, type Page } from "@playwright/test";

import { blockExternal, expectNoViolations } from "./checks";
import { kstDate, kstHour, LAUNCHER_URL, uniquePhone, USERS, WEB_URL } from "./helpers";

/**
 * 오프라인 검증: localhost 밖으로 나가는 브라우저 요청을 모두 끊은 채, 세 화면 축(홍보 사이트·백오피스·키오스크)의
 * 모든 화면과 주요 상태(예약 흐름, 키오스크 대기 등록·도착, 백오피스 실시간 반영·테이블 배정)가 내용과 함께 뜨는지 보고,
 * 화면·상태마다 axe 위반이 없는지 함께 본다. 서버는 .env 없이 메모리 PGlite·개발용 시드로 뜬다(playwright.config.ts).
 * 글꼴·스크립트·이미지는 모두 같은 주소에서 나가야 하므로, 끊긴 요청이 하나라도 있으면 실패한다.
 * 서버 쪽 외부(공유 데모 DB·백오피스 API)가 끊긴 배포본은 e2e/deployed-offline.spec.ts가 본다.
 *
 * 데이터를 바꾸는 테스트의 매장: 온라인 예약은 판교점 6일 뒤, 테이블 배정은 판교점 5일 뒤(booking.spec은 3·4일 뒤),
 * 키오스크는 둔산점(런처가 그 매장으로 떠 있음).
 */

/** 화면의 이미지가 모두 실제로 그려졌는지(깨진 그림이 없는지) 본다. 지연 로딩 그림은 아직 받지 않았을 수 있어 받은 것만 본다. */
async function expectImagesLoaded(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(() =>
        [...document.images]
          .filter((img) => img.complete && img.naturalWidth === 0 && (img.currentSrc || img.src))
          .map((img) => img.currentSrc || img.src),
      ),
    )
    .toEqual([]);
}

/**
 * 쓰는 글꼴이 모두 받아졌는지 본다(외부 글꼴이 끊겨 대체 글꼴로 그려지지 않았는지).
 * next/font가 만드는 "… Fallback" 글꼴은 장비의 기본 글꼴(local("Arial") 등)을 가리키는 크기 맞춤용이라,
 * 그 글꼴이 없는 장비(리눅스 CI)에서는 error가 되지만 받는 파일이 아니므로 뺀다.
 */
async function expectFontsLoaded(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  const failed = await page.evaluate(() =>
    [...document.fonts].filter((f) => f.status === "error" && !/ Fallback$/.test(f.family)).map((f) => f.family),
  );
  expect(failed).toEqual([]);
}

async function pressDigits(kiosk: Page, digits: string) {
  for (const d of digits) await kiosk.getByRole("button", { name: d, exact: true }).click();
}

test.describe("오프라인 · 홍보 사이트", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("홈·유형·게임 화면이 외부 요청 없이 내용과 함께 뜨고, 표지는 로컬 썸네일로 대신한다", async ({ context, page }) => {
    const blocked = await blockExternal(context);

    await page.goto(WEB_URL);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator('main a[href^="/game/"]').first()).toBeVisible();
    await expectImagesLoaded(page);
    await expectFontsLoaded(page);
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

  test("모든 유형 화면과 소개·없는 주소 화면이 외부 요청 없이 뜬다", async ({ context, page }) => {
    const blocked = await blockExternal(context);

    await page.goto(WEB_URL);
    const categories = [
      ...new Set(
        await page.locator('a[href^="/games/"]').evaluateAll((links) => links.map((a) => a.getAttribute("href") ?? "")),
      ),
    ];
    expect(categories.length).toBeGreaterThan(0);
    for (const path of categories) {
      await page.goto(`${WEB_URL}${path}`);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.locator('main a[href^="/game/"]').first()).toBeVisible();
      await expectNoViolations(page);
    }

    await page.goto(`${WEB_URL}/about`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expectImagesLoaded(page);
    await expectNoViolations(page);

    const response = await page.goto(`${WEB_URL}/없는-화면`);
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expectNoViolations(page);

    expect(blocked).toEqual([]);
  });

  test("온라인 예약: 빈 시간 찾기·오류·확정이 외부 요청 없이 된다", async ({ context, page }) => {
    const blocked = await blockExternal(context);
    const date = kstDate(6);
    const name = `오프예약${Date.now() % 100000}`;

    await page.goto(`${WEB_URL}/reservation`);
    await expect(page.getByRole("heading", { level: 1, name: "온라인 예약" })).toBeVisible();
    await expectNoViolations(page);

    // 고르지 않고 찾으면 매장 칸에 오류
    await page.getByRole("button", { name: "빈 시간 보기" }).click();
    await expect(page.getByLabel("매장", { exact: true })).toHaveAttribute("aria-invalid", "true");
    await expectNoViolations(page);

    await page.getByLabel("매장", { exact: true }).selectOption("c_pangyo");
    await page.getByLabel("날짜", { exact: true }).selectOption(date);
    await page.getByLabel("인원", { exact: true }).selectOption("2");
    await page.getByRole("button", { name: "빈 시간 보기" }).click();
    await expect(page.getByRole("heading", { name: "2. 시간과 연락처" })).toBeVisible();
    await expectNoViolations(page);

    await page.getByRole("radio", { name: "15:00" }).click();
    await page.getByLabel("이름", { exact: true }).fill(name);
    await page.getByLabel("휴대전화", { exact: true }).fill(uniquePhone().phone);
    await page.getByRole("checkbox", { name: /개인정보 수집·이용에 동의합니다/ }).click();
    await page.getByRole("button", { name: "예약하기" }).click();
    await expect(page.getByRole("heading", { name: "예약했습니다" })).toBeFocused();
    await expect(page.locator("dl")).toContainText("15:00");
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
    await expectImagesLoaded(page);
    await expectFontsLoaded(page);
    await expectNoViolations(page, { ignoreContrast: true });
    expect(blocked).toEqual([]);
    await context.close();
  });

  const tables = new Set(["/games", "/inventory", "/plays", "/cafes", "/staff", "/audit"]);
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
    test(`${name} 화면이 시드 데이터와 함께 뜬다`, async ({ context, page }) => {
      const blocked = await blockExternal(context);
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
      if (path === "/" || path === "/stats") await expect(page.locator("svg.recharts-surface").first()).toBeVisible();
      if (tables.has(path)) await expect(page.locator("tbody tr").first()).toBeVisible();
      if (path === "/reservations") await expect(page.getByRole("heading", { name: /^현장 대기 \d+팀$/ })).toBeVisible();
      if (path === "/password") await expect(page.getByLabel("지금 비밀번호")).toBeVisible();
      await expectImagesLoaded(page);
      await expectNoViolations(page, { ignoreContrast: true });
      expect(blocked).toEqual([]);
    });
  }

  test("모바일 목록과 테이블 배정: 고른 테이블로 예약을 등록하면 목록에 그 테이블이 보인다", async ({ context, page }) => {
    const blocked = await blockExternal(context);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/games");
    await expect(page.getByTestId("list-item").first()).toBeVisible();
    await expectNoViolations(page, { ignoreContrast: true });

    await page.setViewportSize({ width: 1280, height: 900 });
    const date = kstDate(5);
    const name = `오프배정${Date.now() % 100000}`;
    await page.goto(`/reservations?cafe=c_pangyo&date=${date}`);
    await page.getByRole("button", { name: "예약 등록" }).click();
    const dialog = page.getByRole("dialog", { name: "예약 등록" });
    await dialog.getByLabel("이름").fill(name);
    await dialog.getByLabel("휴대전화").fill(uniquePhone().phone);
    await dialog.getByLabel("인원").fill("4");
    await dialog.getByLabel("날짜").fill(date);
    await dialog.getByLabel("시각").fill("11:00");
    await dialog.getByRole("combobox", { name: "테이블" }).click();
    await expect(page.getByRole("option", { name: "C1 · 6석" })).toBeVisible();
    // 열린 선택 목록은 body 끝(랜드마크 밖)에 그려지는 팝업이라 region 규칙만 빼고 목록 자체를 검사한다.
    await expectNoViolations(page, { ignoreContrast: true, include: '[role="listbox"]', disableRules: ["region"] });
    await page.getByRole("option", { name: "C1 · 6석" }).click();
    await dialog.getByRole("button", { name: "등록" }).click();
    await expect(page.getByText(`'${name}' 예약을 등록했습니다.`)).toBeVisible();
    await expect(page.getByTestId("reservation-row").filter({ hasText: name })).toContainText("C1");
    await expectNoViolations(page, { ignoreContrast: true });

    expect(blocked).toEqual([]);
  });

  test("실시간 반영: 열어 둔 직원 화면에 키오스크 대기 등록이 새로고침 없이 나타난다", async ({ browser, context, page }) => {
    const blocked = await blockExternal(context);
    const name = `오프실시간${Date.now() % 100000}`;
    await page.goto("/reservations?cafe=c_dunsan");
    await expect(page.getByRole("heading", { name: /^현장 대기 \d+팀$/ })).toBeVisible();

    const kioskContext = await browser.newContext({
      storageState: { cookies: [], origins: [] },
      viewport: { width: 1024, height: 900 },
    });
    const kioskBlocked = await blockExternal(kioskContext);
    const kiosk = await kioskContext.newPage();
    await kiosk.goto(`${LAUNCHER_URL}/waitlist`);
    await kiosk.getByRole("button", { name: "대기 등록하기" }).click();
    await kiosk.getByLabel("이름").fill(name);
    await kiosk.getByLabel("휴대전화").fill(uniquePhone().phone);
    await kiosk.getByRole("button", { name: "대기 등록", exact: true }).click();
    await expect(kiosk.getByText("대기 등록을 마쳤습니다")).toBeVisible();

    // 15초마다 다시 받으므로 그 안에 나타나고, 화면 낭독기에도 알린다.
    await expect(page.getByTestId("waitlist-entry").filter({ hasText: name })).toBeVisible({ timeout: 25_000 });
    await expect(page.getByTestId("live-updates")).toContainText(`${name}님이 등록했습니다.`);
    await expectNoViolations(page, { ignoreContrast: true });

    expect([...blocked, ...kioskBlocked]).toEqual([]);
    await kioskContext.close();
  });
});

test.describe("오프라인 · 키오스크", () => {
  test.use({ storageState: { cookies: [], origins: [] }, viewport: { width: 1024, height: 900 } });
  // 스트리밍 중에는 숨은 영역에 같은 글자가 잠깐 하나 더 있으므로, 글자로 찾을 때는 보이는 것만 본다.

  test("처음·보유 게임·없는 주소 화면이 외부 요청 없이 뜬다", async ({ context, page }) => {
    const blocked = await blockExternal(context);

    await page.goto(LAUNCHER_URL);
    await expect(page.getByRole("heading", { name: "무엇을 도와드릴까요?" })).toBeVisible();
    await expect(page.getByText(/보유 게임 \d+종/).filter({ visible: true })).toBeVisible();
    await expectImagesLoaded(page);
    await expectFontsLoaded(page);
    await expectNoViolations(page, { ignoreContrast: true });

    await page.goto(`${LAUNCHER_URL}/games`);
    await expect(page.getByRole("heading", { level: 1, name: /보유 게임$/ })).toBeVisible();
    await expect(page.getByTestId("kiosk-game").first()).toBeVisible();
    await expectImagesLoaded(page);
    await expectNoViolations(page, { ignoreContrast: true });

    await page.getByRole("link", { name: "지금 이용 가능한 게임만" }).click();
    await expect(page).toHaveURL(/available=1/);
    await expect(page.getByTestId("kiosk-game").first()).toBeVisible();
    await expectNoViolations(page, { ignoreContrast: true });

    const response = await page.goto(`${LAUNCHER_URL}/없는-화면`);
    expect(response?.status()).toBe(404);
    await expect(page.getByText("화면을 찾을 수 없습니다").filter({ visible: true })).toBeVisible();
    await expectNoViolations(page, { ignoreContrast: true });

    expect(blocked).toEqual([]);
  });

  test("대기 등록: 오류를 알리고, 번호표를 받고, 내 순서를 확인한다", async ({ context, page }) => {
    const blocked = await blockExternal(context);
    const name = `오프대기${Date.now() % 100000}`;
    const { phone, last4 } = uniquePhone();

    await page.goto(`${LAUNCHER_URL}/waitlist`);
    await expect(page.getByText(/팀이 기다리고 있습니다/).filter({ visible: true })).toBeVisible();
    await expectNoViolations(page, { ignoreContrast: true });

    await page.getByRole("button", { name: "대기 등록하기" }).click();
    // 비워 두고 누르면 칸에 오류를 잇는다.
    await page.getByRole("button", { name: "대기 등록", exact: true }).click();
    await expect(page.getByLabel("이름")).toHaveAttribute("aria-invalid", "true");
    await expectNoViolations(page, { ignoreContrast: true });

    await page.getByLabel("이름").fill(name);
    await page.getByLabel("휴대전화").fill(phone);
    await page.getByRole("button", { name: "대기 등록", exact: true }).click();
    await expect(page.getByText("대기 등록을 마쳤습니다").filter({ visible: true })).toBeVisible();
    const ticket = (await page.getByText(/^\d+번$/).filter({ visible: true }).textContent()) ?? "";
    expect(ticket).toMatch(/^\d+번$/);
    await expectNoViolations(page, { ignoreContrast: true });

    await page.goto(`${LAUNCHER_URL}/waitlist`);
    await page.getByRole("button", { name: "내 순서 확인" }).click();
    await expect(page.getByRole("button", { name: "1", exact: true })).toBeVisible();
    await expectNoViolations(page, { ignoreContrast: true });
    await pressDigits(page, last4);
    await expect(page.getByText(ticket, { exact: true }).filter({ visible: true })).toBeVisible();
    await expectNoViolations(page, { ignoreContrast: true });

    expect(blocked).toEqual([]);
  });

  test("예약 확인: 뒷자리로 오늘 예약을 찾아 도착을 알린다", async ({ browser, context, page }) => {
    // 오늘 남은 시각에만 예약할 수 있어서, 밤 11시 이후에는 건너뛴다.
    test.skip(kstHour() >= 23, "오늘 남은 예약 시각이 없음");
    const blocked = await blockExternal(context);
    const name = `오프도착${Date.now() % 100000}`;
    const { phone, last4 } = uniquePhone();

    // 직원이 오늘 예약을 등록해 둔다(관리자 로그인 상태).
    const staff = await browser.newContext({ storageState: USERS.admin.storageState });
    const staffBlocked = await blockExternal(staff);
    const admin = await staff.newPage();
    await admin.goto("/reservations?cafe=c_dunsan");
    await admin.getByRole("button", { name: "예약 등록" }).click();
    const dialog = admin.getByRole("dialog", { name: "예약 등록" });
    await dialog.getByLabel("이름").fill(name);
    await dialog.getByLabel("휴대전화").fill(phone);
    await dialog.getByLabel("날짜").fill(kstDate(0));
    await dialog.getByLabel("시각").fill(`${String(kstHour() + 1).padStart(2, "0")}:00`);
    await dialog.getByRole("button", { name: "등록" }).click();
    await expect(admin.getByText(`'${name}' 예약을 등록했습니다.`)).toBeVisible();

    await page.goto(`${LAUNCHER_URL}/reservation`);
    await expect(page.getByRole("button", { name: "1", exact: true })).toBeVisible();
    await expectNoViolations(page, { ignoreContrast: true });

    await pressDigits(page, last4);
    await expect(page.getByText(`뒷자리 ${last4}로 찾은 오늘 예약 1건`).filter({ visible: true })).toBeVisible();
    await expectNoViolations(page, { ignoreContrast: true });
    await page.getByRole("button", { name: "도착했어요" }).click();
    await expect(page.getByText("도착을 알렸습니다").filter({ visible: true })).toBeVisible();
    await expectNoViolations(page, { ignoreContrast: true });

    await admin.reload();
    await expect(admin.getByTestId("reservation-row").filter({ hasText: name })).toContainText("도착");

    expect([...blocked, ...staffBlocked]).toEqual([]);
    await staff.close();
  });
});

import { expect, test, type Page } from "@playwright/test";

import { LAUNCHER_URL } from "./helpers";

/** CSP가 화면에 필요한 스크립트·이미지까지 막으면 콘솔에 위반이 찍힌다. */
function collectCspViolations(page: Page) {
  const violations: string[] = [];
  page.on("console", (message) => {
    if (message.text().includes("Content Security Policy")) violations.push(message.text());
  });
  return violations;
}

test("백오피스와 키오스크 응답에 보안 헤더가 있다", async ({ request }) => {
  for (const url of ["/login", `${LAUNCHER_URL}/`]) {
    const headers = (await request.get(url)).headers();
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(headers["strict-transport-security"]).toBeTruthy();
    expect(headers["x-powered-by"]).toBeUndefined();
  }
});

test("CSP가 차트·이미지·입력 화면을 막지 않는다", async ({ page }) => {
  const violations = collectCspViolations(page);
  await page.goto("/");
  await expect(page.locator("svg.recharts-surface").first()).toBeVisible();
  await page.goto("/games");
  await expect(page.getByRole("heading", { name: "보드게임" })).toBeVisible();
  await page.goto(`${LAUNCHER_URL}/games`);
  const image = page.locator("main img, img").first();
  await expect(image).toBeVisible();
  await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  expect(violations).toEqual([]);
});

test("키오스크 손님 조회는 기기별로 분당 30번까지만 받는다", async ({ request }) => {
  // 판교점 토큰은 다른 키오스크 테스트가 쓰지 않는다. 조회만 하므로 데이터는 바뀌지 않는다.
  const lookup = (cafe: string, attempt: number) =>
    request.get(`/api/kiosk/cafes/${cafe}/reservations?phone4=${String(attempt).padStart(4, "0")}`, {
      headers: { authorization: `Bearer kio_dev_${cafe}` },
    });

  const statuses = [];
  for (let i = 0; i < 30; i++) statuses.push((await lookup("c_pangyo", i)).status());
  expect(statuses.every((status) => status === 200)).toBe(true);

  const blocked = await lookup("c_pangyo", 31);
  expect(blocked.status()).toBe(429);
  expect(Number(blocked.headers()["retry-after"])).toBeGreaterThan(0);
  expect((await blocked.json()).message).toContain("요청이 너무 많습니다");

  // 다른 기기는 영향받지 않는다. 게임 조회는 손님 정보가 아니라 제한하지 않는다.
  expect((await lookup("c_hongdae", 0)).status()).toBe(200);
  const games = await request.get("/api/kiosk/cafes/c_pangyo/games", {
    headers: { authorization: "Bearer kio_dev_c_pangyo" },
  });
  expect(games.status()).toBe(200);
});

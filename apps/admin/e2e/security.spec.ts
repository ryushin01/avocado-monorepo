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

test("키오스크 손님 조회는 기기별로 분당 30번까지만 받는다", async ({ page, request }) => {
  // 새 토큰을 쓰므로 서버를 재사용하는 로컬 실행에서도 이전 실행의 횟수가 이어지지 않는다.
  // 같은 매장의 기기 둘로 확인해야 매장별이 아니라 기기별 제한임을 알 수 있다.
  await page.goto("/cafes");
  await page.getByRole("button", { name: "판교점 메뉴" }).first().click();
  await page.getByRole("menuitem", { name: "키오스크 토큰" }).click();
  const dialog = page.getByRole("dialog", { name: "키오스크 토큰 · 판교점" });
  const issue = async (name: string) => {
    await dialog.getByLabel("새 기기 이름").fill(name);
    await dialog.getByRole("button", { name: "발급" }).click();
    await expect(dialog.getByTestId("kiosk-device").filter({ hasText: name })).toBeVisible();
    return (await dialog.getByTestId("issued-token").textContent())!;
  };
  const suffix = Date.now() % 100000;
  const first = await issue(`제한A${suffix}`);
  const second = await issue(`제한B${suffix}`);
  expect(first).not.toBe(second);

  const authorization = (token: string) => ({ authorization: `Bearer ${token}` });
  const lookup = (token: string, attempt: number) =>
    request.get(`/api/kiosk/cafes/c_pangyo/reservations?phone4=${String(attempt).padStart(4, "0")}`, {
      headers: authorization(token),
    });

  const statuses = [];
  for (let i = 0; i < 30; i++) statuses.push((await lookup(first, i)).status());
  expect(statuses.every((status) => status === 200)).toBe(true);

  const blocked = await lookup(first, 31);
  expect(blocked.status()).toBe(429);
  expect(Number(blocked.headers()["retry-after"])).toBeGreaterThan(0);
  expect((await blocked.json()).message).toContain("요청이 너무 많습니다");

  // 같은 매장의 다른 기기는 영향받지 않는다. 게임 조회는 손님 정보가 아니라 제한하지 않는다.
  expect((await lookup(second, 0)).status()).toBe(200);
  const games = await request.get("/api/kiosk/cafes/c_pangyo/games", { headers: authorization(first) });
  expect(games.status()).toBe(200);
});

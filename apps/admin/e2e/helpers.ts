import { readFileSync } from "node:fs";

import { expect, type BrowserContext, type Page } from "@playwright/test";

/** 시드 직원 (비밀번호는 모두 DEV_PASSWORD). storageState는 auth.setup.ts가 만든다. */
export const USERS = {
  admin: { email: "admin@example.com", storageState: "e2e/.auth/admin.json" },
  hongdaeStaff: { email: "hongdae@example.com", storageState: "e2e/.auth/hongdae-staff.json" },
} as const;

export const DEV_PASSWORD = "avocado1234";

/** 이미 로그인해 둔 직원으로 바꾼다 (세션 쿠키를 그 직원 것으로 갈아 끼운다). */
export async function loginAs(context: BrowserContext, user: (typeof USERS)[keyof typeof USERS]) {
  const state = JSON.parse(readFileSync(user.storageState, "utf8")) as {
    cookies: Parameters<BrowserContext["addCookies"]>[0];
  };
  await context.clearCookies();
  await context.addCookies(state.cookies);
}

export const rowOf = (page: Page, name: string) =>
  page.locator("tbody tr").filter({ hasText: name });

export const listItems = (page: Page) => page.getByTestId("list-item");

/** 가상화 목록은 화면 근처만 그리므로, 개수 대신 전체 순번(aria-posinset)으로 찾는다. */
export const listItemAt = (page: Page, position: number) =>
  page.locator(`[role="listitem"][aria-posinset="${position}"]`);

/**
 * Suspense로 스트리밍된 목록은 숨겨진 div에 먼저 그려졌다가 제자리로 옮겨진다.
 * 개수만 세면 옮겨지기 전 요소를 잡을 수 있으므로, 보일 때까지 기다린다.
 */
export async function waitForMobileList(page: Page) {
  await expect(listItems(page).first()).toBeVisible();
  // 옮기는 순간에는 숨은 쪽과 보이는 쪽에 감시 요소가 둘 있으므로, 하나만 남을 때까지 기다린다.
  await expect(page.getByTestId("load-more-sentinel")).toHaveCount(1);
  await expect(page.getByTestId("load-more-sentinel")).toBeVisible();
}

/** 끝까지 불러온 뒤 마지막 항목이 그려졌는지 확인한다. (다른 테스트가 게임을 추가해도 개수에 흔들리지 않는다) */
export async function expectLastItemVisible(page: Page) {
  const last = page.locator('[role="listitem"][aria-posinset]').last();
  // 실제 높이를 재면서 전체 길이가 바뀌므로, 맨 아래에 닿을 때까지 다시 내린다.
  await expect(async () => {
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect(last).toBeVisible({ timeout: 500 });
    expect(await last.getAttribute("aria-posinset")).toBe(await last.getAttribute("aria-setsize"));
  }).toPass({ timeout: 10_000 });
}

export async function scrollToEnd(page: Page) {
  const done = page.getByText("모두 불러왔습니다");
  await expect(async () => {
    await page.getByTestId("load-more-sentinel").scrollIntoViewIfNeeded();
    await expect(done).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 20_000 });
}

export const totalFrom = async (page: Page, pattern: RegExp) =>
  Number((await page.getByText(pattern).textContent())?.match(/\d+/)?.[0]);

/** 키오스크 테스트용 런처 포트 (playwright.config.ts가 둔산점으로 띄운다) */
export const LAUNCHER_PORT = 3101;
export const LAUNCHER_URL = `http://localhost:${LAUNCHER_PORT}`;

/** 홈페이지 테스트 포트 */
export const WEB_PORT = 3102;
export const WEB_URL = `http://localhost:${WEB_PORT}`;

/** 한국 날짜 YYYY-MM-DD (offsetDays: 0 오늘, 1 내일) */
export function kstDate(offsetDays = 0) {
  return new Date(Date.now() + 9 * 3_600_000 + offsetDays * 86_400_000).toISOString().slice(0, 10);
}

/** 지금 한국 시각의 시(0~23) */
export const kstHour = () => new Date(Date.now() + 9 * 3_600_000).getUTCHours();

/** 테스트마다 겹치지 않는 휴대전화 번호 (010-0XXX-XXXX). 뒷자리 4자리도 함께 준다. */
export function uniquePhone() {
  const n = String(Math.floor(Math.random() * 1e8)).padStart(8, "0");
  return { phone: `010-${n.slice(0, 4)}-${n.slice(4)}`, last4: n.slice(4) };
}

/** 빈 브라우저(로그인 안 한 상태)로 로그인 화면에서 로그인한다. */
export async function signIn(page: Page, email: string, password = DEV_PASSWORD) {
  await page.goto("/login");
  await page.getByLabel("이메일").fill(email);
  await page.getByLabel("비밀번호").fill(password);
  await page.getByRole("button", { name: "로그인" }).click();
}

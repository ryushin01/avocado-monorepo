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

export async function scrollToEnd(page: Page) {
  const done = page.getByText("모두 불러왔습니다");
  await expect(async () => {
    await page.getByTestId("load-more-sentinel").scrollIntoViewIfNeeded();
    await expect(done).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 20_000 });
}

export const totalFrom = async (page: Page, pattern: RegExp) =>
  Number((await page.getByText(pattern).textContent())?.match(/\d+/)?.[0]);

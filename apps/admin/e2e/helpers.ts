import { expect, type BrowserContext, type Page } from "@playwright/test";

export const USERS = {
  admin: "u_admin",
  gangnamStaff: "u_staff_gangnam",
  hongdaeStaff: "u_staff_hongdae",
} as const;

/** 개발용 가상 계정 쿠키를 심는다. 기본값은 관리자. */
export async function loginAs(context: BrowserContext, userId: string) {
  await context.addCookies([
    { name: "mock-user-id", value: userId, url: "http://localhost:3100" },
  ]);
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

import { expect, test as setup } from "@playwright/test";

import { DEV_PASSWORD, USERS } from "./helpers";

// 테스트 전에 실제 로그인 화면으로 한 번씩 로그인해, 로그인 상태(세션 쿠키)를 파일로 남긴다.
// 각 테스트는 이 파일을 불러 쓴다(playwright.config.ts의 storageState, helpers의 loginAs).
for (const user of Object.values(USERS)) {
  setup(`로그인: ${user.email}`, async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("이메일").fill(user.email);
    await page.getByLabel("비밀번호").fill(DEV_PASSWORD);
    await page.getByRole("button", { name: "로그인" }).click();
    await expect(page.getByRole("heading", { name: "대시보드" })).toBeVisible();
    await page.context().storageState({ path: user.storageState });
  });
}

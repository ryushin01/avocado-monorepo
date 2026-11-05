import { expect, test } from "@playwright/test";

import { signIn } from "./helpers";

// 로그인하지 않은 브라우저로 시작한다.
test.use({ storageState: { cookies: [], origins: [] } });

test("로그인하지 않으면 로그인 화면으로 가고, 틀린 비밀번호는 안내한다", async ({ page }) => {
  await page.goto("/inventory");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByText(/보유 \d+종/)).toHaveCount(0);

  await signIn(page, "gangnam@example.com", "wrong-password");
  await expect(page.getByText("이메일 또는 비밀번호가 맞지 않거나")).toBeVisible();
});

test("같은 이메일로 5번 틀리면 잠겨서 맞는 비밀번호도 막힌다", async ({ page }) => {
  // 판교점 스태프 계정은 이 테스트만 쓴다.
  for (let i = 0; i < 4; i++) {
    await signIn(page, "pangyo@example.com", `wrong-${i}`);
    await expect(page.getByText("이메일 또는 비밀번호가 맞지 않거나")).toBeVisible();
  }
  await signIn(page, "pangyo@example.com", "wrong-4");
  await expect(page.getByText("15분 동안 잠겼습니다")).toBeVisible();
  await signIn(page, "pangyo@example.com");
  await expect(page.getByText("15분 동안 잠겼습니다")).toBeVisible();
});

test("새 직원은 처음 로그인할 때 비밀번호를 바꾸고, 퇴사 처리하면 바로 막힌다", async ({ browser }) => {
  const email = `e2e-${Date.now()}@example.com`;
  const admin = await (await browser.newContext()).newPage();
  await signIn(admin, "admin@example.com");
  await expect(admin.getByRole("heading", { name: "대시보드" })).toBeVisible();

  // 관리자가 초기 비밀번호로 등록
  await admin.goto("/staff");
  await admin.getByRole("button", { name: "직원 등록" }).click();
  const dialog = admin.getByRole("dialog", { name: "직원 등록" });
  await dialog.getByLabel("이름").fill("이투이");
  await dialog.getByLabel("이메일").fill(email);
  await dialog.getByRole("button", { name: "등록" }).click();
  await expect(dialog.getByText("비밀번호를 입력해주세요.")).toBeVisible();
  await dialog.getByLabel("초기 비밀번호").fill("first-pass-1");
  await dialog.getByRole("combobox", { name: "소속 매장" }).click();
  await admin.getByRole("option", { name: "대전 둔산점" }).click();
  await dialog.getByRole("button", { name: "등록" }).click();
  await expect(admin.getByText("'이투이' 직원을 등록했습니다.")).toBeVisible();

  // 직원: 첫 로그인은 비밀번호 변경 화면으로, 바꾸기 전에는 다른 화면도 막힘
  const staff = await (await browser.newContext()).newPage();
  await signIn(staff, email, "first-pass-1");
  await expect(staff).toHaveURL(/\/password/);
  await staff.goto("/inventory");
  await expect(staff).toHaveURL(/\/password/);
  await staff.getByLabel("지금 비밀번호").fill("first-pass-1");
  await staff.getByLabel("새 비밀번호", { exact: true }).fill("my-own-pass-1");
  await staff.getByLabel("새 비밀번호 확인").fill("my-own-pass-1");
  await staff.getByRole("button", { name: "비밀번호 바꾸기" }).click();
  await expect(staff.getByText("대전 둔산점의 재고 현황입니다.")).toBeVisible();

  // 관리자가 퇴사 처리하면 다음 요청부터 바로 로그인 화면으로
  await admin.reload();
  await admin.getByRole("button", { name: "이투이 메뉴" }).click();
  await admin.getByRole("menuitem", { name: "퇴사 처리" }).click();
  await admin.getByRole("alertdialog").getByRole("button", { name: "퇴사 처리" }).click();
  await expect(admin.getByText("'이투이' 직원을 퇴사 처리했습니다.")).toBeVisible();

  await staff.goto("/inventory");
  await expect(staff).toHaveURL(/\/login\?error=inactive/);
  await expect(staff.getByText("퇴사 처리됐거나 사용할 수 없는 계정입니다")).toBeVisible();
});

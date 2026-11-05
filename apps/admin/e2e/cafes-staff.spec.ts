import { expect, test } from "@playwright/test";

test.describe("매장 관리", () => {
  test("등록 → 폐점하면 재고 매장 선택에서 빠지고 → 운영 재개", async ({ page }) => {
    const name = `테스트${Date.now() % 100000}점`;
    await page.goto("/cafes");
    await page.getByRole("button", { name: "매장 등록" }).click();
    const dialog = page.getByRole("dialog", { name: "매장 등록" });
    await dialog.getByLabel("매장 이름").fill("강남점");
    await dialog.getByLabel("지역").fill("서울");
    await dialog.getByLabel("개점일").fill("2026-01-01");
    await dialog.getByRole("button", { name: "등록" }).click();
    await expect(dialog.getByText("같은 이름의 매장이 이미 있습니다.")).toBeVisible();
    await dialog.getByLabel("매장 이름").fill(name);
    await dialog.getByRole("button", { name: "등록" }).click();
    await expect(page.getByText(`'${name}'을(를) 등록했습니다.`)).toBeVisible();

    await page.getByRole("button", { name: `${name} 메뉴` }).first().click();
    await page.getByRole("menuitem", { name: "폐점 처리" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "폐점 처리" }).click();
    await expect(page.getByText(`'${name}'을(를) 폐점 처리했습니다.`)).toBeVisible();

    await page.goto("/inventory");
    await page.getByRole("combobox", { name: "매장" }).click();
    await expect(page.getByRole("option", { name })).toHaveCount(0);
    await page.keyboard.press("Escape");

    await page.goto("/cafes");
    await page.getByRole("button", { name: `${name} 메뉴` }).first().click();
    await page.getByRole("menuitem", { name: "운영 재개" }).click();
    await expect(page.getByText(`'${name}' 운영을 다시 시작했습니다.`)).toBeVisible();
  });

  test("키오스크 토큰은 발급할 때 한 번만 보여주고, 폐기할 수 있다", async ({ page }) => {
    await page.goto("/cafes");
    await page.getByRole("button", { name: "판교점 메뉴" }).first().click();
    await page.getByRole("menuitem", { name: "키오스크 토큰" }).click();
    const dialog = page.getByRole("dialog", { name: "키오스크 토큰 · 판교점" });
    const deviceName = `태블릿${Date.now() % 10000}`;
    await dialog.getByLabel("새 기기 이름").fill(deviceName);
    await dialog.getByRole("button", { name: "발급" }).click();
    await expect(dialog.getByTestId("issued-token")).toHaveText(/^kio_[\w-]{32}$/);
    const device = dialog.getByTestId("kiosk-device").filter({ hasText: deviceName });
    await expect(device).toContainText("사용 중");

    await dialog.getByRole("button", { name: `${deviceName} 토큰 폐기` }).click();
    await expect(page.getByText(`'${deviceName}' 토큰을 폐기했습니다.`)).toBeVisible();
    await expect(device).toContainText("폐기함");

    // 다시 열면 발급 때 보여준 토큰은 남아 있지 않다.
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "판교점 메뉴" }).first().click();
    await page.getByRole("menuitem", { name: "키오스크 토큰" }).click();
    await expect(page.getByTestId("issued-token")).toHaveCount(0);
  });
});

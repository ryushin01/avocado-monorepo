import { expect, test } from "@playwright/test";

// 이용 기록을 바꾸는 테스트는 부산 서면점만 쓴다.
const PAGE = "/plays?cafe=c_seomyeon";

test("이용 시작 → 지금 이용 중 → 반납하면 지난 기록에 남는다", async ({ page }) => {
  await page.goto(PAGE);
  await expect(page.getByRole("heading", { name: "이용 기록 · 부산 서면점" })).toBeVisible();

  await page.getByRole("button", { name: "이용 시작" }).click();
  const dialog = page.getByRole("dialog", { name: "게임 이용 시작" });
  await dialog.getByRole("button", { name: "이용 시작" }).click();
  await expect(dialog.getByText("이용할 게임을 선택해주세요.")).toBeVisible();

  const input = dialog.getByRole("combobox", { name: "게임" });
  await input.click();
  await page.getByRole("option").first().click();
  const name = await input.inputValue();
  await dialog.getByLabel("인원").fill("3");
  await dialog.getByLabel("테이블 (선택)").fill("9번");
  await dialog.getByRole("button", { name: "이용 시작" }).click();
  await expect(page.getByText(`'${name}' 이용을 시작했습니다.`)).toBeVisible();

  const active = page.getByTestId("active-play").filter({ hasText: "9번 테이블" }).filter({ hasText: name });
  await expect(active).toContainText("3명");
  await page.getByRole("button", { name: `${name} 반납` }).first().click();
  await expect(page.getByText(new RegExp(`^'${name}'을\\(를\\) 반납했습니다\\. \\(이용 \\d+분\\)$`))).toBeVisible();
  await expect(active).toHaveCount(0);

  // 오늘 날짜로 거르면 방금 기록이 가장 위에 있다.
  const today = new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 10);
  await page.goto(`${PAGE}&date=${today}&q=${encodeURIComponent(name)}`);
  await expect(page.locator("tbody tr").first()).toContainText(name);
  await expect(page.locator("tbody tr").first()).toContainText("9번");
});

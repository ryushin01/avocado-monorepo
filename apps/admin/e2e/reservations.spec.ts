import { expect, test } from "@playwright/test";

import { kstDate, uniquePhone } from "./helpers";

// 예약·대기를 바꾸는 테스트는 부산 서면점만 쓴다(키오스크 테스트는 둔산점).
const PAGE = "/reservations?cafe=c_seomyeon";

test.describe("예약 (관리자)", () => {
  test("등록·확정·노쇼 제한·취소, 지난 시각은 막는다", async ({ page }) => {
    const name = `예약${Date.now() % 100000}`;
    const { phone } = uniquePhone();
    const tomorrow = kstDate(1);
    await page.goto(`${PAGE}&date=${tomorrow}`);
    await expect(page.getByRole("heading", { name: "예약·대기 · 부산 서면점" })).toBeVisible();

    await page.getByRole("button", { name: "예약 등록" }).click();
    const dialog = page.getByRole("dialog", { name: "예약 등록" });
    await dialog.getByLabel("이름").fill(name);
    await dialog.getByLabel("휴대전화").fill(phone);
    await dialog.getByLabel("인원").fill("4");
    await dialog.getByLabel("날짜").fill(kstDate(-1));
    await dialog.getByLabel("시각").fill("19:00");
    await dialog.getByRole("combobox", { name: "상태" }).click();
    await page.getByRole("option", { name: "가예약" }).click();
    await dialog.getByRole("button", { name: "등록" }).click();
    await expect(dialog.getByText("지난 시각으로는 예약할 수 없습니다.")).toBeVisible();

    await dialog.getByLabel("날짜").fill(tomorrow);
    await dialog.getByRole("button", { name: "등록" }).click();
    await expect(page.getByText(`'${name}' 예약을 등록했습니다.`)).toBeVisible();

    const row = page.getByTestId("reservation-row").filter({ hasText: name });
    await expect(row).toContainText("19:00");
    await expect(row).toContainText("가예약");

    await page.getByRole("button", { name: `${name} 예약 메뉴` }).click();
    await page.getByRole("menuitem", { name: "확정" }).click();
    await expect(row).toContainText("확정");

    // 예약 시각 전에는 노쇼로 처리할 수 없다.
    await page.getByRole("button", { name: `${name} 예약 메뉴` }).click();
    await page.getByRole("menuitem", { name: "노쇼" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "노쇼 처리" }).click();
    await expect(page.getByText("예약 시각이 지나야 노쇼로 처리할 수 있습니다.")).toBeVisible();
    await page.getByRole("alertdialog").getByRole("button", { name: "닫기" }).click();

    await page.getByRole("button", { name: `${name} 예약 메뉴` }).click();
    await page.getByRole("menuitem", { name: "예약 취소" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "예약 취소" }).click();
    await expect(row).toContainText("취소");
    // 끝난 예약에는 작업 버튼이 없다.
    await expect(page.getByRole("button", { name: `${name} 입장` })).toHaveCount(0);
  });
});

test.describe("현장 대기 (관리자)", () => {
  test("카운터에서 등록하면 번호가 매겨지고, 호출·입장하면 줄에서 빠진다", async ({ page }) => {
    const name = `대기${Date.now() % 100000}`;
    const { phone } = uniquePhone();
    await page.goto(PAGE);
    await page.getByRole("button", { name: "대기 등록" }).click();
    const dialog = page.getByRole("dialog", { name: "현장 대기 등록" });
    await dialog.getByLabel("이름").fill(name);
    await dialog.getByLabel("휴대전화").fill(phone);
    await dialog.getByRole("button", { name: "등록" }).click();
    const done = page.getByText(new RegExp(`^대기 (\\d+)번 '${name}'을\\(를\\) 등록했습니다\\.$`));
    await expect(done).toBeVisible();
    const number = (await done.textContent())!.match(/대기 (\d+)번/)![1];

    const entry = page.getByTestId("waitlist-entry").filter({ hasText: name });
    await expect(entry).toContainText("대기 중");

    // 같은 번호로 다시 등록하면 막힌다.
    await page.getByRole("button", { name: "대기 등록" }).click();
    await dialog.getByLabel("이름").fill(name);
    await dialog.getByLabel("휴대전화").fill(phone);
    await dialog.getByRole("button", { name: "등록" }).click();
    await expect(dialog.getByText("같은 전화번호로 이미 대기 중입니다.")).toBeVisible();
    await dialog.getByRole("button", { name: "취소" }).click();

    await page.getByRole("button", { name: `대기 ${number}번 호출` }).click();
    await expect(entry).toContainText("호출함");
    await page.getByRole("button", { name: `대기 ${number}번 입장` }).click();
    await expect(page.getByText(`대기 ${number}번 '${name}'을(를) '입장'(으)로 바꿨습니다.`)).toBeVisible();
    await expect(entry).toHaveCount(0);
  });
});

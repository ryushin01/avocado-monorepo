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

test.describe("동시 수정 (낙관적 잠금)", () => {
  test("수정 창을 연 뒤 다른 직원이 고치면, 자동 갱신이 지나도 덮어쓰지 않고 알린다", async ({ page, browser }) => {
    const name = `동시${Date.now() % 100000}`;
    const tomorrow = kstDate(1);
    await page.goto(`${PAGE}&date=${tomorrow}`);
    await page.getByRole("button", { name: "예약 등록" }).click();
    const create = page.getByRole("dialog", { name: "예약 등록" });
    await create.getByLabel("이름").fill(name);
    await create.getByLabel("휴대전화").fill(uniquePhone().phone);
    await create.getByLabel("날짜").fill(tomorrow);
    await create.getByLabel("시각").fill("20:00");
    await create.getByRole("button", { name: "등록" }).click();
    await expect(page.getByText(`'${name}' 예약을 등록했습니다.`)).toBeVisible();
    const row = page.getByTestId("reservation-row").filter({ hasText: name });

    // 직원 A가 수정 창을 열어 둔다.
    await page.getByRole("button", { name: `${name} 예약 메뉴` }).click();
    await page.getByRole("menuitem", { name: "수정" }).click();
    const mine = page.getByRole("dialog", { name: "예약 수정" });
    await expect(mine.getByLabel("인원")).toHaveValue("2");

    // 그사이 직원 B가 같은 예약의 인원을 고친다.
    const other = await browser.newContext({ storageState: "e2e/.auth/admin.json" });
    const otherPage = await other.newPage();
    await otherPage.goto(`${PAGE}&date=${tomorrow}`);
    await otherPage.getByRole("button", { name: `${name} 예약 메뉴` }).click();
    await otherPage.getByRole("menuitem", { name: "수정" }).click();
    const theirs = otherPage.getByRole("dialog", { name: "예약 수정" });
    await theirs.getByLabel("인원").fill("6");
    // 2인석에 배정된 예약이라 6명이면 자리를 다시 고른다(그대로 두면 테이블 칸에 좌석 부족 오류).
    await theirs.getByRole("combobox", { name: "테이블" }).click();
    await otherPage.getByRole("option", { name: "자동 배정 (빈 테이블)" }).click();
    await theirs.getByRole("button", { name: "저장" }).click();
    await expect(otherPage.getByText(`'${name}' 예약을 수정했습니다.`)).toBeVisible();
    await other.close();

    // A의 화면이 자동 갱신으로 새 값을 받아도(탭이 다시 보이면 바로 갱신), 열린 창은 연 시점의 버전을 보낸다.
    await page.evaluate(() => {
      for (const state of ["hidden", "visible"]) {
        Object.defineProperty(document, "visibilityState", { value: state, configurable: true });
        document.dispatchEvent(new Event("visibilitychange"));
      }
    });
    await expect(row).toContainText("6명");
    await mine.getByLabel("메모 (선택)").fill("창가 자리");
    // 폼 오류 영역은 제출 전부터 있고(비어 있음), 제출해도 같은 요소에 내용만 바뀌어 화면 낭독기가 읽는다.
    const formAlert = await mine.locator('[data-slot="alert"]').elementHandle();
    await mine.getByRole("button", { name: "저장" }).click();
    await expect(mine.getByText("이 창을 연 뒤 다른 직원이 예약을 먼저 바꿨습니다.", { exact: false })).toBeVisible();
    expect(await formAlert?.evaluate((el) => el.isConnected && el.textContent?.includes("먼저 바꿨습니다"))).toBe(true);
    // 버튼 줄도 다시 그리지 않아 누른 저장 버튼에 초점이 남는다.
    await expect(mine.getByRole("button", { name: "저장" })).toBeFocused();
    // 다시 눌러도 덮어쓰지 않는다.
    await mine.getByRole("button", { name: "저장" }).click();
    await expect(mine.getByText("이 창을 연 뒤 다른 직원이 예약을 먼저 바꿨습니다.", { exact: false })).toBeVisible();
    await expect(row).toContainText("6명");

    // 창을 닫았다가 다시 열면 바뀐 내용으로 시작하고, 이제 저장된다.
    await mine.getByRole("button", { name: "취소" }).click();
    await page.getByRole("button", { name: `${name} 예약 메뉴` }).click();
    await page.getByRole("menuitem", { name: "수정" }).click();
    await expect(mine.getByLabel("인원")).toHaveValue("6");
    await expect(mine.getByLabel("메모 (선택)")).toHaveValue("");
    await mine.getByLabel("메모 (선택)").fill("창가 자리");
    await mine.getByRole("button", { name: "저장" }).click();
    await expect(page.getByText(`'${name}' 예약을 수정했습니다.`)).toBeVisible();
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

test.describe("중복 제출", () => {
  test("등록 버튼을 빠르게 두 번 눌러도 예약과 대기는 한 건만 생긴다", async ({ page }) => {
    const tomorrow = kstDate(1);
    const reservationName = `두번${Date.now() % 100000}`;
    await page.goto(`${PAGE}&date=${tomorrow}`);
    await page.getByRole("button", { name: "예약 등록" }).click();
    const reservationDialog = page.getByRole("dialog", { name: "예약 등록" });
    await reservationDialog.getByLabel("이름").fill(reservationName);
    await reservationDialog.getByLabel("휴대전화").fill(uniquePhone().phone);
    await reservationDialog.getByLabel("날짜").fill(tomorrow);
    await reservationDialog.getByLabel("시각").fill("18:00");
    await reservationDialog.getByRole("button", { name: "등록" }).dblclick();
    await expect(page.getByText(`'${reservationName}' 예약을 등록했습니다.`)).toBeVisible();
    await page.reload();
    await expect(page.getByTestId("reservation-row").filter({ hasText: reservationName })).toHaveCount(1);

    const waitName = `두번대기${Date.now() % 100000}`;
    await page.getByRole("button", { name: "대기 등록" }).click();
    const waitDialog = page.getByRole("dialog", { name: "현장 대기 등록" });
    await waitDialog.getByLabel("이름").fill(waitName);
    await waitDialog.getByLabel("휴대전화").fill(uniquePhone().phone);
    await waitDialog.getByRole("button", { name: "등록" }).dblclick();
    await expect(page.getByText(new RegExp(`'${waitName}'을\\(를\\) 등록했습니다`))).toBeVisible();
    // 두 번째 요청이 갔다면 '같은 전화번호로 이미 대기 중' 오류가 남거나 같은 이름이 두 번 보인다.
    await expect(page.getByText("같은 전화번호로 이미 대기 중입니다.")).toHaveCount(0);
    await page.reload();
    await expect(page.getByTestId("waitlist-entry").filter({ hasText: waitName })).toHaveCount(1);
  });
});

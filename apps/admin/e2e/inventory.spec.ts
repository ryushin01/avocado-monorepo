import { expect, test, type Page } from "@playwright/test";

import {
  listItemAt,
  listItems,
  loginAs,
  rowOf,
  USERS,
  waitForMobileList,
} from "./helpers";

// 병렬로 도는 테스트끼리 재고가 섞이지 않도록, 데이터를 바꾸는 테스트마다 다른 매장을 쓴다.
// 홍대점은 읽기 전용 테스트(스태프·대시보드)가 쓰므로 바꾸지 않는다.

/** 표의 첫 행 게임 이름. 손님이 이용 중인 게임은 제외할 수 없으므로 건너뛴다. */
async function firstRowName(page: Page) {
  const label = await page
    .locator("tbody tr")
    .filter({ hasNotText: "이용 중" })
    .first()
    .getByRole("button", { name: / 메뉴$/ })
    .getAttribute("aria-label");
  return label!.replace(/ 메뉴$/, "");
}

test.describe("재고 관리 (관리자)", () => {
  test("매장을 바꿔 가며 볼 수 있다", async ({ page }) => {
    await page.goto("/inventory");
    await expect(page.getByRole("heading", { name: "재고 관리 · 강남점" })).toBeVisible();

    await page.getByRole("combobox", { name: "매장" }).click();
    await page.getByRole("option", { name: "홍대점" }).click();
    await expect(page).toHaveURL(/cafe=c_hongdae/);
    await expect(page.getByRole("heading", { name: "재고 관리 · 홍대점" })).toBeVisible();

    // 페이지를 넘겨도 매장이 유지된다.
    const pager = page.getByRole("navigation", { name: "페이지 이동" });
    await pager.getByRole("link", { name: "2페이지" }).click();
    await expect(page).toHaveURL(/cafe=c_hongdae&page=2/);
  });

  test("상태로 거르면 그 상태인 게임만 보인다", async ({ page }) => {
    await page.goto("/inventory?cafe=c_hongdae");
    await page.getByRole("combobox", { name: "상태" }).click();
    await page.getByRole("option", { name: "점검 중" }).click();
    await expect(page).toHaveURL(/cafe=c_hongdae&status=maintenance/);
    await expect(page.locator("tbody tr")).not.toHaveCount(0);
    for (const row of await page.locator("tbody tr").all()) {
      await expect(row).toContainText("점검 중");
    }
  });

  test("추가: 게임을 고르지 않으면 오류, 고르면 '이용 가능'으로 추가된다", async ({ page }) => {
    await page.goto("/inventory?cafe=c_dunsan");
    const before = await page.getByText(/^보유 \d+종$/).textContent();
    await page.getByRole("button", { name: "게임 추가" }).click();
    const dialog = page.getByRole("dialog", { name: "재고에 게임 추가" });

    await dialog.getByRole("button", { name: "추가" }).click();
    await expect(dialog.getByText("추가할 게임을 선택해주세요.")).toBeVisible();

    const input = dialog.getByRole("combobox", { name: "게임" });
    await input.click();
    await page.getByRole("option").first().click();
    const name = await input.inputValue();
    expect(name).not.toBe("");
    await dialog.getByLabel("보유 수량").fill("2");
    await dialog.getByRole("button", { name: "추가" }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByText(`'${name}'을(를) 재고에 추가했습니다.`)).toBeVisible();
    await expect(page.getByText(/^보유 \d+종$/)).not.toHaveText(before!);

    await page.goto(`/inventory?cafe=c_dunsan&q=${encodeURIComponent(name)}`);
    const row = rowOf(page, name);
    await expect(row).toContainText("이용 가능");
    await expect(row.getByRole("cell").nth(4)).toHaveText("2");

    // 이미 보유한 게임은 추가 후보에서 빠진다.
    await page.getByRole("button", { name: "게임 추가" }).click();
    await page.getByRole("dialog").getByRole("combobox", { name: "게임" }).fill(name);
    await expect(page.getByRole("option", { name: new RegExp(`^${name}`) })).toHaveCount(0);
  });

  test("수정: 수량·상태를 바꾸고, 메뉴에서 상태를 바로 바꾼다", async ({ page }) => {
    await page.goto("/inventory?cafe=c_seomyeon");
    const name = await firstRowName(page);

    await page.getByRole("button", { name: `${name} 메뉴` }).click();
    await page.getByRole("menuitem", { name: "수량·상태 수정" }).click();
    const dialog = page.getByRole("dialog", { name: "재고 수정" });
    await dialog.getByLabel("보유 수량").fill("0");
    await dialog.getByRole("button", { name: "저장" }).click();
    await expect(dialog.getByText("보유 수량은 1 이상이어야 합니다.")).toBeVisible();

    await dialog.getByLabel("보유 수량").fill("7");
    await dialog.getByRole("combobox", { name: "상태" }).click();
    await page.getByRole("option", { name: "점검 중" }).click();
    await dialog.getByRole("button", { name: "저장" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText(`'${name}' 재고를 수정했습니다.`)).toBeVisible();
    await expect(rowOf(page, name)).toContainText("점검 중");
    await expect(rowOf(page, name).getByRole("cell").nth(4)).toHaveText("7");

    await page.getByRole("button", { name: `${name} 메뉴` }).click();
    await page.getByRole("menuitemradio", { name: "이용 가능" }).click();
    await expect(
      page.getByText(`'${name}' 상태를 '이용 가능'(으)로 변경했습니다.`),
    ).toBeVisible();
    await expect(rowOf(page, name)).toContainText("이용 가능");
  });

  test("제외: 확인 후 이 매장에서만 빠진다", async ({ page }) => {
    await page.goto("/inventory?cafe=c_gangnam");
    const name = await firstRowName(page);

    await page.getByRole("button", { name: `${name} 메뉴` }).click();
    await page.getByRole("menuitem", { name: "재고에서 제외" }).click();
    const confirm = page.getByRole("alertdialog");
    await expect(confirm).toContainText(name);
    await confirm.getByRole("button", { name: "취소" }).click();
    await expect(rowOf(page, name)).toBeVisible();

    await page.getByRole("button", { name: `${name} 메뉴` }).click();
    await page.getByRole("menuitem", { name: "재고에서 제외" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "제외" }).click();
    await expect(page.getByText(`'${name}'을(를) 재고에서 제외했습니다.`)).toBeVisible();
    await expect(rowOf(page, name)).toHaveCount(0);

    // 카탈로그에는 그대로 있다.
    await page.goto(`/games?q=${encodeURIComponent(name)}`);
    await expect(rowOf(page, name)).toBeVisible();
  });
});

test.describe("재고 관리 (스태프)", () => {
  test.beforeEach(async ({ context }) => loginAs(context, USERS.hongdaeStaff));

  test("소속 매장만 보이고, 다른 매장을 요청해도 소속 매장을 보여준다", async ({ page }) => {
    await page.goto("/inventory?cafe=c_gangnam");
    await expect(page.getByRole("heading", { name: "재고 관리 · 홍대점" })).toBeVisible();
    await expect(page.getByRole("combobox", { name: "매장" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "게임 추가" })).toBeVisible();
  });

  test("관리자 전용 메뉴와 페이지는 막힌다", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation").or(page.locator("[data-sidebar=sidebar]")).first();
    await expect(nav.getByRole("link", { name: "재고 관리" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "매장 관리" })).toHaveCount(0);

    await page.goto("/cafes");
    await expect(page.getByText("접근 권한이 없습니다")).toBeVisible();
  });
});

test.describe("모바일 재고 목록", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("추가로 불러온 게임의 상태를 바꿔도 목록에 반영된다", async ({ page }) => {
    await page.goto("/inventory?cafe=c_pangyo");
    await waitForMobileList(page);
    await page.getByTestId("load-more-sentinel").scrollIntoViewIfNeeded();
    await expect(listItemAt(page, 21)).toBeAttached();
    await listItemAt(page, 21).scrollIntoViewIfNeeded();

    const target = listItemAt(page, 21);
    const name = (await target.getByRole("button").getAttribute("aria-label"))!.replace(
      / 메뉴$/,
      "",
    );
    const next = (await target.textContent())!.includes("폐기") ? "이용 가능" : "폐기";

    await page.getByRole("button", { name: `${name} 메뉴` }).click();
    await page.getByRole("menuitemradio", { name: next }).click();

    await expect(
      page.getByText(`'${name}' 상태를 '${next}'(으)로 변경했습니다.`),
    ).toBeVisible();
    await expect(listItems(page).filter({ hasText: name })).toContainText(next);
    // 이미 불러온 범위는 유지된다.
    await expect(listItemAt(page, 21)).toBeAttached();
  });
});

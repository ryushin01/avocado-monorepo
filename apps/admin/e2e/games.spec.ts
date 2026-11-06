import { expect, test, type Page } from "@playwright/test";

import {
  expectLastItemVisible,
  listItemAt,
  listItems,
  loginAs,
  rowOf,
  scrollToEnd,
  totalFrom,
  USERS,
  waitForMobileList,
} from "./helpers";

/** 테스트끼리 데이터가 섞이지 않도록 고유한 게임을 새로 등록한다. */
async function createGame(page: Page, name: string) {
  await page.goto("/games");
  await page.getByRole("button", { name: "게임 등록" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("게임 이름").fill(name);
  await dialog.getByRole("checkbox", { name: "파티 게임", exact: true }).check();
  await dialog.getByRole("button", { name: "등록" }).click();
  await expect(dialog).toBeHidden();
  // 이름순 정렬이라 첫 페이지에 없을 수 있으므로 검색해서 연다.
  await page.goto(`/games?q=${encodeURIComponent(name)}`);
  await expect(rowOf(page, name)).toBeVisible();
}

test.describe("보드게임 카탈로그", () => {
  test("avocado 데이터, 유형 분류, 매장 보유 현황을 보여준다", async ({ page }) => {
    await page.goto("/games?q=gloom");
    const row = rowOf(page, "글룸헤이븐");
    await expect(row).toContainText("Gloomhaven");
    await expect(row).toContainText("전략 게임");
    await expect(row).toContainText("테마 게임");
    await expect(row).toContainText("60–120분");
    await expect(row).toContainText(/\d+개 매장 · \d+개|보유 매장 없음/);
    // 썸네일은 avocado 원본 이미지로 미리 만든 작은 로컬 webp를 쓴다.
    await expect(row.locator("img")).toHaveAttribute("src", "/images/games/174430.webp");
  });

  test("한글·영문 이름으로 검색하고 카테고리로 거른다", async ({ page }) => {
    await page.goto("/games");
    const search = page.getByLabel("게임 이름 검색");
    await search.fill("gloom");
    await search.press("Enter");
    await expect(page).toHaveURL(/q=gloom/);
    await expect(page.locator("tbody tr")).toHaveCount(1);

    await page.goto("/games");
    await page.getByRole("combobox", { name: "카테고리" }).click();
    await page.getByRole("option", { name: "워게임" }).click();
    await expect(page).toHaveURL(/category=wargame/);
    for (const row of await page.locator("tbody tr").all()) {
      await expect(row).toContainText("워게임");
    }
  });

  test("결과가 없으면 빈 상태를 보여준다", async ({ page }) => {
    await page.goto("/games?q=존재하지않는게임");
    await expect(page.getByText("검색 결과가 없습니다")).toBeVisible();
  });
});

test.describe("카탈로그 등록·수정 (관리자)", () => {
  test("등록: 입력 오류를 보여주고, 고치면 등록된다", async ({ page }) => {
    const name = `등록 테스트 ${Date.now()}`;
    await page.goto("/games");
    await page.getByRole("button", { name: "게임 등록" }).click();
    const dialog = page.getByRole("dialog");

    await dialog.getByRole("button", { name: "등록" }).click();
    await expect(dialog.getByText("게임 이름을 입력해주세요.")).toBeVisible();
    await expect(dialog.getByText("카테고리를 하나 이상 선택해주세요.")).toBeVisible();

    await dialog.getByLabel("게임 이름").fill(name);
    await dialog.getByRole("checkbox", { name: "가족 게임", exact: true }).check();
    await dialog.getByRole("checkbox", { name: "파티 게임", exact: true }).check();
    await dialog.getByLabel("최소 인원").fill("2");
    await dialog.getByLabel("최대 인원").fill("5");
    await dialog.getByRole("button", { name: "등록" }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByText(`'${name}'을(를) 등록했습니다.`)).toBeVisible();
    await page.goto(`/games?q=${encodeURIComponent(name)}`);
    const row = rowOf(page, name);
    await expect(row).toContainText("가족 게임");
    await expect(row).toContainText("2–5명");
    await expect(row).toContainText("보유 매장 없음");
  });

  test("수정: 기존 값이 채워져 있고, 저장하면 목록에 반영된다", async ({ page }) => {
    const name = `수정 테스트 ${Date.now()}`;
    await createGame(page, name);

    await page.getByRole("button", { name: `${name} 수정` }).click();
    const dialog = page.getByRole("dialog", { name: "보드게임 수정" });
    await expect(dialog.getByLabel("게임 이름")).toHaveValue(name);
    await expect(
      dialog.getByRole("checkbox", { name: "파티 게임", exact: true }),
    ).toBeChecked();

    // 잘못된 값은 거부하고 입력값을 유지한다.
    await dialog.getByLabel("최소 플레이 시간(분)").fill("90");
    await dialog.getByLabel("최대 플레이 시간(분)").fill("45");
    await dialog.getByRole("button", { name: "저장" }).click();
    await expect(
      dialog.getByText("최대 플레이 시간은 최소 플레이 시간 이상이어야 합니다."),
    ).toBeVisible();
    await expect(dialog.getByLabel("최소 플레이 시간(분)")).toHaveValue("90");

    const renamed = `${name} (개정판)`;
    await dialog.getByLabel("게임 이름").fill(renamed);
    await dialog.getByLabel("최대 플레이 시간(분)").fill("120");
    await dialog.getByRole("checkbox", { name: "파티 게임", exact: true }).uncheck();
    await dialog.getByRole("checkbox", { name: "전략 게임", exact: true }).check();
    await dialog.getByRole("button", { name: "저장" }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByText(`'${renamed}'을(를) 수정했습니다.`)).toBeVisible();
    const row = rowOf(page, renamed);
    await expect(row).toContainText("전략 게임");
    await expect(row).not.toContainText("파티 게임");
    await expect(row).toContainText("90–120분");
  });
});

test.describe("카탈로그 권한 (스태프)", () => {
  test.beforeEach(async ({ context }) => loginAs(context, USERS.hongdaeStaff));

  test("스태프는 카탈로그를 볼 수만 있다", async ({ page }) => {
    await page.goto("/games");
    await expect(page.locator("tbody tr").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "게임 등록" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: / 수정$/ })).toHaveCount(0);
  });
});

test.describe("데스크톱 페이지네이션", () => {
  test("페이지 번호로 이동하고, 필터를 유지한다", async ({ page }) => {
    await page.goto("/games?category=strategy");
    const rows = page.locator("tbody tr");
    await expect(rows).toHaveCount(20);
    const firstOnPage1 = await rows.first().textContent();
    const pager = page.getByRole("navigation", { name: "페이지 이동" });
    await expect(pager.getByRole("link", { name: "1페이지" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(pager.getByRole("link", { name: "이전 페이지" })).toHaveCount(0);

    await pager.getByRole("link", { name: "2페이지" }).click();
    await expect(page).toHaveURL(/category=strategy&page=2/);
    await expect(pager.getByRole("link", { name: "2페이지" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(rows.first()).not.toHaveText(firstOnPage1 ?? "");
    for (const row of await rows.all()) {
      await expect(row).toContainText("전략 게임");
    }

    await pager.getByRole("link", { name: "이전 페이지" }).click();
    await expect(page).toHaveURL(/\/games\?category=strategy$/);
  });

  test("느린 기기에서 화면을 내린 채 하이드레이션돼도 오류 없이 페이지를 넘긴다", async ({ page }) => {
    test.setTimeout(90_000);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    // 데스크톱에서도 숨겨진 모바일 목록이 함께 하이드레이션된다. 링크를 누르려고 내리면 스크롤 위치가 바뀐다.
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 8 });

    await page.goto("/games?category=strategy", { waitUntil: "commit" });
    await page.getByRole("navigation", { name: "페이지 이동" }).getByRole("link", { name: "2페이지" }).click();

    await expect(page).toHaveURL(/category=strategy&page=2/, { timeout: 30_000 });
    expect(errors).toEqual([]);
  });

  test("필터를 바꾸면 1페이지로 돌아간다", async ({ page }) => {
    await page.goto("/games?page=3");
    await page.getByRole("combobox", { name: "카테고리" }).click();
    await page.getByRole("option", { name: "테마 게임" }).click();
    await expect(page).toHaveURL(/category=thematic/);
    await expect(page).not.toHaveURL(/page=/);
  });

  test("범위를 벗어난 페이지는 마지막 페이지로 보여준다", async ({ page }) => {
    await page.goto("/games?page=999");
    const pager = page.getByRole("navigation", { name: "페이지 이동" });
    await expect(pager.locator('[aria-current="page"]')).toBeVisible();
    await expect(pager.getByRole("link", { name: "다음 페이지" })).toHaveCount(0);
    await expect(page.locator("tbody tr")).not.toHaveCount(0);
  });
});

test.describe("카탈로그 정렬", () => {
  const firstRowCell = (page: Page, column: number) =>
    page.locator("tbody tr").first().locator("td").nth(column);

  test("머리글을 누르면 전체 목록 기준으로 정렬되고, 다음 페이지에도 유지된다", async ({ page }) => {
    await page.goto("/games");
    const header = page.getByRole("columnheader", { name: "난이도" });
    await expect(page.getByRole("columnheader", { name: "이름" })).toHaveAttribute(
      "aria-sort",
      "ascending",
    );
    await expect(header).not.toHaveAttribute("aria-sort");

    await header.getByRole("link").click();
    await expect(page).toHaveURL(/sort=difficulty/);
    await expect(header).toHaveAttribute("aria-sort", "ascending");
    await expect(firstRowCell(page, 4)).toHaveText("쉬움");

    await header.getByRole("link").click();
    await expect(page).toHaveURL(/sort=difficulty&order=desc/);
    await expect(header).toHaveAttribute("aria-sort", "descending");
    await expect(firstRowCell(page, 4)).toHaveText("어려움");

    await page.getByRole("link", { name: "2페이지" }).click();
    await expect(page).toHaveURL(/sort=difficulty&order=desc&page=2/);
    await expect(header).toHaveAttribute("aria-sort", "descending");

    await header.getByRole("link").click();
    await expect(page).toHaveURL(/\/games$/);
    await expect(page.getByRole("columnheader", { name: "이름" })).toHaveAttribute(
      "aria-sort",
      "ascending",
    );
  });

  test("알 수 없는 정렬 값은 무시한다", async ({ page }) => {
    await page.goto("/games?sort=drop&order=desc");
    await expect(page.getByRole("columnheader", { name: "이름" })).toHaveAttribute(
      "aria-sort",
      "ascending",
    );
  });
});

test.describe("모바일 무한 스크롤 (카탈로그)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("표 대신 목록을 보여주고, 끝까지 스크롤하면 모두 불러온다", async ({ page }) => {
    await page.goto("/games?page=3");
    await waitForMobileList(page);
    await expect(page.locator("table")).toBeHidden();
    await expect(page.getByRole("navigation", { name: "페이지 이동" })).toBeHidden();
    // page 파라미터와 관계없이 첫 묶음부터 시작한다.
    await expect(listItemAt(page, 1)).toBeVisible();

    await scrollToEnd(page);
    await expectLastItemVisible(page);
    const total = await totalFrom(page, /^총 \d+개$/);
    // 전부 불러와도 화면 근처만 그린다.
    expect(await listItems(page).count()).toBeLessThan(total);
    await expect(listItemAt(page, 1)).toHaveCount(0);

    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(listItemAt(page, 1)).toBeVisible();
  });

  test("첫 항목들은 서버가 보낸 HTML에 들어 있다", async ({ page }) => {
    const html = await (await page.request.get("/games")).text();
    expect(html).toContain('data-testid="list-item"');
  });

  test("초점이 있는 항목은 화면 밖으로 스크롤해도 지워지지 않는다", async ({ page }) => {
    await page.goto("/games");
    await waitForMobileList(page);
    const menu = listItemAt(page, 1).getByRole("button").first();
    await menu.focus();
    await scrollToEnd(page);
    await expect(listItemAt(page, 1)).toBeAttached();
    await expect(menu).toBeFocused();
  });

  test("하이드레이션 전에 내려도 스크롤 위치를 지키고 그 위치의 항목을 그린다", async ({ page }) => {
    test.setTimeout(60_000);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 8 });

    await page.goto("/games", { waitUntil: "commit" });
    // 스트리밍 중에는 목록이 숨은 영역에 먼저 그려지므로, 페이지가 길어져 실제로 보일 때까지 기다린다.
    await listItems(page).first().waitFor({ state: "visible", timeout: 30_000 });
    const target = 1500;
    const scrolled = await page.evaluate((y) => {
      window.scrollTo(0, y);
      return window.scrollY;
    }, target);
    expect(scrolled).toBe(target);

    // 서버 HTML은 맨 위 기준이라 20번째 항목이 없다. 이 항목이 보이면 마운트한 뒤 실제 스크롤 위치를 읽었다는 뜻이다.
    await expect(listItemAt(page, 20)).toBeAttached({ timeout: 30_000 });
    // 항목 높이를 다시 재면 위치가 조금 바뀔 수 있다. 맨 위로 튀지 않았는지 본다.
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(target / 2);
    expect(errors).toEqual([]);
  });

  test("검색 결과도 이어서 불러온다", async ({ page }) => {
    await page.goto("/games?category=strategy");
    await waitForMobileList(page);
    const total = await totalFrom(page, /^총 \d+개$/);
    expect(total).toBeGreaterThan(20);
    await scrollToEnd(page);
    await expectLastItemVisible(page);
    // 가상화 목록은 스크롤에 따라 항목이 사라지므로, 한 번에 읽은 뒤 확인한다.
    const items = await listItems(page).allTextContents();
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) expect(item).toContain("전략 게임");
  });
});

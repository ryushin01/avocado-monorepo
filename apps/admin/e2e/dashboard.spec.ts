import { expect, test } from "@playwright/test";

import { loginAs, totalFrom, USERS } from "./helpers";

const tile = (page: import("@playwright/test").Page, label: string) =>
  page.getByTestId("stat-tile").filter({ hasText: label });

test.describe("대시보드 (관리자)", () => {
  test("전체 매장 요약, 유형별 차트, 매장별 현황을 보여준다", async ({ page }) => {
    await page.goto("/");
    // 매장 관리 테스트가 동시에 매장을 등록·폐점하므로 정확한 매장 수는 단위 테스트에서 본다.
    await expect(page.getByText(/^전체 \d+개 매장의 재고 현황입니다\.$/)).toBeVisible();
    await expect(tile(page, "운영 매장")).toContainText(/\d+개/);
    await expect(tile(page, "보유 게임")).toContainText(/\d+종/);

    // 표만 확인하면 차트가 그려지지 않아도 통과하므로, 실제로 그려진 SVG도 확인한다
    // (recharts가 두 벌 설치되면 표는 있어도 차트가 비어 보인다).
    await expect(page.locator("[data-slot=chart] svg.recharts-surface").first()).toBeVisible();

    // 차트는 화면 낭독기용 표로도 제공된다.
    const chartTable = page.getByRole("table", { name: "유형별 보유 현황" });
    await expect(chartTable.getByRole("row")).toHaveCount(8); // 헤더 + 7개 유형

    // 새 차트들도 같은 데이터를 표로 제공한다.
    await expect(
      page.getByRole("table", { name: "인원수별 플레이 가능 게임" }).getByRole("row"),
    ).toHaveCount(9); // 헤더 + 1명~8명 이상
    await expect(
      page.getByRole("table", { name: "플레이 시간별 게임" }).getByRole("row"),
    ).toHaveCount(6); // 헤더 + 5개 구간
    await expect(page.getByText("매장별 재고 상태")).toBeVisible();

    const cafeTable = page.getByRole("table").filter({ hasText: "매장" }).last();
    // 매장 관리 테스트가 동시에 매장을 늘리므로 시드 5개 매장이 모두 있는지만 본다.
    for (const name of ["강남점", "홍대점", "판교점", "대전 둔산점", "부산 서면점"]) {
      await expect(cafeTable.getByRole("link", { name, exact: true })).toBeVisible();
    }
    await cafeTable.getByRole("link", { name: "홍대점" }).click();
    await expect(page).toHaveURL(/\/inventory\?cafe=c_hongdae/);
  });
});

test.describe("인기 게임 순위", () => {
  /** 순위 표(화면 낭독기용)에서 [순위, 이용 횟수] 목록을 읽는다. */
  async function readRanking(page: import("@playwright/test").Page, label: string) {
    const rows = page
      .getByRole("table", { name: `${label} 인기 게임 순위` })
      .locator("tbody tr");
    await expect(rows).toHaveCount(10);
    return Promise.all(
      (await rows.all()).map(async (row) => {
        const cells = await row.locator("td, th").allTextContents();
        return { rank: Number(cells[0]), name: cells[1], count: Number(cells[2]) };
      }),
    );
  }

  test("주간 1~10위를 보여주고, 탭으로 월간을 본다", async ({ page }) => {
    await page.goto("/");
    const tabs = page.getByRole("tablist", { name: "기간" });
    await expect(tabs.getByRole("tab", { name: "주간" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(page.getByText(/^최근 7일 · /)).toBeVisible();

    const week = await readRanking(page, "주간");
    expect(week.map((r) => r.rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    // 이용 횟수가 많은 순서다.
    for (let i = 1; i < week.length; i++) {
      expect(week[i - 1].count).toBeGreaterThanOrEqual(week[i].count);
    }

    await tabs.getByRole("tab", { name: "월간" }).click();
    await expect(page.getByText(/^최근 30일 · /)).toBeVisible();
    const month = await readRanking(page, "월간");
    // 30일 1위는 7일 1위보다 이용 횟수가 적을 수 없다.
    expect(month[0].count).toBeGreaterThanOrEqual(week[0].count);
  });

  test("스태프는 소속 매장 기준 순위를 본다", async ({ page, context }) => {
    await page.goto("/");
    const all = await readRanking(page, "주간");

    await loginAs(context, USERS.hongdaeStaff);
    await page.goto("/");
    await expect(page.getByText("홍대점에서 많이 이용된 게임 1~10위")).toBeVisible();
    const mine = await readRanking(page, "주간");
    // 한 매장의 1위 이용 횟수는 전체 1위보다 많을 수 없다.
    expect(mine[0].count).toBeLessThanOrEqual(all[0].count);
  });
});

test.describe("대시보드 (스태프)", () => {
  test.beforeEach(async ({ context }) => loginAs(context, USERS.hongdaeStaff));

  test("소속 매장 요약만 보이고, 수치가 재고 관리와 일치한다", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("홍대점의 재고 현황입니다.")).toBeVisible();
    await expect(tile(page, "운영 매장")).toHaveCount(0);
    await expect(page.getByText("매장별 현황")).toHaveCount(0);

    const games = Number((await tile(page, "보유 게임").textContent())?.match(/(\d+)종/)?.[1]);
    const maintenance = Number(
      (await tile(page, "점검 중").textContent())?.match(/(\d+)종/)?.[1],
    );

    await page.goto("/inventory");
    expect(await totalFrom(page, /^보유 \d+종$/)).toBe(games);
    await page.goto("/inventory?status=maintenance");
    expect(await totalFrom(page, /^보유 \d+종$/)).toBe(maintenance);
  });
});

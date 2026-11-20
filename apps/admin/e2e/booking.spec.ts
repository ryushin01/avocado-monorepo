import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { kstDate, uniquePhone, WEB_URL } from "./helpers";

// 온라인 예약·테이블 테스트는 판교점과 3일 뒤부터의 날짜만 쓴다(다른 예약 테스트는 서면점·오늘~내일, 키오스크는 둔산점).
const CAFE = { id: "c_pangyo", name: "판교점" };

async function expectNoViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
    .analyze();
  expect(violations.map((v) => ({ rule: v.id, targets: v.nodes.map((n) => n.html.slice(0, 160)) }))).toEqual([]);
}

/** 손님(로그인 안 한 브라우저)이 홈페이지에서 매장·날짜·인원을 골라 빈 시간을 본다. */
async function openSlots(page: Page, date: string, people: number) {
  await page.goto(`${WEB_URL}/reservation`);
  await expect(page.getByRole("heading", { level: 1, name: "온라인 예약" })).toBeVisible();
  await page.getByLabel("매장", { exact: true }).selectOption(CAFE.id);
  await page.getByLabel("날짜", { exact: true }).selectOption(date);
  await page.getByLabel("인원", { exact: true }).selectOption(String(people));
  await page.getByRole("button", { name: "빈 시간 보기" }).click();
  await expect(page.getByRole("heading", { name: "2. 시간과 연락처" })).toBeVisible();
}

test.describe("손님 온라인 예약 (홈페이지 → 백오피스)", () => {
  test("빈 시간에 예약하면 테이블을 배정해 확정하고, 직원 화면에 온라인 예약으로 보인다", async ({ browser, page }) => {
    const guest = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const web = await guest.newPage();
    const date = kstDate(3);
    const name = `온라인${Date.now() % 100000}`;
    const { phone } = uniquePhone();

    await openSlots(web, date, 3);
    await expect(web).toHaveURL(new RegExp(`cafe=${CAFE.id}&date=${date}&people=3`));
    await expectNoViolations(web);

    // 동의 없이 보내면 동의 칸에 오류를 잇고 그 칸으로 초점을 옮기며, 입력은 남긴다.
    await web.getByRole("radio", { name: "18:30" }).click();
    await web.getByLabel("이름", { exact: true }).fill(name);
    await web.getByLabel("휴대전화", { exact: true }).fill(phone);
    await web.getByRole("button", { name: "예약하기" }).click();
    const agreed = web.getByRole("checkbox", { name: /개인정보 수집·이용에 동의합니다/ });
    await expect(agreed).toBeFocused();
    await expect(agreed).toHaveAttribute("aria-invalid", "true");
    await expect(web.getByText("개인정보 수집·이용에 동의해주세요.")).toBeVisible();
    await expect(web.getByLabel("이름", { exact: true })).toHaveValue(name);
    await expect(web.getByRole("radio", { name: "18:30" })).toBeChecked();
    await expectNoViolations(web);

    await agreed.click();
    await web.getByRole("button", { name: "예약하기" }).click();
    await expect(web.getByRole("heading", { name: "예약했습니다" })).toBeFocused();
    const summary = web.locator("dl");
    await expect(summary).toContainText(CAFE.name);
    await expect(summary).toContainText("18:30");
    await expect(summary).toContainText("3명");
    // 3명은 가장 작은 빈 테이블인 4인석(B)에 앉는다.
    await expect(summary).toContainText(/B\d/);

    // 같은 번호로 그날 또 보내면 휴대전화 칸에 알리고 초점을 옮긴다.
    await openSlots(web, date, 2);
    await web.getByRole("radio", { name: "13:00" }).click();
    await web.getByLabel("이름", { exact: true }).fill(name);
    await web.getByLabel("휴대전화", { exact: true }).fill(phone);
    await web.getByRole("checkbox", { name: /개인정보 수집·이용에 동의합니다/ }).click();
    await web.getByRole("button", { name: "예약하기" }).click();
    await expect(web.getByLabel("휴대전화", { exact: true })).toBeFocused();
    await expect(web.getByText("이 휴대전화 번호로 그날 이 매장에 예약이 있습니다.").first()).toBeVisible();
    await guest.close();

    // 직원 화면: 온라인 배지, 배정한 테이블, 확정 상태
    await page.goto(`/reservations?cafe=${CAFE.id}&date=${date}`);
    const row = page.getByTestId("reservation-row").filter({ hasText: name });
    await expect(row).toHaveCount(1);
    await expect(row).toContainText("18:30");
    await expect(row).toContainText("온라인");
    await expect(row).toContainText("확정");
    await expect(row).toContainText(/B\d/);
  });

  test("매장·인원을 고르지 않고 찾으면 매장 칸에 오류를 잇는다", async ({ browser }) => {
    const guest = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const web = await guest.newPage();
    await web.goto(`${WEB_URL}/reservation`);
    await web.getByRole("button", { name: "빈 시간 보기" }).click();
    await expect(web.getByLabel("매장", { exact: true })).toHaveAttribute("aria-invalid", "true");
    await expect(web.getByText("매장을 골라 주세요.")).toBeVisible();
    await expect(web.getByRole("heading", { name: "2. 시간과 연락처" })).toHaveCount(0);
    await guest.close();
  });
});

test.describe("테이블 (관리자)", () => {
  test("매장 테이블을 더하고 끌 수 있고, 같은 이름은 이름 칸에 오류를 잇는다", async ({ page }) => {
    const label = `D${Date.now() % 1000}`;
    await page.goto("/cafes");
    await page.getByRole("button", { name: `${CAFE.name} 메뉴` }).click();
    await page.getByRole("menuitem", { name: "테이블" }).click();
    const dialog = page.getByRole("dialog", { name: `테이블 · ${CAFE.name}` });
    await expect(dialog.getByTestId("cafe-table").first()).toBeVisible();
    // 알림(토스트)이 떠 있지 않은 안정된 상태에서 검사한다.
    await expectNoViolations(page);

    await dialog.getByLabel("새 테이블 이름").fill(label);
    await dialog.getByLabel("좌석").fill("8");
    await dialog.getByRole("button", { name: "추가" }).click();
    await expect(page.getByText(`'${label}' 테이블(8석)을 추가했습니다.`)).toBeVisible();
    const item = dialog.getByTestId("cafe-table").filter({ hasText: label });
    await expect(item).toContainText("8석");

    await dialog.getByLabel("새 테이블 이름").fill(label.toLowerCase());
    await dialog.getByRole("button", { name: "추가" }).click();
    const nameField = dialog.getByLabel("새 테이블 이름");
    await expect(nameField).toHaveAttribute("aria-invalid", "true");
    await expect(nameField).toBeFocused();
    await expect(dialog.getByText("같은 이름의 테이블이 이미 있습니다.")).toBeVisible();

    await dialog.getByRole("button", { name: `쓰지 않기: ${label} 테이블` }).click();
    await expect(item).toContainText("쓰지 않음");
  });

  test("직원이 고른 테이블을 배정하고, 같은 시간대에 같은 테이블은 테이블 칸에 오류를 잇는다", async ({ page }) => {
    const date = kstDate(4);
    const stamp = Date.now() % 100000;
    await page.goto(`/reservations?cafe=${CAFE.id}&date=${date}`);

    const register = async (name: string) => {
      await page.getByRole("button", { name: "예약 등록" }).click();
      const dialog = page.getByRole("dialog", { name: "예약 등록" });
      await dialog.getByLabel("이름").fill(name);
      await dialog.getByLabel("휴대전화").fill(uniquePhone().phone);
      await dialog.getByLabel("인원").fill("5");
      await dialog.getByLabel("날짜").fill(date);
      await dialog.getByLabel("시각").fill("19:00");
      await dialog.getByRole("combobox", { name: "테이블" }).click();
      await page.getByRole("option", { name: "C2 · 6석" }).click();
      await dialog.getByRole("button", { name: "등록" }).click();
      return dialog;
    };

    await register(`창가${stamp}`);
    await expect(page.getByText(`'창가${stamp}' 예약을 등록했습니다.`)).toBeVisible();
    await expect(page.getByTestId("reservation-row").filter({ hasText: `창가${stamp}` })).toContainText("C2");

    const dialog = await register(`겹침${stamp}`);
    const table = dialog.getByRole("combobox", { name: "테이블" });
    await expect(table).toHaveAttribute("aria-invalid", "true");
    await expect(dialog.getByText("고른 테이블에는 그 시각 앞뒤 2시간 안에 다른 예약이 있습니다.")).toBeVisible();
  });
});

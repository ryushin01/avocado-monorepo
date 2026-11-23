import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { LAUNCHER_URL, uniquePhone } from "./helpers";

// 키오스크 태블릿의 인터넷이 끊긴 경우. 런처는 프로덕션 빌드라 서비스 워커(public/sw.js)가 등록된다.
test("키오스크: 인터넷이 끊기면 알리고, 새로 열어도 안내 화면을 보이다가 다시 연결되면 처음 화면으로 돌아간다", async ({
  browser,
}) => {
  const context = await browser.newContext({ viewport: { width: 1024, height: 900 } });
  const kiosk = await context.newPage();
  await kiosk.goto(LAUNCHER_URL);
  const home = kiosk.getByRole("heading", { name: "무엇을 도와드릴까요?" });
  await expect(home).toBeVisible();
  // 서비스 워커가 안내 화면을 받아 두고 이 화면을 맡을 때까지 기다린다.
  await kiosk.evaluate(() => navigator.serviceWorker.ready);
  await kiosk.waitForFunction(() => navigator.serviceWorker.controller !== null);

  // 열려 있는 화면: 이동이 실패로 끝나지 않고, 끊겼다는 알림이 뜬다.
  await context.setOffline(true);
  await kiosk.getByRole("link", { name: /게임 둘러보기/ }).click();
  const notice = kiosk.getByRole("alert").filter({ hasText: "인터넷 연결이 끊겼습니다" });
  await expect(notice).toBeVisible();
  await expect(notice).toContainText("다시 연결되면 하던 일을 이어서 진행합니다.");

  // 끊긴 채 새로 열면(자동 복귀·재시작) 브라우저 오류 화면 대신 안내 화면을 보여 준다.
  await kiosk.reload();
  await expect(kiosk.getByRole("heading", { name: "인터넷 연결이 끊겼습니다" })).toBeVisible();
  const { violations } = await new AxeBuilder({ page: kiosk })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
    // 키오스크 개편 화면만 색 대비를 보지 않는다(사용자 지시로 글자 대비 무시). 다른 규칙은 그대로 검사한다.
    .disableRules(["color-contrast"])
    .analyze();
  expect(violations.map((v) => v.id)).toEqual([]);

  // '다시 연결해 보기'는 아직 끊겨 있으면 그렇다고 알린다.
  await kiosk.getByRole("button", { name: "다시 연결해 보기" }).click();
  await expect(kiosk.getByRole("status")).toHaveText("아직 연결되지 않았습니다. 잠시 후 다시 확인합니다.");

  // 다시 연결되면 처음 화면으로 돌아간다.
  await context.setOffline(false);
  await expect(home).toBeVisible({ timeout: 15_000 });
  await context.close();
});

test("키오스크: 끊긴 동안 대기 등록을 누르면 보내는 동안 '뒤로'를 막고, 다시 연결되면 이어서 등록한다", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1024, height: 900 } });
  const kiosk = await context.newPage();
  await kiosk.goto(`${LAUNCHER_URL}/waitlist`);
  await kiosk.getByRole("button", { name: "대기 등록하기" }).click();
  await kiosk.getByLabel("이름").fill(`오프${Date.now() % 10000}`);
  await kiosk.getByLabel("휴대전화").fill(uniquePhone().phone);

  await context.setOffline(true);
  await kiosk.getByRole("button", { name: "대기 등록", exact: true }).click();
  await expect(kiosk.getByRole("alert").filter({ hasText: "인터넷 연결이 끊겼습니다" })).toBeVisible();
  // 손님이 '뒤로'로 떠난 뒤 미뤄 둔 등록이 들어가는 일이 없게, 보내는 동안은 막는다.
  await expect(kiosk.getByRole("button", { name: "뒤로" })).toBeDisabled();

  await context.setOffline(false);
  await expect(kiosk.getByText("대기 등록을 마쳤습니다")).toBeVisible({ timeout: 15_000 });
  await context.close();
});

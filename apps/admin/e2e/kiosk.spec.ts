import { expect, type Page, test } from "@playwright/test";

import { kstDate, kstHour, LAUNCHER_URL, uniquePhone } from "./helpers";

// 런처는 둔산점 키오스크로 떠 있다(playwright.config.ts). 키오스크 화면은 로그인이 필요 없다.
const ADMIN_PAGE = "/reservations?cafe=c_dunsan";

async function pressDigits(kiosk: Page, digits: string) {
  for (const d of digits) await kiosk.getByRole("button", { name: d, exact: true }).click();
}

test("키오스크 예약 확인: 뒷자리로 찾아 도착을 알리면 백오피스에 '도착'으로 보인다", async ({ page, browser }) => {
  // 오늘 남은 시각에만 예약할 수 있어서, 밤 11시 이후에는 건너뛴다.
  test.skip(kstHour() >= 23, "오늘 남은 예약 시각이 없음");
  const name = `키오${Date.now() % 100000}`;
  const { phone, last4 } = uniquePhone();
  const time = `${String(kstHour() + 1).padStart(2, "0")}:00`;

  await page.goto(ADMIN_PAGE);
  await page.getByRole("button", { name: "예약 등록" }).click();
  const dialog = page.getByRole("dialog", { name: "예약 등록" });
  await dialog.getByLabel("이름").fill(name);
  await dialog.getByLabel("휴대전화").fill(phone);
  await dialog.getByLabel("날짜").fill(kstDate(0));
  await dialog.getByLabel("시각").fill(time);
  await dialog.getByRole("button", { name: "등록" }).click();
  await expect(page.getByText(`'${name}' 예약을 등록했습니다.`)).toBeVisible();

  const kiosk = await (await browser.newContext({ viewport: { width: 1024, height: 900 } })).newPage();
  await kiosk.goto(`${LAUNCHER_URL}/reservation`);
  await pressDigits(kiosk, last4);
  await expect(kiosk.getByText(`뒷자리 ${last4}로 찾은 오늘 예약 1건`)).toBeVisible();
  // 이름은 가려서 보여준다.
  await expect(kiosk.getByText(name)).toHaveCount(0);
  await expect(kiosk.getByText(`${name[0]}${"*".repeat(name.length - 2)}${name.at(-1)}님`)).toBeVisible();
  await kiosk.getByRole("button", { name: "도착했어요" }).click();
  await expect(kiosk.getByText("도착을 알렸습니다")).toBeVisible();

  await page.reload();
  await expect(page.getByTestId("reservation-row").filter({ hasText: name })).toContainText("도착");
});

test("키오스크 대기: 등록하면 번호를 받고, 직원이 호출하면 내 순서에 '호출'로 보인다", async ({ page, browser }) => {
  const name = `줄${Date.now() % 100000}`;
  const { phone, last4 } = uniquePhone();
  const kiosk = await (await browser.newContext({ viewport: { width: 1024, height: 900 } })).newPage();

  await kiosk.goto(`${LAUNCHER_URL}/waitlist`);
  await expect(kiosk.getByText(/팀이 기다리고 있습니다/)).toBeVisible();
  await kiosk.getByRole("button", { name: "대기 등록하기" }).click();
  await kiosk.getByRole("button", { name: "인원 늘리기" }).click();
  await kiosk.getByLabel("이름").fill(name);
  await kiosk.getByLabel("휴대전화").fill(phone);
  await kiosk.getByRole("button", { name: "대기 등록", exact: true }).click();
  await expect(kiosk.getByText("대기 등록을 마쳤습니다")).toBeVisible();
  const ticket = (await kiosk.getByText(/^\d+번$/).textContent())!;
  const number = ticket.replace("번", "");

  // 같은 번호로 또 등록하면 막고 입력은 그대로 둔다.
  await kiosk.getByRole("button", { name: "처음으로" }).last().click();
  await kiosk.getByRole("button", { name: "대기 등록하기" }).click();
  await kiosk.getByLabel("이름").fill(name);
  await kiosk.getByLabel("휴대전화").fill(phone);
  await kiosk.getByRole("button", { name: "대기 등록", exact: true }).click();
  await expect(kiosk.getByText("이 전화번호로 이미 대기 중입니다.").first()).toBeVisible();
  await expect(kiosk.getByLabel("이름")).toHaveValue(name);

  // 백오피스에서 호출
  await page.goto(ADMIN_PAGE);
  await expect(page.getByTestId("waitlist-entry").filter({ hasText: name })).toContainText("3명");
  await page.getByRole("button", { name: `대기 ${number}번 호출` }).click();
  await expect(page.getByTestId("waitlist-entry").filter({ hasText: name })).toContainText("호출함");

  // 키오스크: 내 순서 확인
  await kiosk.goto(`${LAUNCHER_URL}/waitlist`);
  await kiosk.getByRole("button", { name: "내 순서 확인" }).click();
  await pressDigits(kiosk, last4);
  await expect(kiosk.getByText(`${number}번`, { exact: true })).toBeVisible();
  await expect(kiosk.getByText("지금 호출됐습니다. 카운터로 와주세요.")).toBeVisible();
});

test("키오스크 게임 둘러보기: 인원·이용 가능으로 거르고 처음 화면으로 돌아간다", async ({ browser }) => {
  const kiosk = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  await kiosk.goto(LAUNCHER_URL);
  await expect(kiosk.getByText("대전 둔산점에 오신 것을 환영합니다").first()).toBeVisible();
  await kiosk.getByRole("link", { name: /게임 둘러보기/ }).click();
  await expect(kiosk.getByRole("heading", { name: "대전 둔산점 보유 게임" })).toBeVisible();

  await kiosk.getByRole("group", { name: "인원" }).getByRole("link", { name: "8명 이상" }).click();
  await expect(kiosk).toHaveURL(/players=8/);
  await kiosk.getByRole("link", { name: "지금 이용 가능한 게임만" }).click();
  await expect(kiosk).toHaveURL(/players=8&available=1/);
  const cards = kiosk.getByTestId("kiosk-game");
  for (const card of await cards.all()) await expect(card).toContainText("이용 가능");

  await kiosk.getByRole("link", { name: "처음으로" }).click();
  // 스트리밍 중에는 숨은 영역에 같은 글자가 잠깐 하나 더 있으므로 화면에 보이는 제목으로 찾는다.
  await expect(kiosk.getByRole("heading", { name: "무엇을 도와드릴까요?" })).toBeVisible();
});

test("키오스크의 없는 주소는 안내 화면에서 처음 화면으로 돌아간다", async ({ page }) => {
  const response = await page.goto(`${LAUNCHER_URL}/없는-화면`);
  expect(response?.status()).toBe(404);
  await expect(page.getByText("화면을 찾을 수 없습니다")).toBeVisible();
  await page.getByRole("link", { name: "처음 화면으로" }).click();
  await expect(page).toHaveURL(`${LAUNCHER_URL}/`);
});

test("열어 둔 직원 화면은 새로고침하지 않아도 키오스크 대기 등록을 보여 주고 알린다", async ({ page, browser }) => {
  const name = `실시간${Date.now() % 100000}`;
  const { phone } = uniquePhone();
  await page.goto(ADMIN_PAGE);
  await expect(page.getByRole("heading", { name: /^현장 대기 \d+팀$/ })).toBeVisible();

  const kiosk = await (await browser.newContext({ viewport: { width: 1024, height: 900 } })).newPage();
  await kiosk.goto(`${LAUNCHER_URL}/waitlist`);
  await kiosk.getByRole("button", { name: "대기 등록하기" }).click();
  await kiosk.getByLabel("이름").fill(name);
  await kiosk.getByLabel("휴대전화").fill(phone);
  await kiosk.getByRole("button", { name: "대기 등록", exact: true }).click();
  await expect(kiosk.getByText("대기 등록을 마쳤습니다")).toBeVisible();

  // 직원 화면은 다시 열지 않는다. 15초마다 다시 받으므로 그 안에 나타나고, 화면 낭독기에도 알린다.
  await expect(page.getByTestId("waitlist-entry").filter({ hasText: name })).toBeVisible({ timeout: 25_000 });
  await expect(page.getByTestId("live-updates")).toContainText(`${name}님이 등록했습니다.`);
});

test("키오스크 대기 등록: 잘못 쓴 칸은 오류 문구와 이어지고, 초점이 그 칸으로 간다", async ({ browser }) => {
  const kiosk = await (await browser.newContext({ viewport: { width: 1024, height: 900 } })).newPage();
  await kiosk.goto(`${LAUNCHER_URL}/waitlist`);
  await kiosk.getByRole("button", { name: "대기 등록하기" }).click();
  await expect(kiosk.getByRole("group", { name: "인원" })).toBeVisible();
  await kiosk.getByLabel("이름").fill("김확인");
  await kiosk.getByLabel("휴대전화").fill("1234");
  await kiosk.getByRole("button", { name: "대기 등록", exact: true }).click();

  await expect(kiosk.getByText("입력을 확인해주세요.")).toBeVisible();
  const phone = kiosk.getByLabel("휴대전화");
  await expect(phone).toBeFocused();
  await expect(phone).toHaveAttribute("aria-invalid", "true");
  await expect(phone).toHaveAccessibleDescription(/010-1234-5678 형식/);
  // 맞게 쓴 칸에는 오류 표시를 붙이지 않는다.
  await expect(kiosk.getByLabel("이름")).not.toHaveAttribute("aria-invalid");
  await expect(kiosk.getByLabel("이름")).toHaveValue("김확인");
});

test("키오스크 대기 등록 버튼을 빠르게 두 번 눌러도 한 번만 등록하고 번호를 보여 준다", async ({ page, browser }) => {
  const name = `두번${Date.now() % 100000}`;
  const { phone } = uniquePhone();
  const kiosk = await (await browser.newContext({ viewport: { width: 1024, height: 900 } })).newPage();
  await kiosk.goto(`${LAUNCHER_URL}/waitlist`);
  await kiosk.getByRole("button", { name: "대기 등록하기" }).click();
  await kiosk.getByLabel("이름").fill(name);
  await kiosk.getByLabel("휴대전화").fill(phone);
  await kiosk.getByRole("button", { name: "대기 등록", exact: true }).dblclick();
  // 두 번째 요청이 가면 같은 번호 중복으로 오류 화면이 대기표를 덮는다.
  await expect(kiosk.getByText("대기 등록을 마쳤습니다")).toBeVisible();
  await expect(kiosk.getByText("이 전화번호로 이미 대기 중입니다.")).toHaveCount(0);

  await page.goto(ADMIN_PAGE);
  await expect(page.getByTestId("waitlist-entry").filter({ hasText: name })).toHaveCount(1);
});

test("키오스크 결과 화면은 30초 동안 만지지 않으면 경고하고, 계속 보기로 연장하며, 그대로 두면 처음 화면으로 돌아간다", async ({ browser }) => {
  const kiosk = await (await browser.newContext({ viewport: { width: 1024, height: 900 } })).newPage();
  await kiosk.clock.install();
  await kiosk.goto(`${LAUNCHER_URL}/waitlist`);
  await kiosk.getByRole("button", { name: "내 순서 확인" }).click();
  await pressDigits(kiosk, "0000");
  // 결과 화면이 그려진 뒤부터 센다('처음으로' 버튼은 숫자 패드 화면에도 있으므로 결과 문구를 기다린다).
  await expect(kiosk.getByText("대기 중인 번호를 찾을 수 없습니다.", { exact: false })).toBeVisible();

  // 30초 뒤 경고(연장할 시간 20초)
  await kiosk.clock.fastForward(31_000);
  const warning = kiosk.getByRole("alertdialog", { name: "곧 처음 화면으로 돌아갑니다" });
  await expect(warning).toBeVisible();
  await warning.getByRole("button", { name: "계속 보기" }).click();
  await expect(warning).toBeHidden();
  await expect(kiosk).toHaveURL(`${LAUNCHER_URL}/waitlist`);

  // 다시 30초 + 경고 20초 동안 두면 처음 화면으로 새로 연다.
  await kiosk.clock.fastForward(31_000);
  await expect(warning).toBeVisible();
  await kiosk.clock.fastForward(21_000);
  await expect(kiosk).toHaveURL(`${LAUNCHER_URL}/`);
});

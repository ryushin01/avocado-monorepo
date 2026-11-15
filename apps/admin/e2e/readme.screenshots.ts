import { writeFileSync } from "node:fs";

import { expect, type Page, test } from "@playwright/test";
import { applyPalette, GIFEncoder, quantize } from "gifenc";

import { LAUNCHER_URL, waitForMobileList, WEB_URL } from "./helpers";

/**
 * README 화면 촬영 (pnpm --dir apps/admin screenshots)
 * 결과: 저장소 루트의 docs/images/*.jpg와 키오스크 흐름 GIF(kiosk-flow.gif).
 * 화면의 데이터는 모두 개발용 시드(가상 매장·가상 기록)와 가상 전화번호입니다.
 * 평소 E2E(chromium 프로젝트)에는 들어가지 않습니다.
 */
const OUT = "../../docs/images";

// 변경 이력 화면을 만들려고 매장을 등록하므로, 다른 화면을 먼저 찍도록 차례로 실행합니다.
test.describe.configure({ mode: "serial" });

const shoot = async (page: Page, name: string) => {
  // 글꼴과 이미지를 다 받은 뒤 찍습니다.
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/${name}.jpg`, type: "jpeg", quality: 82 });
};

/** 텍스트가 있는 요소가 화면 위쪽(viewport 높이의 ratio)에 오도록 스크롤합니다. */
async function scrollToText(page: Page, text: string, ratio = 0.1) {
  await page.getByText(text, { exact: false }).first().evaluate((element, at) => {
    const top = element.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: top - window.innerHeight * at, behavior: "instant" });
  }, ratio);
  await page.waitForTimeout(1200);
}

test.describe("백오피스", () => {
  test.use({ storageState: "e2e/.auth/admin.json" });

  test.describe("데스크톱", () => {
    test.use({ viewport: { width: 1440, height: 1250 }, deviceScaleFactor: 1 });

    test("대시보드와 통계", async ({ page }) => {
      await page.goto("/");
      await expect(page.getByRole("heading", { name: "대시보드" })).toBeVisible();
      await shoot(page, "admin-dashboard");
      await page.goto("/stats");
      await expect(page.getByRole("heading", { name: "통계" })).toBeVisible();
      await shoot(page, "admin-stats");
    });
  });

  test.describe("데스크톱 900", () => {
    test.use({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });

    test("예약·재고·변경 이력", async ({ page }) => {
      await page.goto("/reservations?cafe=c_seomyeon");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await shoot(page, "admin-reservations");
      await page.goto("/inventory?cafe=c_seomyeon");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await shoot(page, "admin-inventory");
    });
  });

  test.describe("모바일", () => {
    test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

    test("재고 카드 목록", async ({ page }) => {
      await page.goto("/inventory?cafe=c_seomyeon");
      await waitForMobileList(page);
      await shoot(page, "admin-mobile");
    });
  });
});

test.describe("변경 이력", () => {
  test.use({ storageState: "e2e/.auth/admin.json", viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });

  test("매장 등록 뒤 남은 이력", async ({ page }) => {
    // 가상 매장 두 곳을 등록해 이력을 남깁니다(테스트용 메모리 DB라 실제 데이터에 남지 않음).
    for (const [name, region] of [
      ["광주 상무점", "광주"],
      ["제주 노형점", "제주"],
    ]) {
      await page.goto("/cafes");
      await page.getByRole("button", { name: "매장 등록" }).click();
      const dialog = page.getByRole("dialog", { name: "매장 등록" });
      await dialog.getByLabel("매장 이름").fill(name);
      await dialog.getByLabel("지역").fill(region);
      await dialog.getByLabel("개점일").fill("2026-11-01");
      await dialog.getByRole("button", { name: "등록" }).click();
      await expect(page.getByText(`'${name}'을(를) 등록했습니다.`)).toBeVisible();
    }
    await page.goto("/audit");
    await expect(page.getByRole("row").filter({ hasText: "제주 노형점" })).toBeVisible();
    await shoot(page, "admin-audit");
  });
});

test.describe("키오스크", () => {
  test.use({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 1 });

  test("시작 화면과 게임 목록", async ({ page }) => {
    await page.goto(LAUNCHER_URL);
    await shoot(page, "kiosk-home");
    await page.goto(`${LAUNCHER_URL}/games`);
    await shoot(page, "kiosk-games");
  });
});

test.describe("홍보 사이트", () => {
  test.use({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });

  test("홈과 소개", async ({ page }) => {
    await page.goto(WEB_URL);
    await shoot(page, "web-home");
    // 유형 소개 사이에서 화면 폭 가득 펼쳐지는 사진
    await page.getByAltText("붉은 용 피규어와 기사 피규어").first().evaluate((element) => {
      const rect = element.getBoundingClientRect();
      window.scrollTo({ top: rect.top + window.scrollY - window.innerHeight * 0.3, behavior: "instant" });
    });
    await page.waitForTimeout(2000);
    await shoot(page, "web-space");

    await page.goto(`${WEB_URL}/about`);
    await shoot(page, "web-about");
    await scrollToText(page, "매장 둘러보기", 0.05);
    await page.evaluate(() => window.scrollBy({ top: window.innerHeight * 1.2, behavior: "instant" }));
    await page.waitForTimeout(1500);
    await shoot(page, "web-tour");
  });
});

/** 키오스크 흐름 GIF: 화면 900×580 위에 48px 자막 띠를 얹은 900×628 프레임 */
const GIF_WIDTH = 900;
const GIF_SCREEN_HEIGHT = 580;
const CAPTION_HEIGHT = 48;
const GIF_HEIGHT = GIF_SCREEN_HEIGHT + CAPTION_HEIGHT;

/**
 * 지금 화면을 찍어 위에 자막 띠를 얹고, 그 프레임의 RGBA 픽셀을 돌려줍니다.
 * 자막은 Geist(영문·숫자)와 시스템 고딕(한글)으로 그립니다.
 */
async function captionedFrame(page: Page, caption: string): Promise<Uint8Array> {
  // 백오피스는 대기 목록을 계속 새로 받으므로 네트워크가 쉬기를 끝까지 기다리지 않습니다.
  await page.waitForLoadState("networkidle", { timeout: 3000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
  const screen = (await page.screenshot()).toString("base64");
  const rgba = await page.evaluate(
    async ({ screen, caption, width, height, bar }) => {
      const image = new Image();
      image.src = `data:image/png;base64,${screen}`;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("캔버스를 만들지 못했습니다.");
      context.fillStyle = "#141414";
      context.fillRect(0, 0, width, bar);
      context.drawImage(image, 0, bar);
      context.fillStyle = "#ffffff";
      // 영문·숫자는 두 앱이 함께 싣는 Geist로, 한글은 시스템 고딕으로 씁니다.
      // (캔버스는 이름을 적지 않은 한글을 기본 명조로 채우므로 고딕 이름을 직접 적습니다.)
      const font = '600 20px Geist, "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif';
      await document.fonts.load(font, caption);
      context.font = font;
      context.textBaseline = "middle";
      context.fillText(caption, 20, bar / 2);
      const pixels = context.getImageData(0, 0, width, height).data;
      // 큰 배열을 그대로 넘기지 않고 base64 글자로 바꿔 넘깁니다.
      let binary = "";
      for (let i = 0; i < pixels.length; i += 0x8000) {
        binary += String.fromCharCode(...pixels.subarray(i, i + 0x8000));
      }
      return btoa(binary);
    },
    { screen, caption, width: GIF_WIDTH, height: GIF_HEIGHT, bar: CAPTION_HEIGHT },
  );
  return new Uint8Array(Buffer.from(rgba, "base64"));
}

test.describe("키오스크 흐름 GIF", () => {
  // 대기를 등록하고 호출해 둔산점 대기 목록을 바꾸므로, 다른 화면을 다 찍은 뒤 마지막에 돌립니다.
  test.use({
    storageState: "e2e/.auth/admin.json",
    viewport: { width: GIF_WIDTH, height: GIF_SCREEN_HEIGHT },
    deviceScaleFactor: 1,
  });

  test("대기 등록 → 백오피스 호출 → 호출 확인", async ({ page, browser }) => {
    test.setTimeout(120_000);
    const gif = GIFEncoder();
    /** 지금 화면을 자막과 함께 delay(ms) 동안 보여 주는 프레임으로 넣습니다. */
    const frame = async (target: Page, caption: string, delay: number) => {
      const rgba = await captionedFrame(target, caption);
      const palette = quantize(rgba, 256);
      gif.writeFrame(applyPalette(rgba, palette), GIF_WIDTH, GIF_HEIGHT, { palette, delay });
    };

    // 이름은 가상이고, 전화번호는 시드처럼 쓰이지 않는 010-0000-xxxx 대역에서 뒷자리만 정합니다. 같은 번호로 대기 중이면
    // 등록이 막히고 뒷자리 조회도 겹치므로, 서버를 다시 쓰거나 다시 시도해 앞선 등록이 남아 있어도 겹치지 않게
    // 둔산점에서 지금 대기 중인 번호의 뒷자리는 피해 고릅니다. 백오피스에서도 이 번호로 찾습니다.
    const name = "한가람";
    await page.goto("/reservations?cafe=c_dunsan");
    await expect(page.getByRole("heading", { name: /^현장 대기 \d+팀$/ })).toBeVisible();
    const waiting = (await page.getByTestId("waitlist-entry").allTextContents()).join(" ");
    let last4: string;
    do {
      last4 = String(Math.floor(Math.random() * 10_000)).padStart(4, "0");
    } while (waiting.includes(`-${last4}`));
    const phone = `010-0000-${last4}`;

    // 키오스크(런처, 둔산점)는 로그인 없이 씁니다.
    const kioskContext = await browser.newContext({
      viewport: { width: GIF_WIDTH, height: GIF_SCREEN_HEIGHT },
      deviceScaleFactor: 1,
    });
    const kiosk = await kioskContext.newPage();

    await kiosk.goto(`${LAUNCHER_URL}/waitlist`);
    await expect(kiosk.getByText(/팀이 기다리고 있습니다/)).toBeVisible();
    await frame(kiosk, "1. 손님: 키오스크에서 현장 대기를 시작합니다", 2300);

    await kiosk.getByRole("button", { name: "대기 등록하기" }).click();
    await kiosk.getByRole("button", { name: "인원 늘리기" }).click();
    await kiosk.getByLabel("이름").fill(name);
    await kiosk.getByLabel("휴대전화").fill(phone);
    // 양식이 화면보다 길어 등록 버튼이 잘립니다. 페이지 아래에 빈 여백을 잠시 더해 대기 팀 수가 맨 위에 오게 내리면,
    // 위쪽 제목이 반쯤 걸리지 않고 대기 팀 수부터 등록 버튼까지 보입니다(초점은 휴대전화 칸에 그대로).
    const waitingLine = kiosk.getByText(/팀이 기다리고 있습니다/);
    await waitingLine.evaluate((element) => {
      // 문서(html)가 스크롤되고, 높이는 body가 정하므로 여백은 body 아래에 더합니다.
      document.body.style.paddingBottom = "200px";
      const scroller = document.scrollingElement ?? document.documentElement;
      scroller.scrollTop = element.getBoundingClientRect().top + scroller.scrollTop - 16;
    });
    await frame(kiosk, "2. 손님: 인원과 연락처를 입력합니다", 2300);
    await kiosk.evaluate(() => {
      document.body.style.paddingBottom = "";
    });

    await kiosk.getByRole("button", { name: "대기 등록", exact: true }).click();
    await expect(kiosk.getByText("대기 등록을 마쳤습니다")).toBeVisible();
    const ticket = (await kiosk.getByText(/^\d+번$/).textContent()) ?? "";
    const number = ticket.replace("번", "");
    await frame(kiosk, "3. 손님: 대기 번호를 받습니다", 2300);

    await page.goto("/reservations?cafe=c_dunsan");
    const entry = page.getByTestId("waitlist-entry").filter({ hasText: phone });
    await expect(entry).toBeVisible();
    await frame(page, "4. 직원: 백오피스에 바로 표시됩니다", 2300);

    await page.getByRole("button", { name: `대기 ${number}번 호출` }).click();
    await expect(entry).toContainText("호출함");
    await frame(page, "5. 직원: 차례가 되면 호출합니다", 2300);

    await kiosk.goto(`${LAUNCHER_URL}/waitlist`);
    await kiosk.getByRole("button", { name: "내 순서 확인" }).click();
    for (const digit of last4) {
      await kiosk.getByRole("button", { name: digit, exact: true }).click();
    }
    await expect(kiosk.getByText("지금 호출됐습니다. 카운터로 와주세요.")).toBeVisible();
    await frame(kiosk, "6. 손님: 뒷자리로 조회하면 호출을 확인합니다", 3500);

    gif.finish();
    writeFileSync(`${OUT}/kiosk-flow.gif`, gif.bytes());
    await kioskContext.close();
  });
});

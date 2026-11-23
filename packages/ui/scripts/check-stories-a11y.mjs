// 빌드한 Storybook(storybook-static)의 모든 스토리를 axe로 검사한다(앱 E2E의 axe와 같은 WCAG 2.2 A·AA 규칙).
// 앱 E2E는 대화상자를 연 상태나 오류 상태를 다 보지 못하므로, 공통 부품의 상태별 모습(열린 상태 스토리 포함)은 여기서 잡는다.
// 사용: pnpm --filter @avocado/ui build-storybook && pnpm --filter @avocado/ui test:stories
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

import AxeBuilder from "@axe-core/playwright";
import { chromium } from "@playwright/test";

// 경로에 공백·한글이 있어도 되게 파일 URL을 경로로 바꾼다(.pathname은 %20 그대로).
const root = fileURLToPath(new URL("../storybook-static/", import.meta.url));
if (!existsSync(join(root, "index.json"))) {
  console.error("storybook-static이 없습니다. 먼저 pnpm --filter @avocado/ui build-storybook을 실행하세요.");
  process.exit(1);
}

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".woff2": "font/woff2" };
const server = createServer((req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url ?? "/", "http://localhost").pathname)).replace(/^(\.\.[/\\])+/, "");
  const file = join(root, path.endsWith("/") ? `${path}index.html` : path);
  if (!file.startsWith(root) || !existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
  createReadStream(file).pipe(res);
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}`;

const index = JSON.parse(readFileSync(join(root, "index.json"), "utf8"));
const stories = Object.values(index.entries).filter((entry) => entry.type === "story");
const browser = await chromium.launch();
const page = await (await browser.newContext()).newPage();
const failures = [];
try {
  for (const story of stories) {
    await page.goto(`${base}/iframe.html?id=${encodeURIComponent(story.id)}&viewMode=story`);
    // 빈 알림 영역처럼 보이지 않는 첫 자식도 있으므로 붙었는지만 기다린다.
    // 그리지 못한 스토리는 Storybook의 오류 문구와 함께 실패로 남기고 다음 스토리로 넘어간다.
    const rendered = await page
      .waitForSelector("#storybook-root > *", { state: "attached", timeout: 15_000 })
      .then(() => true)
      .catch(() => false);
    if (!rendered) {
      const reason = (await page.locator("#error-message").textContent().catch(() => null))?.trim() || "시간 안에 그려지지 않음";
      failures.push(`${story.title} › ${story.name}: 그리지 못함 — ${reason.slice(0, 300)}`);
      continue;
    }
    // 열린 상태 스토리(대화상자·메뉴·알림)는 마운트 뒤 나타나며 움직이므로, 애니메이션이 끝난 모습을 검사한다.
    await page.waitForTimeout(200);
    await page.evaluate(() => Promise.race([
      Promise.all(document.getAnimations().map((animation) => animation.finished.catch(() => {}))),
      new Promise((resolve) => setTimeout(resolve, 3000)),
    ]));
    // portal(body 아래)로 그리는 팝업도 보도록 문서 전체를 검사한다. 부품 하나만 놓인 화면이라
    // 페이지 단위 규칙(랜드마크, h1, 본문 바로가기)은 끈다(앱 화면은 E2E의 axe가 본다).
    // 백오피스 스토리는 개편 화면이라 사용자 지시로 글자 대비(color-contrast)를 검사하지 않는다. 다른 규칙은 그대로 본다.
    const skipped = ["region", "landmark-one-main", "page-has-heading-one", "bypass"];
    if (story.title.startsWith("백오피스/")) skipped.push("color-contrast");
    const { violations } = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
      .disableRules(skipped)
      // Base UI가 열린 메뉴·선택 상자 앞뒤에 두는 초점 가두기용 span(aria-hidden, 초점을 받자마자 넘김)은 뺀다.
      .exclude("[data-base-ui-focus-guard]")
      .analyze();
    for (const v of violations) {
      for (const node of v.nodes) failures.push(`${story.title} › ${story.name}: ${v.id} ${node.target.join(" ")} — ${node.failureSummary?.replace(/\s+/g, " ")}`);
    }
  }
} finally {
  await browser.close();
  server.close();
}

console.log(`스토리 ${stories.length}개 검사, 위반 ${failures.length}건`);
for (const failure of failures) console.error(failure);
process.exit(failures.length > 0 ? 1 : 0);

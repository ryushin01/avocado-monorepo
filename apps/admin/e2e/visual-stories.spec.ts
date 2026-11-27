import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { extname, join, normalize, resolve } from "node:path";

import { expect, test } from "@playwright/test";
import { z } from "zod";

/**
 * 시각 회귀(Storybook): 빌드한 Storybook(packages/ui/storybook-static)의 모든 스토리를 찍어 기준 이미지와 비교한다.
 * 공통 부품과 앱 표시용 컴포넌트의 상태별 모습(열린 대화상자·오류 등)을 앱 화면보다 촘촘히 본다.
 * `pnpm check visual`이 Storybook을 먼저 빌드한다.
 */
// Playwright는 apps/admin에서 돈다(pnpm --filter @avocado/admin exec playwright).
const root = `${resolve("../../packages/ui/storybook-static")}/`;
const IndexSchema = z.object({
  entries: z.record(z.string(), z.object({ id: z.string(), title: z.string(), name: z.string(), type: z.string() })),
});
const stories = existsSync(join(root, "index.json"))
  ? Object.values(IndexSchema.parse(JSON.parse(readFileSync(join(root, "index.json"), "utf8"))).entries).filter(
      (entry) => entry.type === "story",
    )
  : [];

const TYPES: Record<string, string> = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".webp": "image/webp",
};
let server: Server;
let base = "";

test.use({ storageState: { cookies: [], origins: [] }, viewport: { width: 1024, height: 768 }, reducedMotion: "reduce" });
test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  test.skip(stories.length === 0, "storybook-static이 없습니다. pnpm build-storybook을 먼저 실행하세요.");
  server = createServer((req, res) => {
    const path = normalize(decodeURIComponent(new URL(req.url ?? "/", "http://localhost").pathname)).replace(/^(\.\.[/\\])+/, "");
    const file = join(root, path.endsWith("/") ? `${path}index.html` : path);
    if (!file.startsWith(root) || !existsSync(file) || !statSync(file).isFile()) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
    createReadStream(file).pipe(res);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address: AddressInfo | string | null = server.address();
  base = typeof address === "object" && address ? `http://127.0.0.1:${address.port}` : "";
});
test.afterAll(() => new Promise<void>((resolve) => (server ? server.close(() => resolve()) : resolve())));

test("모든 스토리가 기준 이미지와 같다", async ({ page }) => {
  test.setTimeout(stories.length * 15_000);
  for (const story of stories) {
    await test.step(`${story.title} › ${story.name}`, async () => {
      await page.goto(`${base}/iframe.html?id=${encodeURIComponent(story.id)}&viewMode=story`);
      await page.waitForSelector("#storybook-root > *", { state: "attached" });
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(() =>
        Promise.race([
          Promise.all(document.getAnimations().map((animation) => animation.finished.catch(() => {}))),
          new Promise((resolve) => setTimeout(resolve, 3000)),
        ]),
      );
      await expect.soft(page).toHaveScreenshot(`story-${story.id}.png`, { animations: "disabled", caret: "hide" });
    });
  }
});

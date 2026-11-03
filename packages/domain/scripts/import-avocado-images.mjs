// avocado 데이터의 게임 이미지(BoardGameGeek 원본)를 한 번 내려받아 작은 webp 썸네일로 만든다.
// 결과: assets/games/<bggId>.webp, 자리표시 이미지 assets/game-placeholder.png
// 앱은 scripts/copy-assets.mjs로 이 파일들을 자기 public/images 아래에 복사해 쓴다.
// 이미 있는 썸네일은 건너뛴다. 다시 만들려면 --force를 붙인다.
//
// 사용법: node scripts/import-avocado-images.mjs [avocado 폴더 경로] [--force]
import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import sharp from "sharp";

/** 목록에서 가장 크게 그리는 썸네일이 48px이라, 레티나 화면을 생각해 두 배 이상으로 만든다. */
const THUMBNAIL_SIZE = 128;
const CONCURRENCY = 6;
const RETRIES = 2;

const args = process.argv.slice(2);
const force = args.includes("--force");
const avocadoDir =
  args.find((a) => !a.startsWith("--")) ??
  fileURLToPath(new URL("../../../../avocado-master/", import.meta.url));
const assetsDir = fileURLToPath(new URL("../assets/", import.meta.url));
const outDir = path.join(assetsDir, "games");
mkdirSync(outDir, { recursive: true });

// 로딩 중·이미지 없음에 쓰는 자리표시 (avocado 목록 화면의 배경 카드)
copyFileSync(
  path.join(avocadoDir, "public/images/list/bg.png"),
  path.join(assetsDir, "game-placeholder.png"),
);

const games = JSON.parse(
  readFileSync(path.join(avocadoDir, "public/data/boardgameAllData.json"), "utf8"),
).result;

async function download(url) {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "avocado-catalog-import" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (error) {
      if (attempt >= RETRIES) throw error;
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
}

const queue = games.filter((g) => g.bggId && g.image);
let made = 0;
let skipped = 0;
const failed = [];

async function worker() {
  for (let game = queue.shift(); game; game = queue.shift()) {
    const file = path.join(outDir, `${game.bggId}.webp`);
    if (!force && existsSync(file)) {
      skipped++;
      continue;
    }
    try {
      const original = await download(game.image);
      await sharp(original)
        .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, { fit: "cover", position: "attention" })
        .webp({ quality: 72 })
        .toFile(file);
      made++;
    } catch (error) {
      failed.push(`${game.name} (${game.bggId}): ${error.message}`);
    }
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));
console.log(`썸네일: 새로 만듦 ${made}개, 건너뜀 ${skipped}개, 실패 ${failed.length}개`);
if (failed.length) {
  console.error(failed.join("\n"));
  process.exitCode = 1;
}

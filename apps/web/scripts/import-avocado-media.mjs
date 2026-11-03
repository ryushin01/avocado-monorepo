// avocado의 사진·아이콘을 홍보 사이트용으로 옮긴다. 큰 사진은 webp로 줄인다.
// 결과는 public/images 아래에 두고 git에 넣는다. 다시 만들 때만 실행한다.
// 사용법: node scripts/import-avocado-media.mjs [avocado 폴더 경로]
import { copyFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const here = path.dirname(fileURLToPath(import.meta.url));
const avocado = process.argv[2] ?? path.join(here, "../../../../avocado-master");
const src = (p) => path.join(avocado, "public/images", p);
const out = path.join(here, "../public/images");

/** [avocado 원본, 결과 경로, 가로 크기] */
const PHOTOS = [
  ["main/hero_1.jpg", "hero/hero-1.webp", 1600],
  ["main/hero_2.jpg", "hero/hero-2.webp", 1600],
  ["main/hero_3.jpg", "hero/hero-3.webp", 1600],
  ["main/hero_4.jpg", "hero/hero-4.webp", 1600],
  ["main/hero_5.jpg", "hero/hero-5.webp", 1600],
  ["event/strategy_1.jpg", "banners/strategy.webp", 1600],
  ["event/thematic_1.jpg", "banners/thematic.webp", 1600],
  ["event/thematic_2.jpg", "banners/wargame.webp", 1600],
  ["event/abstract_1.jpg", "banners/abstract.webp", 1600],
];

for (const [from, to, width] of PHOTOS) {
  mkdirSync(path.dirname(path.join(out, to)), { recursive: true });
  await sharp(src(from))
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: 72 })
    .toFile(path.join(out, to));
}
copyFileSync(src("common/logo.png"), path.join(out, "logo.png"));
copyFileSync(src("common/icon_top_ten.png"), path.join(out, "top-ten.png"));
copyFileSync(src("common/logo.png"), path.join(here, "../src/app/icon.png"));
console.log(`사진 ${PHOTOS.length}장과 아이콘을 ${out}에 저장했습니다.`);

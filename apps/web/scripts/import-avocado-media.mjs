// avocado의 사진과 10위권 배지를 홍보 사이트용으로 옮긴다. 큰 사진은 webp로 줄인다.
// 결과는 public/images 아래에 두고 git에 넣는다. 다시 만들 때만 실행한다.
// 파비콘·앱 아이콘(src/app/favicon.ico·icon.png·apple-icon.png)은 세 앱이 함께 쓰는 아보카도 로고(원본은 키오스크 public/icon-512.png)라 여기서 만들지 않는다.
// avocado의 옛 로고(common/logo.png)로 덮어쓰면 세 앱의 아이콘이 달라진다(src/app/icons.test.ts가 확인).
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
copyFileSync(src("common/icon_top_ten.png"), path.join(out, "top-ten.png"));
console.log(`사진 ${PHOTOS.length}장과 10위권 배지를 ${out}에 저장했습니다.`);

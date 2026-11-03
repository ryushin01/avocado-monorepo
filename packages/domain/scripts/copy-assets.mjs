#!/usr/bin/env node
// 카탈로그 이미지(썸네일·자리표시)를 앱의 public/images 아래로 복사한다.
// 앱의 dev·build 스크립트가 맨 앞에서 실행한다. 복사본은 git에 넣지 않는다.
// 사용법: copy-catalog-assets <앱의 public 폴더>
import { cpSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const target = process.argv[2];
if (!target) {
  console.error("사용법: copy-catalog-assets <앱의 public 폴더>");
  process.exit(1);
}
const assets = fileURLToPath(new URL("../assets/", import.meta.url));
const images = path.resolve(target, "images");
mkdirSync(images, { recursive: true });
cpSync(path.join(assets, "games"), path.join(images, "games"), { recursive: true });
cpSync(path.join(assets, "game-placeholder.png"), path.join(images, "game-placeholder.png"));

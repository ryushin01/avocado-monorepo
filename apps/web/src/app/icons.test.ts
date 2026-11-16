import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

// 세 앱(홍보 사이트·백오피스·키오스크)은 같은 Noto 아보카도 아이콘을 쓴다.
// 한 앱만 바꾸거나 사진을 옮기는 스크립트가 옛 로고로 덮어쓰면 여기서 걸린다.
// 다른 앱의 파일도 읽으므로 turbo 입력에 넣어 두었다(apps/web/turbo.json).
const APPS = ["web", "admin", "launcher"] as const;
const ICONS = ["src/app/favicon.ico", "src/app/icon.png", "src/app/apple-icon.png"];

/** apps/<앱> 기준 경로의 파일 */
const read = (app: string, file: string) => readFileSync(new URL(`../../../${app}/${file}`, import.meta.url));

/** PNG 머리(IHDR)에 적힌 가로·세로 */
const pngSize = (png: Buffer) => [png.readUInt32BE(16), png.readUInt32BE(20)];

describe("앱 아이콘", () => {
  it.each(ICONS)("%s가 세 앱에서 같다", (file) => {
    const web = read("web", file);
    for (const app of APPS) expect(read(app, file).equals(web), app).toBe(true);
  });

  it("키오스크 설치 아이콘(192)이 파비콘용 icon.png와 같다", () => {
    expect(read("launcher", "public/icon-192.png").equals(read("web", "src/app/icon.png"))).toBe(true);
  });

  it("크기가 쓰는 곳(head의 sizes, 매니페스트)과 맞다", () => {
    expect(pngSize(read("web", "src/app/icon.png"))).toEqual([192, 192]);
    expect(pngSize(read("web", "src/app/apple-icon.png"))).toEqual([180, 180]);
    expect(pngSize(read("launcher", "public/icon-512.png"))).toEqual([512, 512]);
    expect(pngSize(read("launcher", "public/icon-maskable-512.png"))).toEqual([512, 512]);
  });
});

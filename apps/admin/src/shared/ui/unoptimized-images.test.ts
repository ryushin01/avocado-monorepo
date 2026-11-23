import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function collect(dir: string, found: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) collect(path, found);
    else if (/\.tsx$/.test(name) && !/\.(test|stories)\.tsx$/.test(name)) found.push(path);
  }
  return found;
}

describe("백오피스 이미지", () => {
  // Vercel 무료 플랜의 이미지 변환 한도를 넘으면 /_next/image가 402를 돌려 로고가 깨집니다.
  // 로고는 작은 PNG라 변환 없이 원본을 그대로 보냅니다(`unoptimized`).
  it("모든 next/image 그림은 변환 없이 원본 파일을 그대로 씁니다", () => {
    const missing: string[] = [];
    for (const file of collect(join(process.cwd(), "src"))) {
      const source = readFileSync(file, "utf8");
      for (const match of source.matchAll(/<Image\b[\s\S]*?\/>/g)) {
        if (!/\bunoptimized\b/.test(match[0])) {
          const line = source.slice(0, match.index).split("\n").length;
          missing.push(`${file.replace(`${process.cwd()}/`, "")}:${line}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });
});

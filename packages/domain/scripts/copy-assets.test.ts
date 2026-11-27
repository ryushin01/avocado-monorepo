import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";
import { z } from "zod";

/**
 * 앱의 build 스크립트는 맨 앞에서 카탈로그 이미지를 public/images로 복사한다(copy-catalog-assets).
 * Turborepo가 빌드 캐시를 쓰면 스크립트를 건너뛰고 outputs만 되살리므로, 복사본이 outputs에 없으면
 * 캐시로 되살린 빌드에는 게임 썸네일이 없어 오프라인 대체 표지가 깨진다.
 */
const root = new URL("../../../", import.meta.url);
const readJson = (path: string) => JSON.parse(readFileSync(new URL(path, root), "utf8"));

const Turbo = z.object({ tasks: z.object({ build: z.object({ outputs: z.array(z.string()) }) }) });
const AppPackage = z.object({ scripts: z.object({ build: z.string() }) });

describe("카탈로그 이미지 복사본과 빌드 캐시", () => {
  const outputs = Turbo.parse(readJson("turbo.json")).tasks.build.outputs;

  for (const app of ["admin", "launcher", "web"]) {
    it(`${app}: 빌드가 복사하는 이미지를 캐시가 함께 되살린다`, () => {
      const { build } = AppPackage.parse(readJson(`apps/${app}/package.json`)).scripts;
      expect(build).toMatch(/^copy-catalog-assets public && /);
      expect(outputs).toEqual(expect.arrayContaining(["public/images/games/**", "public/images/game-placeholder.png"]));
    });
  }
});

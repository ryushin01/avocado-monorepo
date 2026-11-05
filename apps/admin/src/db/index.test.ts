import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { openPglite } from "./index";
import { cafes } from "./schema";

describe("openPglite", () => {
  const dirs: string[] = [];
  afterEach(() => dirs.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true })));

  it("처음 내려받은 저장소처럼 상위 폴더가 없어도 만들고 마이그레이션한다", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "avocado-pglite-"));
    dirs.push(root);
    const dataDir = path.join(root, ".data/pglite");

    const db = await openPglite(dataDir);

    expect(existsSync(dataDir)).toBe(true);
    expect(await db.select().from(cafes)).toEqual([]);
  });
});

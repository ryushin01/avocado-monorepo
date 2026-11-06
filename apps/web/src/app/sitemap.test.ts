import { describe, expect, it } from "vitest";

import { CATALOG_GAMES, CATEGORY_INFO } from "@avocado/domain/catalog";

import sitemap from "./sitemap";

describe("sitemap", () => {
  it("홈, 소개, 모든 유형과 게임을 빠짐없이 담는다", () => {
    const urls = sitemap().map((entry) => new URL(entry.url).pathname);
    expect(urls).toHaveLength(2 + CATEGORY_INFO.length + CATALOG_GAMES.length);
    expect(urls).toContain("/about");
    expect(urls).toContain(`/games/${CATEGORY_INFO[0].key}`);
    expect(urls).toContain(`/game/${CATALOG_GAMES[0].bggId}`);
  });
});

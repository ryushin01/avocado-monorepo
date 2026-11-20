import type { MetadataRoute } from "next";

import { CATALOG_GAMES, CATEGORY_INFO } from "@avocado/domain/catalog";

import { siteUrl } from "@/shared/config";

export function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    "",
    "/about",
    "/reservation",
    ...CATEGORY_INFO.map((c) => `/games/${c.key}`),
    ...CATALOG_GAMES.map((g) => `/game/${g.bggId}`),
  ];
  return paths.map((path) => ({ url: `${siteUrl()}${path}` }));
}

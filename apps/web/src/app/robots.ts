import type { MetadataRoute } from "next";

import { siteUrl } from "@/shared/config/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/monitoring" },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}

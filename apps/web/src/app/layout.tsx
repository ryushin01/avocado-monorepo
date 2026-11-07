import { SkipLink } from "@avocado/ui/components/skip-link";
import type { Metadata } from "next";
import localFont from "next/font/local";

import { CATEGORY_INFO } from "@avocado/domain/catalog";

import { SiteFooter } from "@/widgets/site-footer";
import { SiteMenuProvider } from "@/widgets/site-header";
import { BRAND, SHARE_IMAGE } from "@/shared/config/site";
import { siteUrl } from "@/shared/config/site-url";
import { WebVitals } from "@/shared/lib/analytics";

import "./globals.css";

// 공통 테마의 font-sans가 이 변수를 읽는다.
const d2Coding = localFont({ src: "./fonts/d2coding.woff2", variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: BRAND.name, template: `%s | ${BRAND.name}` },
  description: BRAND.description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: BRAND.name,
    title: BRAND.name,
    description: BRAND.description,
    url: "/",
    images: [SHARE_IMAGE],
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${d2Coding.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col break-keep bg-page">
        <SkipLink />
        <SiteMenuProvider categories={CATEGORY_INFO.map(({ key, label }) => ({ key, label }))}>
          <div className="flex flex-1 flex-col">{children}</div>
        </SiteMenuProvider>
        <SiteFooter />
        <WebVitals />
      </body>
    </html>
  );
}

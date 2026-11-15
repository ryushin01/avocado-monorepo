import { SkipLink } from "@avocado/ui/components/skip-link";
import type { Metadata } from "next";
import { Comfortaa, Gowun_Dodum } from "next/font/google";

import { CATEGORY_INFO } from "@avocado/domain/catalog";

import { SiteFooter } from "@/widgets/site-footer";
import { SiteMenuProvider } from "@/widgets/site-header";
import { BRAND, SHARE_IMAGE } from "@/shared/config/site";
import { siteUrl } from "@/shared/config/site-url";
import { WebVitals } from "@/shared/lib/analytics";

import "./globals.css";

// 보드게임 카페의 놀이 분위기: 한글은 제목·본문 모두 고운돋움, 영문·숫자는 둥근 Comfortaa.
// 한글 글꼴은 글자 묶음별 조각 파일이라 미리 받지 않고(preload: false) 화면에 쓰인 조각만 받는다.
const gowunDodum = Gowun_Dodum({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-gowun-dodum",
  display: "swap",
  preload: false,
});
const comfortaa = Comfortaa({
  subsets: ["latin"],
  variable: "--font-comfortaa",
  display: "swap",
});
const fontVariables = [gowunDodum.variable, comfortaa.variable].join(" ");

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
    <html lang="ko" className={`${fontVariables} h-full antialiased`}>
      <body className="flex min-h-full flex-col break-keep bg-page">
        <SkipLink />
        <SiteMenuProvider
          categories={CATEGORY_INFO.map(({ key, label }) => ({ key, label }))}
        >
          <div className="flex flex-1 flex-col">{children}</div>
        </SiteMenuProvider>
        <SiteFooter />
        <WebVitals />
      </body>
    </html>
  );
}

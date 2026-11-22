import { SkipLink } from "@avocado/ui/components/skip-link";
import type { Metadata } from "next";

import { CATEGORY_INFO } from "@avocado/domain/catalog";

import { SiteFooter } from "@/widgets/site-footer";
import { SiteMenuProvider } from "@/widgets/site-header";
import { BRAND, SHARE_IMAGE, siteUrl } from "@/shared/config";
import { WebVitals } from "@/shared/lib/analytics";

import "@fontsource-variable/comfortaa/wght.css";
import "@fontsource/gowun-dodum/400.css";
import "../styles/globals.css";

// 보드게임 카페의 놀이 분위기: 한글은 제목·본문 모두 고운돋움, 영문·숫자는 둥근 Comfortaa.
// 글꼴은 패키지(Fontsource, OFL)에 든 파일을 함께 배포해 빌드·실행 모두 외부 글꼴 서버 없이 동작한다.
// 글자 묶음별 조각 파일(unicode-range)이라 미리 받지 않고 화면에 쓰인 조각만 받는다(글꼴 이름은 globals.css의 --font-*).

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

export function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
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

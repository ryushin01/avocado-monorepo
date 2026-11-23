import { SkipLink } from "@avocado/ui/components/skip-link";
import type { Metadata } from "next";
import { SidebarStateScript, SidebarWidthScript } from "@avocado/ui/components/sidebar";
import { Toaster } from "@avocado/ui/components/sonner";

// 글꼴은 패키지(Fontsource, OFL)에 든 파일을 함께 배포해 빌드·실행 모두 외부 글꼴 서버 없이 동작한다.
// 본문·제목은 Instrument Sans, 라벨·경로 칩은 IBM Plex Mono(글꼴 이름은 globals.css의 --font-*).
import "@fontsource-variable/instrument-sans/wght.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "보드게임 카페 백오피스",
  description: "보드게임 카페 프랜차이즈 운영 백오피스",
};

export function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">
        <SkipLink />
        <SidebarWidthScript />
        {children}
        <SidebarStateScript />
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}

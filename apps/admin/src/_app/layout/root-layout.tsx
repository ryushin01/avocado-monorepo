import { SkipLink } from "@avocado/ui/components/skip-link";
import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { SidebarStateScript, SidebarWidthScript } from "@avocado/ui/components/sidebar";
import { Toaster } from "@avocado/ui/components/sonner";

import "../styles/globals.css";

export const metadata: Metadata = {
  title: "보드게임 카페 백오피스",
  description: "보드게임 카페 프랜차이즈 운영 백오피스",
};

export function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
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

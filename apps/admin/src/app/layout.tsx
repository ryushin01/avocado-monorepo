import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SidebarStateScript, SidebarWidthScript } from "@avocado/ui/components/sidebar";
import { Toaster } from "@avocado/ui/components/sonner";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "보드게임 카페 백오피스",
  description: "보드게임 카페 프랜차이즈 운영 백오피스",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SidebarWidthScript />
        {children}
        <SidebarStateScript />
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";

import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "보드게임 카페 키오스크",
  description: "매장 보유 게임을 둘러보고 예약·대기를 확인하는 손님용 화면",
};

// 매장 태블릿에서 전체 화면으로 띄우므로 확대를 막는다.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-muted/40">{children}</body>
    </html>
  );
}

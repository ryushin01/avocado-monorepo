import { SkipLink } from "@avocado/ui/components/skip-link";
import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";

import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "보드게임 카페 키오스크",
  description: "매장 보유 게임을 둘러보고 예약·대기를 확인하는 손님용 화면",
};

// 손님이 글자를 키워 볼 수 있게 확대는 막지 않는다(WCAG 1.4.4). 확대한 채 떠나도 자동 복귀(IdleReturn) 때
// 페이지를 새로 열어 원래 크기로 돌아간다.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-muted/40">
        <SkipLink />
        {children}
      </body>
    </html>
  );
}

import type { MetadataRoute } from "next";

// 매장 태블릿 홈 화면에 설치해 전체 화면 키오스크로 띄운다.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "보드게임 카페 키오스크",
    short_name: "키오스크",
    description: "매장 보유 게임을 둘러보고 예약·대기를 확인하는 손님용 화면",
    lang: "ko",
    start_url: "/",
    display: "fullscreen",
    background_color: "#f3f7ea",
    theme_color: "#f3f7ea",
    // 아보카도는 마스크 안전 영역 안에 있고 배경이 가장자리까지 채워져 있어 maskable로도 쓴다.
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}

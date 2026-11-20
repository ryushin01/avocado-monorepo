import type { Preview } from "@storybook/nextjs-vite";

import "../src/styles/globals.css";

const preview: Preview = {
  parameters: {
    layout: "centered",
    // 앱처럼 App Router로 Link·useRouter를 흉내 낸다.
    nextjs: { appDirectory: true },
    // axe 위반은 a11y 패널에 오류로 보인다(앱 E2E의 axe 검사와 같은 기준).
    a11y: { test: "error" },
    controls: { expanded: true },
  },
  tags: ["autodocs"],
};

export default preview;

import type { Decorator, Preview } from "@storybook/nextjs-vite";

import webCss from "../../../apps/web/src/_app/styles/globals.css?inline";

import "./storybook.css";

/**
 * 홈페이지 스토리는 홈페이지 색(어두운 바탕, 주황 강조, 전용 색)을 그 스토리를 보는 동안만 덧씌운다.
 * 스타일을 스토리와 함께 그렸다가 지우므로 다른 스토리로 새지 않는다. 백오피스·키오스크는 공통 테마 그대로다.
 */
const withAppTheme: Decorator = (Story, context) =>
  context.title.startsWith("홈페이지/") ? (
    <>
      <style>{webCss}</style>
      <Story />
    </>
  ) : (
    <Story />
  );

const preview: Preview = {
  parameters: {
    layout: "centered",
    // 앱처럼 App Router로 Link·useRouter를 흉내 낸다.
    nextjs: { appDirectory: true },
    // axe 위반은 a11y 패널에 오류로 보인다(앱 E2E의 axe 검사와 같은 기준).
    a11y: { test: "error" },
    controls: { expanded: true },
  },
  decorators: [withAppTheme],
  tags: ["autodocs"],
};

export default preview;

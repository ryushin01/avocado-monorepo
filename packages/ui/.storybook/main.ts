import tailwindcss from "@tailwindcss/vite";
import type { StorybookConfig } from "@storybook/nextjs-vite";

/**
 * 공통 UI(shadcn/ui) 부품을 앱 밖에서 보고, a11y 애드온(axe)으로 접근성을 확인한다.
 * Next.js의 Link·라우터는 @storybook/nextjs-vite가 대신하고, Tailwind는 Vite 플러그인으로 앱과 같은 CSS를 만든다.
 */
const config: StorybookConfig = {
  stories: ["../src/**/*.stories.tsx"],
  addons: ["@storybook/addon-docs", "@storybook/addon-a11y"],
  framework: { name: "@storybook/nextjs-vite", options: {} },
  core: { disableTelemetry: true },
  viteFinal: async (viteConfig) => ({
    ...viteConfig,
    plugins: [...(viteConfig.plugins ?? []), tailwindcss()],
  }),
};

export default config;

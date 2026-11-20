import path from "node:path";
import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import type { StorybookConfig } from "@storybook/nextjs-vite";
import type { Plugin } from "vite";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));

/**
 * 앱 스토리(apps/<앱>/src)는 그 앱의 `@/` 경로(앱 src)로 가져온다. 한 Storybook에서 세 앱의 `@/`가 겹치므로,
 * 가져오는 파일이 속한 앱의 src로 바꿔 찾는다.
 */
function appAlias(): Plugin {
  return {
    name: "avocado-app-alias",
    enforce: "pre",
    resolveId(source, importer, options) {
      if (!source.startsWith("@/") || !importer) return null;
      const app = importer.match(/[\\/]apps[\\/](admin|launcher|web)[\\/]src[\\/]/)?.[1];
      if (!app) return null;
      return this.resolve(path.join(repoRoot, "apps", app, "src", source.slice(2)), importer, {
        ...options,
        skipSelf: true,
      });
    },
  };
}

/**
 * 공통 UI(shadcn/ui) 부품과 세 앱의 표시용 컴포넌트를 앱 밖에서 보고, a11y 애드온(axe)으로 접근성을 확인한다.
 * Next.js의 Link·Image·라우터는 @storybook/nextjs-vite가 대신하고, Tailwind는 Vite 플러그인으로 앱과 같은 CSS를 만든다.
 */
const config: StorybookConfig = {
  stories: ["../src/**/*.stories.tsx", "../../../apps/*/src/**/*.stories.tsx"],
  addons: ["@storybook/addon-docs", "@storybook/addon-a11y"],
  framework: { name: "@storybook/nextjs-vite", options: {} },
  core: { disableTelemetry: true },
  viteFinal: async (viteConfig) => ({
    ...viteConfig,
    plugins: [...(viteConfig.plugins ?? []), appAlias(), tailwindcss()],
  }),
};

export default config;

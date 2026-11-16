import fsd from "@feature-sliced/steiger-plugin";
import { defineConfig } from "steiger";

export default defineConfig([
  ...fsd.configs.recommended,
  {
    // Next.js의 app·pages 폴더와 겹치지 않게 FSD 레이어 이름을 _app, _pages로 쓴다.
    rules: { "fsd/typo-in-layer-name": "off" },
  },
  {
    // Next.js 라우트 폴더(src/app)는 FSD 레이어가 아니라 _pages·_app을 다시 내보내기만 한다.
    // 테스트와 스토리는 슬라이스 밖에서 쓰지 않으므로 공개 API 검사에서 뺀다.
    ignores: ["src/app/**", "**/*.test.ts", "**/*.test.tsx", "**/*.stories.tsx"],
  },
]);

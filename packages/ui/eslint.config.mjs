import { defineConfig } from "eslint/config";

import { nextAppConfig } from "@avocado/config/eslint-next";

export default defineConfig([
  ...nextAppConfig,
  // shadcn/ui CLI가 만든 원본 부품이라 고치면 다시 받을 때 덮어써진다. 규칙 쪽에서 예외로 둔다.
  {
    // Label은 쓰는 곳에서 htmlFor를 넘기는 감싸개다.
    files: ["src/components/label.tsx"],
    rules: { "jsx-a11y/label-has-associated-control": "off" },
  },
  {
    // 덧붙인 글자·아이콘을 마우스로 눌러도 입력란에 초점을 주는 편의 기능이다. 키보드로는 입력란에 바로 Tab으로 간다.
    files: ["src/components/input-group.tsx"],
    rules: {
      "jsx-a11y/click-events-have-key-events": "off",
      "jsx-a11y/no-noninteractive-element-interactions": "off",
    },
  },
]);

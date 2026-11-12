// Next.js 앱 공통 ESLint 설정. 앱마다 eslint.config.mjs에서 펼쳐 쓴다.
import { globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// eslint-config-next가 등록한 jsx-a11y 플러그인을 그대로 쓴다. 플러그인을 다시 등록하면 중복 오류가 난다.
const jsxA11y = nextVitals.find((config) => config.plugins?.["jsx-a11y"])?.plugins?.["jsx-a11y"];

export const nextAppConfig = [
  ...nextVitals,
  ...nextTs,
  {
    // eslint-config-next는 jsx-a11y 규칙을 몇 개만 켠다. recommended 규칙을 모두 켠다.
    files: ["**/*.{jsx,tsx}"],
    rules: {
      ...jsxA11y.flatConfigs.recommended.rules,
      // 가로로 스크롤되는 영역은 키보드로 스크롤할 수 있게 이름을 가진 region에 tabIndex={0}을 준다.
      "jsx-a11y/no-noninteractive-tabindex": ["error", { tags: [], roles: ["tabpanel", "region"] }],
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "coverage/**", "next-env.d.ts"]),
];

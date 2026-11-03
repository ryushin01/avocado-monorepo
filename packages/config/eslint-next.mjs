// Next.js 앱 공통 ESLint 설정. 앱마다 eslint.config.mjs에서 펼쳐 쓴다.
import { globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export const nextAppConfig = [
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
];

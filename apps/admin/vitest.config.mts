import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    // 저장소 테스트는 테스트마다 새 PGlite에 마이그레이션을 적용해 CI처럼 느린 컴퓨터에서는 5초를 넘긴다.
    testTimeout: 30_000,
  },
});

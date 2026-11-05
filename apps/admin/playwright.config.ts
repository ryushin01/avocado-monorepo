import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    // 실제 로그인 화면으로 한 번 로그인해 세션을 저장한다(e2e/auth.setup.ts).
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "chromium",
      // 기본은 관리자로 로그인한 상태. 스태프는 loginAs(context, USERS.hongdaeStaff)
      use: { ...devices["Desktop Chrome"], storageState: "e2e/.auth/admin.json" },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    command: `pnpm dev --port ${PORT}`,
    // E2E마다 새 메모리 DB(시드)로 시작하고, 로그인 주소를 테스트 포트에 맞춘다.
    env: {
      PGLITE_DATA_DIR: "memory://",
      NEXTAUTH_URL: `http://localhost:${PORT}`,
      NEXTAUTH_SECRET: "e2e-only-secret",
    },
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});

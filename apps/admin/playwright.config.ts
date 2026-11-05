import { defineConfig, devices } from "@playwright/test";

import { LAUNCHER_PORT } from "./e2e/helpers";

const PORT = 3100;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  expect: { timeout: 10_000 },
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
  // Next.js 권장대로 프로덕션 빌드로 테스트한다. 개발 서버는 메모리가 차면 스스로 다시 켜져
  // (devMemoryThresholdRestart) 메모리 DB가 초기화되고 접속이 잠깐 끊겨, 테스트가 가끔 실패했다.
  webServer: [
    {
      command: `pnpm build && pnpm start --port ${PORT}`,
      url: `http://localhost:${PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 300_000,
      // E2E마다 새 메모리 DB에 개발용 시드를 넣고 시작하고, 로그인 주소를 테스트 포트에 맞춘다.
      env: {
        PGLITE_DATA_DIR: "memory://",
        SEED_DEMO: "1",
        NEXTAUTH_URL: `http://localhost:${PORT}`,
        NEXTAUTH_SECRET: "e2e-only-secret",
      },
    },
    {
      // 키오스크 테스트용 런처: 둔산점, 개발용 기기 토큰으로 위 백오피스를 읽는다(e2e/kiosk.spec.ts).
      command: `pnpm --dir ../launcher build && pnpm --dir ../launcher start --port ${LAUNCHER_PORT}`,
      url: `http://localhost:${LAUNCHER_PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 300_000,
      env: {
        BACKOFFICE_URL: `http://localhost:${PORT}`,
        LAUNCHER_CAFE_ID: "c_dunsan",
        KIOSK_API_TOKEN: "kio_dev_c_dunsan",
      },
    },
  ],
});

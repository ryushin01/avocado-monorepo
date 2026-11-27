import { defineConfig, devices } from "@playwright/test";

import {
  ADMIN_PORT,
  DEAD_URL,
  DEPLOYED_ADMIN_PORT,
  DEPLOYED_ADMIN_URL,
  DEPLOYED_LAUNCHER_URL,
  DEPLOYED_WEB_URL,
  LAUNCHER_PORT,
  WEB_PORT,
} from "./e2e/helpers";

const PORT = ADMIN_PORT;
const BOOKING_TOKEN = "e2e-booking-token";

// CI는 앞 단계의 pnpm build 결과를 그대로 쓴다.
const buildThen = (command: string, dir = ".") =>
  process.env.CI ? `pnpm --dir ${dir} ${command}` : `pnpm --dir ${dir} build && pnpm --dir ${dir} ${command}`;
// 같은 빌드를 한 번 더 띄우는 서버(배포본 흉내)는 빌드를 다시 하지 않는다. 위 서버가 빌드를 마친 뒤 뜨도록 뒤에 둔다.
const portOf = (url: string) => new URL(url).port;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  expect: {
    timeout: 10_000,
    // 시각 회귀: 글꼴 경계의 안티에일리어싱 정도만 허용한다.
    toHaveScreenshot: { maxDiffPixelRatio: 0.002 },
  },
  // 기준 이미지는 리눅스(Playwright 공식 Docker 이미지) 결과물 하나만 둔다(e2e/visual.spec.ts).
  snapshotPathTemplate: "{testDir}/__screenshots__/{arg}{ext}",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    // 실제 로그인 화면으로 한 번 로그인해 세션을 저장한다(e2e/auth.setup.ts).
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "chromium",
      testIgnore: /visual(-stories)?\.spec\.ts/,
      // 기본은 관리자로 로그인한 상태. 스태프는 loginAs(context, USERS.hongdaeStaff)
      use: { ...devices["Desktop Chrome"], storageState: "e2e/.auth/admin.json" },
      dependencies: ["setup"],
    },
    // 시각 회귀(pnpm check visual). 다른 E2E가 바꾼 데이터가 섞이지 않게 새 서버로 따로 돌고, 리눅스 기준 이미지와 비교한다.
    ...(process.env.VISUAL
      ? [
          {
            name: "visual",
            testMatch: /visual(-stories)?\.spec\.ts/,
            use: { ...devices["Desktop Chrome"], storageState: "e2e/.auth/admin.json" },
            dependencies: ["setup"],
          },
        ]
      : []),
    // README 화면 촬영(pnpm screenshots). 검사가 아니라 화면 파일을 덮어쓰므로 SCREENSHOTS=1일 때만 넣습니다.
    ...(process.env.SCREENSHOTS
      ? [
          {
            name: "screenshots",
            testMatch: /readme\.screenshots\.ts/,
            use: { ...devices["Desktop Chrome"] },
            dependencies: ["setup"],
          },
        ]
      : []),
  ],
  // Next.js 권장대로 프로덕션 빌드로 테스트한다. 개발 서버는 메모리가 차면 스스로 다시 켜져
  // (devMemoryThresholdRestart) 메모리 DB가 초기화되고 접속이 잠깐 끊겨, 테스트가 가끔 실패했다.
  webServer: [
    {
      command: buildThen(`start --port ${PORT}`),
      url: `http://localhost:${PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 300_000,
      // E2E마다 새 메모리 DB에 개발용 시드를 넣고 시작하고, 로그인 주소를 테스트 포트에 맞춘다.
      env: {
        PGLITE_DATA_DIR: "memory://",
        SEED_DEMO: "1",
        NEXTAUTH_URL: `http://localhost:${PORT}`,
        NEXTAUTH_SECRET: "e2e-only-secret",
        // 홈페이지의 온라인 예약이 부르는 예약 API의 토큰(e2e/booking.spec.ts)
        BOOKING_API_TOKEN: BOOKING_TOKEN,
      },
    },
    {
      // 키오스크 테스트용 런처: 둔산점, 개발용 기기 토큰으로 위 백오피스를 읽는다(e2e/kiosk.spec.ts).
      command: buildThen(`start --port ${LAUNCHER_PORT}`, "../launcher"),
      url: `http://localhost:${LAUNCHER_PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 300_000,
      env: {
        BACKOFFICE_URL: `http://localhost:${PORT}`,
        LAUNCHER_CAFE_ID: "c_dunsan",
        KIOSK_API_TOKEN: "kio_dev_c_dunsan",
      },
    },
    {
      // 홈페이지(e2e/web.spec.ts). 온라인 예약만 위 백오피스의 예약 API를 부른다(e2e/booking.spec.ts).
      command: buildThen(`start --port ${WEB_PORT}`, "../web"),
      url: `http://localhost:${WEB_PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 300_000,
      env: {
        BACKOFFICE_URL: `http://localhost:${PORT}`,
        BOOKING_API_TOKEN: BOOKING_TOKEN,
      },
    },
    // 배포본에서 외부가 끊긴 상황(e2e/deployed-offline.spec.ts): 공개 데모 설정으로 띄우되 공유 데모 DB와 백오피스 주소를
    // 아무도 듣지 않는 포트로 준다. NEXT_PUBLIC_DEMO_MODE는 서버 코드가 켤 때 읽으므로 다시 빌드하지 않는다.
    {
      command: `pnpm --dir . exec next start --port ${DEPLOYED_ADMIN_PORT}`,
      url: `${DEPLOYED_ADMIN_URL}/login`,
      reuseExistingServer: !process.env.CI,
      timeout: 300_000,
      env: {
        NEXT_PUBLIC_DEMO_MODE: "1",
        DATABASE_URL: `postgres://demo:demo@${new URL(DEAD_URL).host}/demo`,
        NEXTAUTH_URL: DEPLOYED_ADMIN_URL,
        NEXTAUTH_SECRET: "e2e-only-secret",
      },
    },
    {
      command: `pnpm --dir ../launcher exec next start --port ${portOf(DEPLOYED_LAUNCHER_URL)}`,
      url: DEPLOYED_LAUNCHER_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 300_000,
      env: {
        NEXT_PUBLIC_DEMO_MODE: "1",
        BACKOFFICE_URL: DEAD_URL,
        LAUNCHER_CAFE_ID: "c_gangnam",
        KIOSK_API_TOKEN: "kio_dev_c_gangnam",
      },
    },
    {
      command: `pnpm --dir ../web exec next start --port ${portOf(DEPLOYED_WEB_URL)}`,
      url: DEPLOYED_WEB_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 300_000,
      env: {
        BACKOFFICE_URL: DEAD_URL,
        BOOKING_API_TOKEN: BOOKING_TOKEN,
      },
    },
  ],
});

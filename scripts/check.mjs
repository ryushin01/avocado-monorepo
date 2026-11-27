#!/usr/bin/env node
// CI와 같은 검사를 한 명령으로 돌린다. CI(.github/workflows/ci.yml)도 단계별로 이 스크립트를 부른다.
//   pnpm check                 모든 단계를 차례로(static → build → lhci → e2e → stories → visual)
//   pnpm check <단계> [인자...]  한 단계만. e2e는 뒤 인자를 Playwright에 넘긴다(예: pnpm check e2e --shard=1/2)
// 단계
//   static   보안 감사·타입 검사·린트·단위 테스트 커버리지와 기준 비교(scripts/coverage-report.mjs)
//   build    세 앱 빌드와 번들 예산(size-limit: 홍보 사이트·백오피스·키오스크)
//   lhci     홍보 사이트 Lighthouse 기준. CI 밖에서는 결과를 파일로만 남긴다(.lighthouseci)
//   e2e      Playwright E2E(오프라인·접근성 포함). 앞 단계의 빌드를 쓴다
//   stories  Storybook 빌드와 모든 스토리 axe 검사
//   visual   시각 회귀(세 앱 주요 화면 + 모든 스토리). 기준 이미지가 리눅스 결과물이라 리눅스에서만 돌고,
//            macOS 등에서는 Playwright 공식 Docker 이미지 안(tmpfs)에서 돌린다(Docker가 없으면 건너뜀).
//            기준 이미지를 새로 만들 때: pnpm check visual --update-snapshots=all
// 환경 변수: CHECK_AFFECTED=1이면 static 단계를 바뀐 패키지만(turbo --affected) 돈다(CI의 PR).
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const ci = Boolean(process.env.CI);
const [phase = "all", ...rest] = process.argv.slice(2);

function run(command, args, env = {}) {
  console.log(`\n▶ ${[command, ...args].join(" ")}`);
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit", env: { ...process.env, ...env } });
  if (result.status !== 0) {
    console.error(`✖ 실패: ${[command, ...args].join(" ")}`);
    process.exit(result.status ?? 1);
  }
}

const affected = process.env.CHECK_AFFECTED === "1" ? ["--affected"] : [];

const PHASES = {
  static() {
    run("pnpm", ["audit", "--prod", "--audit-level", "high"]);
    run("pnpm", ["turbo", "run", "typecheck", "lint", "test:coverage", ...affected]);
    run("node", ["scripts/coverage-report.mjs"]);
  },
  build() {
    run("pnpm", ["build"]);
    for (const app of ["@avocado/web", "@avocado/admin", "@avocado/launcher"]) run("pnpm", ["--filter", app, "size"]);
  },
  lhci() {
    // 로컬에서는 공개 임시 저장소로 올리지 않는다.
    run("pnpm", ["--filter", "@avocado/web", "lhci", ...(ci ? [] : ["--upload.target=filesystem"])]);
  },
  e2e() {
    run("pnpm", ["--filter", "@avocado/admin", "exec", "playwright", "test", "--project=chromium", ...rest]);
  },
  stories() {
    run("pnpm", ["build-storybook"]);
    run("pnpm", ["test:stories"]);
  },
  visual() {
    if (process.platform === "linux") {
      if (!existsSync(join(root, "packages/ui/storybook-static/index.json"))) run("pnpm", ["build-storybook"]);
      run("pnpm", ["--filter", "@avocado/admin", "exec", "playwright", "test", "--project=visual", ...rest], { VISUAL: "1" });
      return;
    }
    visualInDocker();
  },
};

/** 리눅스가 아니면 CI와 같은 Playwright 이미지 안에서 돈다. 디스크 대신 메모리(tmpfs)에 설치·빌드하고 결과만 꺼낸다. */
function visualInDocker() {
  if (spawnSync("docker", ["info"], { stdio: "ignore" }).status !== 0) {
    console.warn("⚠ Docker가 없어 시각 회귀를 건너뜁니다. CI(visual 작업)에서 확인합니다.");
    return;
  }
  const version = JSON.parse(readFileSync(join(root, "apps/admin/node_modules/@playwright/test/package.json"), "utf8")).version;
  const pnpm = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).packageManager;
  const args = rest.map((a) => `'${a.replaceAll("'", "'\\''")}'`).join(" ");
  // 저장소를 읽기 전용으로 붙이고, 의존성·빌드 결과를 빼고 tmpfs로 복사한 뒤 리눅스용으로 설치한다.
  // 기준 이미지·실패 리포트만 다시 저장소로 복사한다.
  const script = [
    "set -e",
    "mkdir -p /work && cd /src",
    "tar --exclude=node_modules --exclude=.next --exclude=.turbo --exclude=storybook-static --exclude=test-results --exclude=playwright-report -cf - . | tar -xf - -C /work",
    "cd /work",
    `npm install -g ${pnpm} >/dev/null`,
    // 패키지 저장소도 tmpfs 안에 둬서(같은 파일 시스템이라 하드 링크) 컨테이너 디스크를 쓰지 않는다.
    "pnpm install --frozen-lockfile --store-dir /work/.pnpm-store",
    "pnpm build",
    "pnpm build-storybook",
    `status=0; VISUAL=1 CI=1 pnpm --filter @avocado/admin exec playwright test --project=visual ${args} || status=$?`,
    "rm -rf /src/apps/admin/e2e/__screenshots__ && cp -a apps/admin/e2e/__screenshots__ /src/apps/admin/e2e/ 2>/dev/null || true",
    "rm -rf /src/apps/admin/test-results && cp -a apps/admin/test-results /src/apps/admin/ 2>/dev/null || true",
    "exit $status",
  ].join("\n");
  run("docker", [
    "run",
    "--rm",
    "--ipc=host",
    "-e",
    "CI=1",
    "--tmpfs",
    "/work:rw,exec,size=5g",
    "-v",
    `${root}:/src`,
    `mcr.microsoft.com/playwright:v${version}-noble`,
    "bash",
    "-c",
    script,
  ]);
}

const order = ["static", "build", "lhci", "e2e", "stories", "visual"];
if (phase === "all") {
  for (const name of order) {
    console.log(`\n=== ${name} ===`);
    PHASES[name]();
  }
} else if (PHASES[phase]) {
  PHASES[phase]();
} else {
  console.error(`알 수 없는 단계: ${phase}. 쓸 수 있는 단계: ${order.join(", ")}`);
  process.exit(1);
}

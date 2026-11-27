#!/usr/bin/env node
// 패키지마다 단위 테스트 커버리지(coverage/coverage-summary.json)를 읽어 표로 보여 주고 기준과 비교한다.
// - 전체: coverage-baseline.json에 적어 둔 값 아래로 내려가면 실패한다(지금 값을 기준선으로 건다).
// - 로직 계층: 화면·프레임워크 접착 코드를 뺀 순수 로직(아래 LOGIC)은 80% 아래면 실패한다.
// 표는 GitHub Actions의 작업 요약($GITHUB_STEP_SUMMARY)에도 쓴다.
// 사용: pnpm test:coverage 뒤 node scripts/coverage-report.mjs [--update]
//   --update: 지금 값을 새 기준선으로 적는다(커버리지가 오른 뒤에만 쓴다. 내리는 데 쓰지 않는다).
import { appendFileSync, existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const baselinePath = join(root, "coverage-baseline.json");
const METRICS = ["lines", "statements", "functions", "branches"];
const LOGIC_MIN = 80;

/**
 * 로직 계층: 백오피스 서버·DB 저장소, FSD의 model·lib·api 조각, 설정, 공통 패키지.
 * 뺀 것과 이유: 화면(.tsx)·React 훅(use-*)은 컴포넌트 테스트·E2E가, 서버 액션(_pages/*\/api/actions.ts)과
 * 요청 시점만 표시하고 저장소를 부르는 얇은 data.ts·인증 설정·DB 연결(db/server.ts)은 Next.js 실행 환경이 필요해 E2E가 본다.
 */
const LOGIC = {
  include: /\/src\/(server|db)\/|\/src\/entities\/[^/]+\/model\/|\/src\/shared\/(lib|api|config)\/|\/src\/_pages\/[^/]+\/model\/|\/packages\/(domain|logger|monitoring)\//,
  exclude: /\/migrations\/|\/data\.ts$|\/api\/actions\.ts$|\/use-[^/]+\.tsx?$|\.tsx$|\/server\/auth\/(options|current-user)\.ts$|\/src\/db\/server\.ts$|\/kiosk-actions\.ts$|\/shared\/lib\/monitoring\.ts$|\/monitoring\/src\/sentry\.ts$/,
};

const pct = (covered, total) => (total === 0 ? 100 : Math.floor((covered / total) * 10_000) / 100);

function readSummary(dir) {
  const file = join(dir, "coverage", "coverage-summary.json");
  if (!existsSync(file)) return null;
  return JSON.parse(readFileSync(file, "utf8"));
}

function logicOf(summary) {
  const sum = Object.fromEntries(METRICS.map((m) => [m, { covered: 0, total: 0 }]));
  for (const [file, data] of Object.entries(summary)) {
    if (file === "total" || !LOGIC.include.test(file) || LOGIC.exclude.test(file)) continue;
    for (const m of METRICS) {
      sum[m].covered += data[m].covered;
      sum[m].total += data[m].total;
    }
  }
  if (sum.lines.total === 0) return null;
  return Object.fromEntries(METRICS.map((m) => [m, pct(sum[m].covered, sum[m].total)]));
}

const packages = ["apps", "packages"].flatMap((group) =>
  readdirSync(join(root, group), { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => join(root, group, d.name)),
);

const baseline = existsSync(baselinePath) ? JSON.parse(readFileSync(baselinePath, "utf8")) : {};
const update = process.argv.includes("--update");
const rows = [];
const failures = [];
const next = { ...baseline };

for (const dir of packages) {
  const summary = readSummary(dir);
  if (!summary) continue;
  const name = relative(root, dir);
  const total = Object.fromEntries(METRICS.map((m) => [m, summary.total[m].pct]));
  const logic = logicOf(summary);
  const floor = baseline[name];
  for (const m of METRICS) {
    if (floor && total[m] < floor[m]) failures.push(`${name} 전체 ${m} ${total[m]}% < 기준선 ${floor[m]}%`);
    if (logic && logic[m] < LOGIC_MIN) failures.push(`${name} 로직 ${m} ${logic[m]}% < ${LOGIC_MIN}%`);
  }
  if (update) next[name] = Object.fromEntries(METRICS.map((m) => [m, Math.max(floor?.[m] ?? 0, Math.floor(total[m] * 100) / 100)]));
  rows.push({ name, total, logic, floor });
}

const cell = (value, min) => (value === undefined ? "-" : `${value}%${min !== undefined && value < min ? " ❌" : ""}`);
const table = [
  "### 단위 테스트 커버리지",
  "",
  `전체는 기준선(\`coverage-baseline.json\`) 아래로, 로직 계층(서버·저장소·model·lib·api·설정)은 ${LOGIC_MIN}% 아래로 내려가면 실패합니다.`,
  "",
  "| 패키지 | 줄 | 문 | 함수 | 분기 | 로직 줄 | 로직 분기 | 기준선(줄·분기) |",
  "|---|---:|---:|---:|---:|---:|---:|---:|",
  ...rows.map(({ name, total, logic, floor }) =>
    [
      `\`${name}\``,
      cell(total.lines, floor?.lines),
      cell(total.statements, floor?.statements),
      cell(total.functions, floor?.functions),
      cell(total.branches, floor?.branches),
      logic ? cell(logic.lines, LOGIC_MIN) : "-",
      logic ? cell(logic.branches, LOGIC_MIN) : "-",
      floor ? `${floor.lines}% · ${floor.branches}%` : "없음",
    ].join(" | ").replace(/^/, "| ").concat(" |"),
  ),
  "",
].join("\n");

console.log(table);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${table}\n`);
if (rows.length === 0) {
  console.error("coverage-summary.json이 없습니다. 먼저 pnpm test:coverage를 실행하세요.");
  process.exit(1);
}
if (update) {
  writeFileSync(baselinePath, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`기준선을 적었습니다: ${relative(root, baselinePath)}`);
}
if (failures.length > 0) {
  console.error(failures.map((f) => `- ${f}`).join("\n"));
  process.exit(1);
}

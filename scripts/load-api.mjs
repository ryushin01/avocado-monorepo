#!/usr/bin/env node
// 백엔드 API 부하 측정(로컬 전용). 운영·데모 주소에는 쓰지 않는다(공유 DB·무료 한도에 부하를 주지 않기 위해).
// 사용: 백오피스를 로컬 프로덕션으로 띄운 뒤(pnpm --filter @avocado/admin build && pnpm --filter @avocado/admin preview)
//   node scripts/load-api.mjs [기본 주소=http://localhost:3000] [초=10] [동시 요청=10]
// 키오스크 API(게임·대기 팀 수)와 온라인 예약 API(선택지·빈 시간)를 읽기 요청으로만 두드리고, 초당 처리량과 지연(p50·p95·p99)을 적는다.
// 키오스크 기기마다 제한(분당 30번)이 걸리는 뒷자리 조회와 쓰기는 넣지 않는다.
const base = process.argv[2] ?? "http://localhost:3000";
const seconds = Number(process.argv[3] ?? 10);
const concurrency = Number(process.argv[4] ?? 10);

const url = new URL(base);
if (!["localhost", "127.0.0.1"].includes(url.hostname)) {
  console.error("부하 측정은 로컬 서버에만 합니다(localhost·127.0.0.1).");
  process.exit(1);
}

const kiosk = { authorization: "Bearer kio_dev_c_gangnam" };
// preview 스크립트의 로컬 전용 예약 API 토큰
// 방문자 키마다 분당 60번 제한이 있으므로 요청마다 다른 키를 써서 제한(429) 대신 실제 처리 시간을 잰다.
const booking = { authorization: "Bearer local-preview-booking", "x-booking-client": () => `load-${Math.random().toString(36).slice(2)}` };
const date = new Date(Date.now() + 9 * 3_600_000 + 3 * 86_400_000).toISOString().slice(0, 10);
const targets = [
  ["키오스크 보유 게임", "/api/kiosk/cafes/c_gangnam/games", kiosk],
  ["키오스크 대기 팀 수", "/api/kiosk/cafes/c_gangnam/waitlist", kiosk],
  ["예약 선택지", "/api/booking/options", booking],
  ["예약 빈 시간", `/api/booking/cafes/c_gangnam/availability?date=${date}&partySize=2`, booking],
];

const percentile = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))] ?? 0;

async function measure(path, headers) {
  const times = [];
  const statuses = new Map();
  const end = Date.now() + seconds * 1000;
  async function worker() {
    while (Date.now() < end) {
      const start = performance.now();
      try {
        const resolved = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k, typeof v === "function" ? v() : v]));
        const res = await fetch(new URL(path, base), { headers: resolved });
        await res.arrayBuffer();
        statuses.set(res.status, (statuses.get(res.status) ?? 0) + 1);
      } catch {
        statuses.set("error", (statuses.get("error") ?? 0) + 1);
      }
      times.push(performance.now() - start);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  times.sort((a, b) => a - b);
  return {
    rps: Math.round(times.length / seconds),
    p50: Math.round(percentile(times, 50)),
    p95: Math.round(percentile(times, 95)),
    p99: Math.round(percentile(times, 99)),
    statuses: Object.fromEntries(statuses),
  };
}

console.log(`부하 측정: ${base}, ${seconds}초, 동시 ${concurrency}개\n`);
console.log("| API | 초당 요청 | p50 ms | p95 ms | p99 ms | 응답 코드 |");
console.log("|---|---:|---:|---:|---:|---|");
for (const [name, path, headers] of targets) {
  const r = await measure(path, headers);
  console.log(`| ${name} | ${r.rps} | ${r.p50} | ${r.p95} | ${r.p99} | ${JSON.stringify(r.statuses)} |`);
}

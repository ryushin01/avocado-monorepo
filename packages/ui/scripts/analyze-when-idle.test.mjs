import assert from "node:assert/strict";
import { test } from "node:test";

import { analyzeWhenIdle } from "./analyze-when-idle.mjs";

const busy = () => new Error("Axe is already running. Use `await axe.run()` to wait for the previous run to finish before starting a new run.");

test("Storybook a11y 애드온의 axe가 아직 돌고 있으면 끝날 때까지 기다렸다가 다시 검사한다", async () => {
  let calls = 0;
  const result = await analyzeWhenIdle(
    async () => {
      calls += 1;
      if (calls < 3) throw busy();
      return { violations: [] };
    },
    { waitMs: 1 },
  );
  assert.deepEqual(result, { violations: [] });
  assert.equal(calls, 3);
});

test("다른 오류는 그대로 던지고, 계속 바쁘면 정해 둔 횟수 뒤에 실패한다", async () => {
  await assert.rejects(analyzeWhenIdle(async () => { throw new Error("다른 오류"); }, { waitMs: 1 }), /다른 오류/);
  let calls = 0;
  await assert.rejects(
    analyzeWhenIdle(async () => { calls += 1; throw busy(); }, { waitMs: 1, tries: 4 }),
    /already running/,
  );
  assert.equal(calls, 4);
});

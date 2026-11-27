/**
 * Storybook a11y 애드온(@storybook/addon-a11y)은 스토리를 그린 뒤 미리보기 안에서 axe를 스스로 돌린다.
 * 같은 창에서 axe는 한 번에 하나만 돌 수 있어, 그 실행과 겹치면 "Axe is already running" 오류로 검사가 실패한다.
 * 그때는 잠깐 기다렸다가 다시 검사한다. 다른 오류는 그대로 던진다.
 * @template T
 * @param {() => Promise<T>} analyze
 * @param {{ tries?: number; waitMs?: number }} [options]
 * @returns {Promise<T>}
 */
export async function analyzeWhenIdle(analyze, { tries = 20, waitMs = 250 } = {}) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await analyze();
    } catch (error) {
      const busy = error instanceof Error && error.message.includes("Axe is already running");
      if (!busy || attempt >= tries) throw error;
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }
}

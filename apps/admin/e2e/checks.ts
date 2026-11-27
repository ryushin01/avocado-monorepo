import AxeBuilder from "@axe-core/playwright";
import { expect, type BrowserContext, type Page } from "@playwright/test";

/**
 * localhost 밖으로 나가는 브라우저 요청을 모두 끊는다(인터넷이 없는 장비). 끊긴 주소를 모아 돌려주므로,
 * 테스트 끝에 빈 배열인지 보면 글꼴·스크립트·이미지가 모두 같은 주소에서 나왔는지 알 수 있다.
 * 게임 표지 원본(BoardGameGeek)은 서버의 이미지 최적화가 받으므로, 최적화 경로 중 외부 원본을 가리키는 요청도 실패시켜
 * 원본 서버 장애를 흉내 낸다(함께 배포한 로컬 썸네일은 그대로).
 */
export async function blockExternal(context: BrowserContext) {
  const blocked: string[] = [];
  await context.route(
    (url) => url.hostname !== "localhost" && url.hostname !== "127.0.0.1",
    (route) => {
      blocked.push(route.request().url());
      return route.abort("internetdisconnected");
    },
  );
  await context.route(/\/_next\/image\?url=https?%3A%2F%2F/, (route) => route.abort("internetdisconnected"));
  return blocked;
}

/**
 * axe로 WCAG 2.2 A·AA와 권장 규칙을 검사한다. 실패하면 규칙 id와 걸린 요소를 보여 준다.
 * `ignoreContrast`: 백오피스·키오스크 개편 화면은 사용자 지시로 글자 대비(color-contrast)를 검사하지 않는다. 다른 규칙은 그대로 본다.
 * `include`·`disableRules`: 화면 일부(열린 팝업 등)만 볼 때 쓴다. 뺀 규칙은 부르는 쪽에 이유를 적는다.
 */
export async function expectNoViolations(
  page: Page,
  { ignoreContrast = false, include, disableRules = [] }: { ignoreContrast?: boolean; include?: string; disableRules?: string[] } = {},
) {
  const axe = new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"]);
  if (include) axe.include(include);
  const disabled = ignoreContrast ? ["color-contrast", ...disableRules] : disableRules;
  if (disabled.length > 0) axe.disableRules(disabled);
  const { violations } = await axe.analyze();
  expect(
    violations.map((v) => ({ rule: v.id, impact: v.impact, targets: v.nodes.map((n) => n.html.slice(0, 160)) })),
  ).toEqual([]);
}

# 작성 규칙

모든 앱(`apps/*`)과 공통 패키지(`packages/*`)에 함께 적용합니다. 앱별 설계는 각 앱의 `docs/`나 README를 보세요.

## TypeScript와 React Compiler

- **타입 검사는 TypeScript 7, 도구는 TypeScript 6입니다.** `pnpm typecheck`는 `tsc7`(`packages/config/bin/tsc7.mjs`)로 돕니다. `typescript-eslint`는 TS 7을 지원하지 않고 6.1 미만만 받아서, 각 패키지의 `typescript`는 `~6.0.3`으로 고정합니다. TS 7은 별칭 패키지 `typescript-7`로 함께 설치합니다.
- **`typescript`를 7로 올리지 않습니다.** lint가 시작부터 실패합니다. `typescript-eslint`가 TS 7을 지원하면 다시 봅니다.
- **편집기는 TS 6 기준입니다.** 편집기와 `pnpm typecheck`의 결과가 드물게 다를 수 있으므로 `pnpm typecheck`를 기준으로 삼습니다.
- **React Compiler를 세 앱에서 켜 두었습니다**(`next.config.ts`의 `reactCompiler`). 새 코드에서 성능만을 위한 `useMemo`, `useCallback`, `memo`를 넣지 않습니다. React Hooks lint 규칙을 어긴 컴포넌트는 컴파일러가 건너뛰므로 규칙을 지킵니다.

## 프론트엔드 구조 (Feature-Sliced Design)

세 앱의 화면 코드는 `src` 아래 레이어로 나눕니다. **위 레이어는 아래 레이어만 가져옵니다.** `packages/config/eslint-fsd.mjs`가 `pnpm lint`에서 강제합니다.

| 레이어 | 내용 |
|---|---|
| `app` | Next.js 라우트, 루트·공통 레이아웃, Route Handler. `page.tsx`는 `export { GamesPage as default } from "@/views/games"`처럼 다시 내보내기만 합니다 |
| `views` | 화면 한 장. 데이터를 읽어 아래 조각을 조합합니다. FSD의 `pages`인데, `src/pages`는 Next.js가 Pages Router로 읽어서 이름을 바꿨습니다 |
| `widgets` | 큰 화면 영역 (사이드바, 대시보드 차트 묶음, 목록 표) |
| `features` | 사용자 동작 하나 (대화상자 + 서버 액션 `api/actions.ts`) |
| `entities` | 도메인 개념: `model`(타입·규칙·검증), `ui`(배지처럼 표시만 하는 조각) |
| `shared` | 도메인을 모르는 공통 코드: `lib`, `ui`, `api`, `config`. 슬라이스가 없어 파일 경로로 바로 가져옵니다 |

- **같은 레이어의 다른 슬라이스는 가져오지 않습니다.** 둘을 함께 쓰려면 위 레이어에서 조합합니다. 엔티티끼리 꼭 필요하면 `entities/<대상>/@x/<소비자>.ts`로 내보냅니다.
- **슬라이스 밖에서는 공개 API로만 가져옵니다.** 안에서는 상대 경로를 씁니다. `features`·`widgets`·`views`는 `@/features/<이름>`, `entities`는 아래 셋입니다.
  - `@/entities/<이름>`: 타입·상수·규칙. React와 zod가 없어 서버·스크립트·브라우저 어디서나 씁니다.
  - `@/entities/<이름>/ui`: 표시 컴포넌트.
  - `@/entities/<이름>/schema`: zod 검증. 서버 코드(서버 액션, 페이지의 URL 파싱)에서 씁니다.
- **`index.ts`에서는 이름을 하나씩 내보냅니다.** `"use client"` 모듈은 `export *`로 내보낼 수 없습니다.
- **백오피스의 서버 코드는 FSD 밖 `src/server`, `src/db`에 둡니다.** `views`, `app`, `features/*/api`만 가져오고, 서버 코드는 `entities`의 model·schema와 `shared/lib`만 가져옵니다. 나머지 화면 조각은 props로 데이터를 받습니다.
- **새 슬라이스는 처음부터 만들지 않아도 됩니다.** 한 화면에서만 쓰면 그 `views` 안에 두고, 여러 곳에서 쓰게 될 때 내립니다.

## UI

- **모든 컴포넌트는 shadcn/ui로 만듭니다.**
  - 컴포넌트는 공통 패키지 `packages/ui`에 모여 있고, 앱에서는 `@avocado/ui/components/<이름>`으로 가져옵니다.
  - 필요한 게 없으면 `packages/ui` 폴더에서 `pnpm dlx shadcn@latest add <이름>`으로 추가합니다. 다른 UI 라이브러리를 들이거나 직접 만들지 않습니다.
  - CLI가 만든 파일 안에서 같은 패키지의 컴포넌트를 `@avocado/ui/components/...`로 가져오면 상대 경로(`./button`)로 바꿉니다.
  - 테마(색·반경 토큰)는 `packages/ui/src/styles/globals.css`입니다. 앱의 `globals.css`는 이것을 가져오고 `@source`로 `packages/ui/src`를 알려줘야 공통 컴포넌트의 클래스가 빠지지 않습니다. 앱만의 색은 앱의 `globals.css`에서 덮어씁니다(홍보 사이트의 주황 강조색 등).
  - 아이콘은 lucide(`lucide-react`)를 씁니다.
- **shadcn 스타일은 `base-nova`이고 Radix가 아니라 Base UI 기반입니다.**
  - 다른 요소로 렌더링할 때는 `asChild` 대신 `render` prop을 씁니다. 예: `<DialogTrigger render={<Button />}>`
  - **링크를 버튼처럼 보이게 할 때**는 `<Link className={buttonVariants()}>`를 씁니다.
    - `<Button nativeButton={false} render={<Link/>}>`로 만들면 링크에 `role="button"`이 붙어 화면 낭독기가 버튼으로 읽습니다.
    - 같은 이유로 `ui/pagination.tsx`의 `PaginationLink`도 Next.js `Link` + `buttonVariants`로 고쳐 두었습니다.
  - **메뉴의 라디오 항목**(`DropdownMenuRadioItem`)은 기본으로 클릭해도 메뉴가 닫히지 않으므로 `closeOnClick`을 줍니다.
  - **하위 메뉴(`DropdownMenuSub`)는 쓰지 않습니다.**
    - 마우스를 올리면 열렸다가 클릭하면 다시 닫히고, 모바일에서는 펼칠 공간이 부족합니다.
    - 선택지는 `DropdownMenuGroup` + `DropdownMenuLabel`로 메인 메뉴에 바로 둡니다.
  - **Base UI Checkbox**는 보이는 `role="checkbox"` 요소와 숨은 `<input>`이 따로 있습니다. 테스트에서는 `getByRole("checkbox", { name, exact: true })`로 찾습니다.
- **shadcn 컴포넌트를 고친 곳**(다시 `add --overwrite`하면 사라지므로 주의, 모두 `packages/ui/src` 아래)
  - `components/pagination.tsx`: Next.js Link, 한글 화면 낭독기 문구
  - `hooks/use-mobile.ts`: `useSyncExternalStore`로 다시 작성 (React lint 규칙)
  - `components/carousel.tsx`: 첫 버튼 상태를 맞추는 effect 한 줄에 lint 예외 주석. 끝에 닿은 버튼은 초점이 사라지지 않게 `disabled` 대신 `aria-disabled`를 쓰고, 화면 밖 슬라이드는 탭 순서에서 빠지도록 `inert`를 겁니다
  - `dialog`, `sheet`, `breadcrumb`, `spinner`, `carousel`, `pagination`, `sidebar`: 화면 낭독기가 읽는 영어 기본 문구를 한국어로 바꿈
  - `components/sidebar.tsx`: `SidebarRail`을 드래그해 너비 조절(192~384px, 클릭은 접기·펼치기, 키보드는 좌우 화살표·Home·End). 너비와 접힘 상태는 쿠키 대신 `localStorage`에 저장합니다(레이아웃이 정적이라 서버에서 쿠키를 읽을 수 없음). 사이드바를 쓰는 앱의 루트 레이아웃에 `SidebarWidthScript`(body 맨 앞)와 `SidebarStateScript`(children 바로 뒤)를 두어 새로고침 때 모양이 튀지 않게 합니다. `SidebarInset`의 `min-w-0`은 넓은 사이드바에서 표가 페이지를 밀어내지 않게 합니다
- **문구는 한국어 존댓말**로 씁니다. 개수 단위는 게임 종류 "종", 박스 "개", 매장 "개"입니다.

## 차트

- **Recharts를 shadcn `chart` 컴포넌트(`ChartContainer`, `ChartTooltip`)로 감싸 씁니다.**
- **형태는 데이터가 하는 일로 정합니다.**
  - 숫자 하나는 요약 칸(`StatTile`)으로 보여줍니다. 기간을 비교하는 화면에서는 지난 기간 대비 증감과 작은 추이선을 붙인 `KpiTile`(통계)을 씁니다.
  - 시간에 따른 변화는 선 그래프로 그립니다. 비교 기간은 같은 축에 회색 점선으로 겹칩니다(강조할 하나만 색, 나머지는 회색).
  - 두 범주(요일 × 시간대)에 걸친 크기는 히트맵으로 그립니다. Recharts에 없어서 격자로 직접 그립니다(`widgets/stats/ui/usage-heatmap.tsx`).
    - 히트맵은 격자 자체가 접근 가능한 표(`role="grid"`, 칸마다 "월요일 14시 12회" 같은 이름)라서 따로 `sr-only` 표를 두지 않습니다.
    - 키보드는 Tab으로 한 번만 들어오고 안에서는 화살표·Home·End로 움직입니다(칸이 많은 위젯은 모두 이 방식).
    - `aria-hidden` 안에 초점을 받을 수 있는 요소를 두지 않습니다.
  - 표 안에서 크기를 비교할 때는 칸 안에 가로 막대를 함께 둡니다. 막대 길이의 기준(최댓값)은 같은 화면에서 맞춥니다.
  - 크기 비교·순위는 막대로 그립니다. 이름이 길면 가로 막대가 낫습니다.
  - 구성 비교는 누적 막대로, 수치 여러 개는 표로 보여줍니다.
- **색**
  - **계열이 하나인 차트:** 파랑 하나만 씁니다(라이트 `#2a78d6`, 다크 `#3987e5`).
  - **상태(이용 가능·점검 중):** 상태 색(good `#0ca30c`, warning `#fab219`)을 씁니다. 폐기는 중립 회색(`#898781`)입니다.
  - **상태 색:** 색만으로 구분하지 않도록 범례에 아이콘과 이름을 함께 둡니다.
  - **비교 기간(지난 기간):** 회색 `#898781` 점선. 회색이라 색만으로 구분하지 않도록 점선과 범례를 함께 둡니다.
  - **히트맵:** 파랑 한 가지 색의 6단계(`--heat-1`~`--heat-6`, `apps/admin/src/app/globals.css`). 다크 모드는 바탕에 가까운 쪽이 '적음'이 되도록 순서를 뒤집은 값을 씁니다. 0은 `bg-muted`.
  - **증감:** 늘면 좋은 값은 증가 `--delta-up`(라이트 `#006300`, 다크 `#0ca30c`), 감소 `--delta-down`(`#d03b3b`). 화살표 아이콘과 부호(+/-)를 함께 써서 색만으로 구분하지 않습니다. 좋고 나쁨이 없는 값은 회색입니다.
  - **새 색 조합:** 데이터 시각화 가이드의 검증 스크립트로 대비·색각 이상 구분을 확인합니다.
- **표시 규칙**
  - 막대는 24px 이하 두께로, 값 끝만 4px 둥글게 처리합니다.
  - 값은 막대 끝에 적고, 마우스를 올리면 툴팁을 보여줍니다.
  - **차트마다 같은 데이터의 `sr-only` 표**를 함께 둡니다. 화면 낭독기와 E2E 테스트가 이 표를 읽습니다.
  - 표만 확인하면 차트가 그려지지 않아도 테스트가 통과합니다. 차트가 실제로 그려졌는지는 대시보드 E2E가 `svg.recharts-surface`로 확인합니다.
  - 작은 추이선(`Sparkline`)은 숫자를 옆 글자가 전하므로 화면 낭독기에서 숨깁니다. 여러 줄을 나란히 비교할 때는 `max`로 세로 축을 맞춥니다.
- **스크린샷 주의:** Playwright `fullPage` 스크린샷은 창 크기를 바꿔 차트가 처음부터 다시 그려지는 순간을 찍습니다. 빈 차트처럼 나오므로 키가 큰 창으로 찍으세요.

## 폼

- **서버 액션이 `FormState`를 돌려줍니다**(`src/shared/lib/form.ts`).
  - 성공하면 `message`, 실패하면 필드별 오류와 입력값을 돌려줍니다.
  - 권한·없는 데이터처럼 필드와 무관한 오류는 `formError(values, "메시지")`로 만듭니다.
- **대화상자 폼은 `useDialogForm`**(`shared/lib/use-dialog-form.ts`)으로 만듭니다.
  - 성공하면 창을 닫고 알림을 띄웁니다. 실패하면 입력값을 복원합니다.
  - `<form key={form.formKey}>`를 꼭 붙이세요. 다시 마운트해야 `defaultValue`가 복원됩니다.
- **검증은 zod 스키마 하나로 서버에서 합니다.** 폼에는 `noValidate`를 붙여 브라우저 기본 검증을 끄고, 서버 오류 메시지를 일관되게 보여줍니다.

## 테스트

- **단위 테스트(Vitest):** `src/**/*.test.ts`에 둡니다. repository·schema·권한·목록 계산처럼 화면과 무관한 규칙을 검증합니다. Jest는 쓰지 않습니다. Vitest가 같은 API에 ESM·TypeScript를 설정 없이 지원하고, 두 러너를 함께 두면 설정만 늘어납니다.
- **컴포넌트 테스트(Vitest + Testing Library):** 백오피스에서 `*.test.tsx`로 대상 옆에 둡니다. 서버 컴포넌트와 화면 흐름은 E2E로 확인하고, 여기서는 조건에 따라 달라지는 표시 조각만 봅니다.
- **커버리지:** `pnpm test:coverage`. CI가 결과를 7일간 보관합니다. 기준선은 아직 정하지 않았습니다.
  - 백오피스 저장소 테스트는 `createTestDb({...})`로 테스트마다 새 메모리 PGlite를 만듭니다. 외래 키가 있으므로 기록이 가리키는 매장·게임도 함께 넣고, 날짜는 빈 문자열 대신 실제 날짜를 씁니다.
- **E2E(Playwright):** `apps/admin/e2e/`에 있습니다. 백오피스(3100), 키오스크 테스트용 런처(3101, 둔산점·개발용 기기 토큰), 홈페이지(3102)를 함께 띄웁니다. 모두 **프로덕션 빌드**(`next build` → `next start`)로 띄우므로 E2E 시작 전에 빌드가 돕니다. CI에서는 앞 단계의 빌드를 재사용합니다. 런처의 매장·토큰은 서버를 켤 때 읽으므로 다시 빌드하지 않습니다. 화면 대기 시간은 10초입니다.
  - 테스트는 병렬로 돕니다. **데이터를 바꾸는 테스트는 서로 다른 매장을 씁니다.**
    - 홍대점은 읽기 전용(스태프·대시보드·통계)이라 바꾸지 않습니다.
    - 재고: 둔산점(추가)·서면점(수정)·강남점(제외)·판교점(모바일). 예약·대기·이용 기록: 서면점. 키오스크: 둔산점. 로그인 잠금: 판교점 스태프 계정.
    - 새로 만드는 매장·직원·예약 손님은 `Date.now()`나 `uniquePhone()`으로 이름·번호를 겹치지 않게 합니다.
    - 화면 문구는 스트리밍 중에 숨은 영역에 잠깐 두 번 있을 수 있으므로, 보이는 요소만 찾는 역할(`getByRole`)을 먼저 씁니다. 카탈로그는 `Date.now()`를 붙인 고유한 이름의 게임을 새로 만들어 씁니다.
  - 정확한 전체 개수(110, 매장 5개 등)는 단위 테스트에서 확인합니다. 다른 테스트가 동시에 데이터를 추가하기 때문입니다.
  - 시드에는 매장마다 이용 중인 게임이 있습니다. 재고를 제외하는 테스트는 '이용 중' 배지가 없는 행을 고릅니다.
  - 테스트는 기본으로 관리자로 로그인한 상태입니다. `e2e/auth.setup.ts`가 먼저 실제 로그인 화면으로 로그인해 세션을 저장합니다. 스태프로 확인할 때는 `loginAs(context, USERS.hongdaeStaff)`를 씁니다(`e2e/helpers.ts`).
  - E2E 서버는 매번 새 메모리 DB(`PGLITE_DATA_DIR=memory://`)로 시작하고, 프로덕션 모드라 `SEED_DEMO=1`로 개발용 시드를 넣습니다. 로그인 화면에 개발용 계정 안내가 나오지 않으므로 테스트는 `e2e/helpers.ts`의 계정을 씁니다.
  - 모바일 목록은 `waitForMobileList()`로 목록이 실제로 보일 때까지 기다린 뒤 다룹니다. Suspense 스트리밍 중에는 숨은 영역에 먼저 그려졌다가 옮겨지기 때문입니다.
- **의존성:** Dependabot이 매주 업데이트 PR을 올립니다(`.github/dependabot.yml`). CI는 운영 의존성의 높음 이상 취약점이 있으면 실패합니다(`pnpm audit --prod --audit-level high`).
- **CI:** `main` 푸시와 PR마다 GitHub Actions(`.github/workflows/ci.yml`)가 다섯 가지를 모두 실행합니다(단위 테스트는 커버리지와 함께). E2E가 실패하면 Playwright 기록을 7일간 보관합니다.
  - Turborepo는 환경 변수를 작업에 넘기지 않으므로, 작업이 읽어야 하는 변수는 `turbo.json`에 적습니다(E2E의 `CI` 등).
- **작업을 마치면** 저장소 루트에서 `pnpm typecheck && pnpm lint && pnpm test && pnpm e2e && pnpm build`를 모두 통과시킵니다. Turborepo가 모든 앱·패키지에서 같은 이름의 스크립트를 실행합니다. `cacheComponents` 규칙 위반은 `build`에서만 드러나는 경우가 있습니다.

## 오류 처리와 로그

- **화면:** 앱마다 `app/error.tsx`, `app/global-error.tsx`, `app/not-found.tsx`가 있고 표시는 `shared/ui/error-notice.tsx`입니다. 백오피스는 `(backoffice)/error.tsx`도 두어 오류가 나도 사이드바가 남습니다. 런처의 오류·없는 화면은 손님이 떠나도 30초 뒤 처음 화면으로 돌아갑니다.
- **Next.js 16의 오류 화면 prop은 `reset`이 아니라 `retry`입니다.** `error`는 `unknown`이라 `instanceof Error`로 좁힌 뒤 읽습니다.
- **로그:** 서버 오류는 `@avocado/logger`가 한 줄 JSON으로 표준 오류에 남깁니다. 각 앱의 `src/instrumentation.ts`가 `onRequestError`로 넘기고, 백오피스 화면의 오류 번호는 로그의 `digest`와 같습니다.
- **로그에 개인정보를 남기지 않습니다.** 요청 헤더와 쿼리 문자열(`phone4` 등)은 기록하지 않습니다. 직접 로그를 남길 때는 `logError`에 전화번호·이름·토큰을 넘기지 않습니다.
- **잡아서 삼키는 오류는 로그를 남깁니다.** 손님 화면에 연결 문제로만 보이는 런처의 백오피스 호출 실패가 그 예입니다(`shared/api/backoffice.ts`).

## 보안 헤더와 요청 제한

- **헤더:** 세 앱의 `next.config.ts`가 `@avocado/config/security-headers`를 씁니다. 백오피스와 런처는 관리자가 입력한 게임 이미지 때문에 `http:`, `https:` 이미지를 허용합니다. 다른 앱에서 외부 이미지를 새로 쓰면 `imgSrc`에 추가합니다. 외부 스크립트는 막혀 있습니다.
- **`script-src`의 `unsafe-inline`:** nonce 방식은 Partial Prefetching과 함께 쓸 수 없어 남겨 두었습니다. 인라인 스크립트 삽입 공격까지 막아 주지는 않으니, HTML을 직접 넣는 코드를 쓰지 않습니다.
- **요청 제한:** 손님 정보를 다루는 키오스크 API는 인증 뒤 `rejectOverKioskLimit`을 부릅니다(기기별 분당 30번, 넘으면 429). 새 API도 같습니다.

## 변경 이력

매장 운영에 영향을 주는 관리 작업을 새로 만들면 서버 액션에서 변경에 성공한 뒤 `recordAudit`(`server/audit/data.ts`)을 부르고, `entities/audit`에 작업 이름을 추가합니다. `detail`에 비밀번호, 토큰 원문, 손님 정보를 넣지 않습니다. 기준은 [아키텍처 문서](../apps/admin/docs/architecture.md)에 있습니다.

## 코드 리뷰

CodeRabbit이 PR을 한국어로 리뷰합니다. 설정은 `.coderabbit.yaml`이고, 이 문서의 규칙을 경로별 지침으로 넣어 두었습니다. 규칙을 바꾸면 그 파일도 함께 고칩니다.

## 알려진 함정

| 증상 | 원인 | 해결 |
|---|---|---|
| 처음 내려받은 저장소에서 `Failed query: CREATE SCHEMA` (ENOENT, mkdir) | PGlite가 상위 폴더(`.data`)를 만들어 주지 않음. 이미 폴더가 있는 컴퓨터와 메모리 DB를 쓰는 E2E·CI에서는 드러나지 않음 | `openPglite`에서 폴더를 먼저 만듦 (`src/db/index.test.ts`) |
| 서버 로그에 손님 전화번호가 찍힘 | Drizzle 오류 메시지에 쿼리 값(`params:`)이 들어 있고 Next.js가 이를 그대로 출력함 | 백오피스 `instrumentation.ts`의 `register`에서 `redactConsoleErrors()`로 가림. `server/log-redaction.test.ts`가 실제 DB 오류로 확인하므로 Drizzle을 올려 형식이 바뀌면 이 테스트가 실패함 |
| 런처 빌드·첫 요청 때 `backoffice_unreachable`이 찍힐 것 같음 | 프리렌더링이 끝나면 Next.js가 진행 중인 `fetch`를 끊음 | 메시지가 `During prerendering`이면 장애가 아니므로 로그를 남기지 않음 |
| 브라우저 번들에 zod가 들어가 커짐 | 클라이언트 컴포넌트가 가져오는 공개 API에 zod 스키마가 있으면 최상위 실행 코드라 트리 셰이킹되지 않음 | 스키마는 `@/entities/<이름>/schema`로 나누고, `index.ts`에는 타입만 `export type`으로 둠 |
| `src/pages`를 만들었더니 라우트가 이상해짐 | Next.js가 `src/pages`를 Pages Router로 읽음 | FSD의 pages 레이어는 `src/views`를 씀 |
| 모바일에서 하이드레이션 불일치 | 사이드바 틀을 Suspense 안에 두면, 바깥이 먼저 하이드레이션되며 `useIsMobile`이 바뀐 뒤 사이드바가 하이드레이션됨 | 틀은 Suspense 밖, 사용자별 영역만 슬롯으로 Suspense |
| 빌드 실패: `Math.random()` in a Client Component | shadcn `SidebarMenuSkeleton`이 무작위 너비를 씀 | 고정 너비로 `Skeleton`을 직접 그림 |
| Base UI "default value of an uncontrolled Select changed" 경고 | `await` 뒤 `setState`가 액션 결과와 따로 커밋됨 | 다시 마운트용 카운터를 액션 상태 안에 둠 (`useDialogForm`) |
| 메뉴에서 상태를 고른 뒤 다시 열면 닫힘 | 라디오 항목은 기본으로 메뉴를 닫지 않음 | `closeOnClick` |
| dev 경고 "encountered URL data during prerendering" | 동적 경로에서 `params`를 Suspense 밖에서 `await` (Partial Prefetching 사용 중) | `generateStaticParams`가 있어도 `params`는 Suspense 안의 자식 컴포넌트에서 읽는다 |
| `pnpm install`이 "within the minimumReleaseAge cutoff"로 멈춤 | pnpm 12는 공개 하루 안 된 버전을 거부함. npm 잠금 파일을 그대로 가져오면 걸리기 쉬움 | 잠금 파일을 지우지 말고 먼저 하루 기다리거나, 필요하면 `pnpm clean --lockfile` 뒤 다시 설치 (더 오래된 버전이 없는 것만 `minimumReleaseAgeExclude`에 자동 추가됨) |
| `pnpm -v`가 9 등 낮은 버전 | 오래된 pnpm은 `packageManager` 버전으로 자동 전환하지 않음 | `npm install -g pnpm@12.16.1` |
| 차트 칸은 있는데 그래프가 비어 있음 (SVG 없음, 오류도 없음) | `recharts`가 두 벌 설치됨. 공통 UI 패키지의 `ChartContainer`와 앱의 차트가 서로 다른 recharts를 써서 연결되지 않음. pnpm에서 recharts의 peer `react-is`가 패키지마다 다른 버전으로 잡혀 생김 | recharts를 쓰는 패키지(`packages/ui`, `apps/admin`)에 같은 `react-is`(React와 같은 버전)를 직접 선언. 확인: `readlink -f packages/ui/node_modules/recharts apps/admin/node_modules/recharts`가 같아야 함 |
| PGlite: "path argument ... Received an instance of URL" 로 서버가 멈춤 | 번들러가 PGlite를 묶어 자기 WASM 파일 경로를 못 찾음 | `next.config.ts`의 `serverExternalPackages: ["@electric-sql/pglite"]` |
| "encountered the unstable value randomBytes while prerendering" | Auth.js 4의 `getServerSession`이 안에서 난수를 씀 | 세션을 읽기 전에 `await connection()` (`current-user.ts`, 로그인 화면) |
| 테스트에서 "DateTimeParseError" 또는 외래 키 오류 | 예전 메모리 저장소는 빈 날짜·없는 매장을 받아 줬지만 실제 DB는 거부함 | 픽스처에 실제 날짜와 참조하는 매장·게임을 넣음 |
| CI에서만 `pnpm install`이 `ERR_PNPM_IGNORED_BUILDS`로 실패 | pnpm 12는 허락하지 않은 의존성의 설치 스크립트를 막고, CI에서는 오류로 멈춤 (내 컴퓨터에서는 그냥 넘어감) | 믿을 수 있는 패키지만 `pnpm install --allow-build <이름>`으로 `pnpm-workspace.yaml`의 `allowBuilds`에 추가 (지금은 esbuild) |
| lint `react-hooks/refs`: Cannot access refs during render | 렌더링 중에 `useRef().current`를 읽음 (예: 캐러셀 플러그인) | 한 번만 만들 값은 `useState(() => ...)`로 만든다 |
| 새 앱에서 공통 컴포넌트 스타일이 빠짐 | Tailwind가 `node_modules` 너머의 `packages/ui`를 찾지 않음 | 앱 `globals.css`에 `@source "../../../../packages/ui/src";` |
| 이미지가 안 보임 (썸네일·자리표시) | 카탈로그 이미지는 `packages/domain/assets`에만 있고 앱 `public`에는 복사본이 들어감 | 앱 `package.json`의 `dev`·`build` 맨 앞에 `copy-catalog-assets public &&` (pre 스크립트 대신 한 줄에 써서 실행 순서가 보이게 함) |
| lint `react-hooks/purity`: Cannot call impure function during render | 서버 컴포넌트에서 `Date.now()` 호출 | `data.ts`에서 조회 시각을 데이터와 함께 돌려줌 |
| 게임 썸네일이 원형으로 잘림 | shadcn `Avatar`의 이미지·테두리(`after:`)가 기본 `rounded-full` | `GameThumbnail`에서 `after:rounded-md`, 이미지 `rounded-md` |
| 루트 `pnpm e2e`에서만 가끔 `ERR_CONNECTION_REFUSED`와 함께 방금 만든 데이터가 사라짐 | 개발 서버(`next dev`)는 메모리가 한도의 80%를 넘으면 스스로 다시 켜짐(`devMemoryThresholdRestart`). 메모리 DB가 초기화되고 잠깐 접속이 끊김 | E2E는 프로덕션 빌드로 돌린다 (`playwright.config.ts`의 `webServer`) |
| CI에서만 저장소 단위 테스트가 "Test timed out in 5000ms" | 테스트마다 새 PGlite를 열고 마이그레이션을 적용해 느린 컴퓨터에서는 5초를 넘김 | 백오피스 Vitest 설정의 `testTimeout: 30_000` |
| 비활성 Select 값이 제출되지 않음 | 비활성 폼 컨트롤은 값을 보내지 않음 | 숨은 `<input>`으로 같은 값을 보냄 (직원 수정의 역할) |

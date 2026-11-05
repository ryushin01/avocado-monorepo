# 작성 규칙

모든 앱(`apps/*`)과 공통 패키지(`packages/*`)에 함께 적용합니다. 앱별 설계는 각 앱의 `docs/`나 README를 보세요.

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
  - `components/carousel.tsx`: 첫 버튼 상태를 맞추는 effect 한 줄에 lint 예외 주석
- **문구는 한국어 존댓말**로 씁니다. 개수 단위는 게임 종류 "종", 박스 "개", 매장 "개"입니다.

## 차트

- **Recharts를 shadcn `chart` 컴포넌트(`ChartContainer`, `ChartTooltip`)로 감싸 씁니다.**
- **형태는 데이터가 하는 일로 정합니다.**
  - 숫자 하나는 요약 칸(`StatTile`)으로 보여줍니다. 기간을 비교하는 화면에서는 지난 기간 대비 증감과 작은 추이선을 붙인 `KpiTile`(통계)을 씁니다.
  - 시간에 따른 변화는 선 그래프로 그립니다. 비교 기간은 같은 축에 회색 점선으로 겹칩니다(강조할 하나만 색, 나머지는 회색).
  - 두 범주(요일 × 시간대)에 걸친 크기는 히트맵으로 그립니다. Recharts에 없어서 격자로 직접 그립니다(`components/stats/usage-heatmap.tsx`).
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

- **서버 액션이 `FormState`를 돌려줍니다**(`src/lib/form.ts`).
  - 성공하면 `message`, 실패하면 필드별 오류와 입력값을 돌려줍니다.
  - 권한·없는 데이터처럼 필드와 무관한 오류는 `formError(values, "메시지")`로 만듭니다.
- **대화상자 폼은 `useDialogForm`**(`components/form/use-dialog-form.ts`)으로 만듭니다.
  - 성공하면 창을 닫고 알림을 띄웁니다. 실패하면 입력값을 복원합니다.
  - `<form key={form.formKey}>`를 꼭 붙이세요. 다시 마운트해야 `defaultValue`가 복원됩니다.
- **검증은 zod 스키마 하나로 서버에서 합니다.** 폼에는 `noValidate`를 붙여 브라우저 기본 검증을 끄고, 서버 오류 메시지를 일관되게 보여줍니다.

## 테스트

- **단위 테스트(Vitest):** `src/**/*.test.ts`에 둡니다. repository·schema·권한·목록 계산처럼 화면과 무관한 규칙을 검증합니다.
  - 백오피스 저장소 테스트는 `createTestDb({...})`로 테스트마다 새 메모리 PGlite를 만듭니다. 외래 키가 있으므로 기록이 가리키는 매장·게임도 함께 넣고, 날짜는 빈 문자열 대신 실제 날짜를 씁니다.
- **E2E(Playwright):** 지금은 백오피스(`apps/admin/e2e/`)에만 있습니다.
  - 테스트는 병렬로 돕니다. **데이터를 바꾸는 테스트는 서로 다른 매장을 씁니다.** 홍대점은 읽기 전용 테스트(스태프·대시보드)용이라 바꾸지 않습니다. 카탈로그는 `Date.now()`를 붙인 고유한 이름의 게임을 새로 만들어 씁니다.
  - 정확한 전체 개수(110, 매장 5개 등)는 단위 테스트에서 확인합니다. 다른 테스트가 동시에 데이터를 추가하기 때문입니다.
  - 시드에는 매장마다 이용 중인 게임이 있습니다. 재고를 제외하는 테스트는 '이용 중' 배지가 없는 행을 고릅니다.
  - 테스트는 기본으로 관리자로 로그인한 상태입니다. `e2e/auth.setup.ts`가 먼저 실제 로그인 화면으로 로그인해 세션을 저장합니다. 스태프로 확인할 때는 `loginAs(context, USERS.hongdaeStaff)`를 씁니다(`e2e/helpers.ts`).
  - E2E 서버는 매번 새 메모리 DB(`PGLITE_DATA_DIR=memory://`)로 시작합니다.
  - 모바일 목록은 `waitForMobileList()`로 목록이 실제로 보일 때까지 기다린 뒤 다룹니다. Suspense 스트리밍 중에는 숨은 영역에 먼저 그려졌다가 옮겨지기 때문입니다.
- **CI:** `main` 푸시와 PR마다 GitHub Actions(`.github/workflows/ci.yml`)가 다섯 가지를 모두 실행합니다. E2E가 실패하면 Playwright 기록을 7일간 보관합니다.
  - Turborepo는 환경 변수를 작업에 넘기지 않으므로, 작업이 읽어야 하는 변수는 `turbo.json`에 적습니다(E2E의 `CI` 등).
- **작업을 마치면** 저장소 루트에서 `pnpm typecheck && pnpm lint && pnpm test && pnpm e2e && pnpm build`를 모두 통과시킵니다. Turborepo가 모든 앱·패키지에서 같은 이름의 스크립트를 실행합니다. `cacheComponents` 규칙 위반은 `build`에서만 드러나는 경우가 있습니다.

## 알려진 함정

| 증상 | 원인 | 해결 |
|---|---|---|
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
| 비활성 Select 값이 제출되지 않음 | 비활성 폼 컨트롤은 값을 보내지 않음 | 숨은 `<input>`으로 같은 값을 보냄 (직원 수정의 역할) |

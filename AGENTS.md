# avocado-monorepo — 에이전트 작업 안내

`next dev`가 넣던 영어 안내 블록은 각 앱의 `next.config.ts`의 `agentRules: false`로 꺼 두었으므로 이 파일은 손으로 관리합니다. 그 블록의 내용은 이렇습니다: 이 저장소의 Next.js 16은 학습 데이터와 API·규칙·파일 구조가 다를 수 있으니, 코드를 쓰기 전에 앱 폴더의 `node_modules/next/dist/docs/`에서 해당 안내를 읽고 지원 중단(deprecation) 안내를 따릅니다. 앱 폴더마다 `AGENTS.md`가 따로 있으니 그 앱을 고칠 때 함께 읽습니다. 자세한 내용은 `README.md`, `docs/conventions.md`, `docs/development.md`, `docs/demo.md`, `docs/deployment.md`에 있습니다.

## 1. 프로젝트 개요

- 보드게임 카페 프랜차이즈 모노레포입니다(화면은 한국어). 포트폴리오 프로젝트이며 매장·직원·손님 데이터는 모두 가상입니다.
- 화면 축: 홍보 사이트(손님 온라인 예약 포함) · 백오피스 · 매장 키오스크
- 공개 데모: 홍보 사이트 https://avocado-web-ryushin01.vercel.app/ · 백오피스 https://avocado-admin-ryushin01.vercel.app/ · 키오스크 https://avocado-kiosk-ryushin01.vercel.app/ (둘러보는 법은 `docs/demo.md`)

## 2. 기술 스택과 구조

- pnpm workspaces + Turborepo. Next.js 16(App Router, Turbopack), React 19(React Compiler 켬), Tailwind CSS 4, shadcn/ui(Base UI), PostgreSQL + Drizzle ORM(개발·테스트는 PGlite), Auth.js 4, zod 4, Sentry, PostHog(홍보 사이트)
- `apps/admin`: 백오피스(포트 3000). 고치기 전에 그 폴더의 `README.md`, `docs/architecture.md`를 읽습니다. 화면은 FSD 층, 서버 코드는 `src/server`, DB는 `src/db`(단위 테스트는 `createTestDb`). 로그인은 Auth.js 4 credentials이고 개발 계정 비밀번호는 `avocado1234`입니다. `src/db/schema.ts`를 고치면 `pnpm --filter @avocado/admin db:generate`로 마이그레이션을 만들어 함께 커밋합니다.
- `apps/launcher`: 손님용 키오스크(포트 3001). 백오피스의 키오스크 API를 읽고, 계약 타입은 `@avocado/domain/kiosk`(zod 스키마)에 있습니다.
- `apps/web`: 프랜차이즈 홍보 사이트(포트 3002). 정적 페이지는 `@avocado/domain/catalog`를 씁니다.
- `packages/ui`: shadcn/ui 컴포넌트와 테마(`@avocado/ui/components/<이름>`). `packages/domain`: 카탈로그 데이터·썸네일·공통 타입. `packages/logger`: 서버 오류 로그. `packages/monitoring`: 세 앱 공통 Sentry 설정(개인정보 제거)과 지연 로더. `packages/config`: tsconfig·ESLint.
- Feature-Sliced Design v2.1. 층 순서는 `_app → _pages → widgets → features → entities → shared`이며 위 층은 아래 층만 가져옵니다. 같은 층의 다른 슬라이스는 가져오지 않고, 슬라이스 밖에서는 공개 API(`index.ts`, `index.server.ts`)로만 가져옵니다. ESLint(`packages/config/eslint-fsd.mjs`)와 Steiger(앱마다 `steiger.config.mjs`)가 `pnpm lint`에서 함께 검사합니다.
- 한 화면에서만 쓰는 코드는 그 화면 슬라이스(`_pages/<화면>`)에 두고, 두 화면 이상에서 쓰면 `features`·`widgets`로 올립니다. `src/app`의 라우트 파일은 다시 내보내기만 합니다.

## 3. 설치·개발 명령

- 패키지 매니저는 pnpm만 씁니다(npm·yarn 금지). 버전은 `packageManager`(`pnpm@12.16.1`)로 고정, Node.js 24 이상(`.node-version`).
- 명령은 모두 저장소 루트에서 실행하고, 한 앱만 대상으로 할 때는 `pnpm --filter <이름>`을 씁니다. 의존성은 그것을 가져오는 앱·패키지에 추가하고(pnpm은 엄격함), 내부 패키지는 `workspace:*`로 연결합니다.
- `pnpm install` → `pnpm dev`(세 앱, DB 설치 불필요) / `pnpm dev:admin` / `pnpm dev:launcher`(런처와 백오피스) / `pnpm dev:web`
- `pnpm preview`: 세 앱을 빌드한 뒤 `.env` 없이 프로덕션 모드로 띄웁니다(앱별 `preview` 스크립트, 메모리 PGlite + 개발 시드).
- E2E·스토리 검사 전에 `pnpm exec playwright install chromium`
- 환경 변수(이름만): 백오피스 `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `SEED_DEMO`, `CRON_SECRET`, `BOOKING_API_TOKEN`, `PGLITE_DATA_DIR` / 런처 `BACKOFFICE_URL`, `LAUNCHER_CAFE_ID`, `KIOSK_API_TOKEN` / 홍보 사이트 `BACKOFFICE_URL`, `BOOKING_API_TOKEN`, `SITE_URL`, `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` / 공통 `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` / 데모 `NEXT_PUBLIC_DEMO_MODE`, `NEXT_PUBLIC_DEMO_KIOSK_URL`, `NEXT_PUBLIC_DEMO_BACKOFFICE_URL`
- 데이터 가져오기: `pnpm import:avocado-images` → `pnpm import:avocado`, 홍보 사이트 사진은 `pnpm import:avocado-media`(기본으로 옆 폴더 `../avocado-master`를 읽음)

## 4. 검사·테스트 명령

- 완료 기준: 루트에서 `pnpm check`(CI와 같은 검사, `scripts/check.mjs`)가 통과해야 합니다. 한 단계만은 `pnpm check static|build|lhci|e2e|stories|visual`.
- CI(`.github/workflows/ci.yml`)는 같은 단계를 작업으로 나눠 부릅니다: `changes`(문서만 바뀌면 건너뜀) → `static`(감사·타입·린트·커버리지, PR은 `--affected`) · `build`(빌드·번들 예산) → `e2e`(2개로 샤딩) · `lighthouse` · `visual`(Playwright 공식 이미지 안) · `stories` → `check`(모두 모아 판정, main 보호의 필수 검사 이름). 캐시: pnpm, `.turbo/cache`(빌드 결과를 E2E·Lighthouse·시각 회귀가 다시 씀), `.next/cache`, Playwright 브라우저. 원격 캐시는 쓰지 않습니다.
- 커버리지: 전체는 `coverage-baseline.json` 아래로, 로직 계층(서버·저장소·model·lib·api·설정, 기준은 `scripts/coverage-report.mjs`)은 80% 아래로 내려가면 실패합니다. 표는 CI 작업 요약에 나옵니다.
- 시각 회귀: `e2e/visual.spec.ts`(세 앱 주요 화면, 데스크톱·모바일·키오스크)와 `visual-stories.spec.ts`(모든 스토리). 기준 이미지 `e2e/__screenshots__`는 리눅스 결과물이라 macOS에서는 `pnpm check visual`이 Docker(tmpfs) 안에서 돕니다. 화면을 바꿨으면 `pnpm check visual --update-snapshots=all`로 다시 만들거나 CI `visual` 실패 결과물의 `__screenshots__`를 받아 커밋합니다. CI 이미지 버전(`mcr.microsoft.com/playwright:v…`)은 `@playwright/test`와 같게 둡니다.
- 타입 검사는 TypeScript 7(`tsc7`), 도구는 TypeScript 6입니다. 각 패키지의 `typescript`는 `~6.0.3`으로 고정하고 7로 올리지 않습니다(lint가 실패). 편집기와 결과가 다르면 `pnpm typecheck`를 기준으로 삼습니다.
- E2E(`apps/admin/e2e/`)는 세 앱을 프로덕션 빌드로 띄워 병렬로 돕니다. 데이터를 바꾸는 테스트는 서로 다른 매장을 씁니다(배정은 `docs/conventions.md`).
- 오프라인 검사: `offline.spec.ts`가 localhost 밖 브라우저 요청을 모두 끊은 채 세 앱의 모든 라우트·주요 상태가 내용과 함께 뜨고 axe 위반 0건인지, `kiosk-offline.spec.ts`가 키오스크 오프라인 동작을, `deployed-offline.spec.ts`가 데모 설정 서버에서 공유 DB·백오피스 API·이미지 최적화가 끊긴 배포본을 봅니다. 3100번대 포트를 다른 프로젝트가 쓰면 `E2E_PORT_BASE=4700 pnpm e2e`. 외부 의존(데모 Neon DB, 키오스크 API, BoardGameGeek 표지, Google Fonts)을 새로 늘리면 대체 방식을 함께 둡니다(`docs/demo.md`의 오프라인 동작).
- CI·배포·릴리스 상태는 명령 결과(`gh pr checks`, `gh run list`, Vercel 배포 READY, 주소 200)로 확인한 뒤에만 말합니다.
- 품질 예산: 홍보 사이트 JS 450 kB·CSS 70 kB(gzip, `apps/web/.size-limit.json`), Lighthouse 데스크톱 성능 90·접근성 100·권장 95·SEO 90(`apps/web/lighthouserc.json`). 백오피스 JS 716 kB·CSS 22 kB, 키오스크 JS 352 kB·CSS 21 kB(`apps/{admin,launcher}/.size-limit.json`, 1.2.5 측정값). 예산을 올리지 말고 줄일 곳을 먼저 찾습니다.
- 백엔드 API 부하는 로컬 서버에서만 잽니다: `pnpm load:api http://localhost:<포트>`(운영·데모 주소 금지).
- 테스트 원칙(Testing Library): 구현 세부가 아니라 사용자가 보는 동작을 검사하고, 요소는 역할·이름(`getByRole`)으로 찾습니다. 단위는 Vitest(백오피스 컴포넌트는 Vitest + Testing Library), 화면 흐름은 Playwright E2E(프로덕션 빌드), 접근성은 axe(`@axe-core/playwright`, Storybook 스토리 `test:stories`)로 검사합니다. 파일 이름은 `*.test.ts`(백오피스 컴포넌트는 `*.test.tsx`)이고 Jest는 쓰지 않습니다. 버그를 고치면 고치기 전에 실패하는 테스트를 함께 넣습니다.

## 5. 코드 스타일

- ESLint 9(`packages/config`, FSD 경계 규칙, jsx-a11y recommended 전부). 서식: Prettier·Biome 설정이 없습니다(표준과 다른 점). ESLint와 주변 코드 서식을 따릅니다.
- React Compiler를 켜 두었으므로 성능만을 위한 `useMemo`·`useCallback`·`memo`를 새로 넣지 않고 Hooks 규칙을 지킵니다.
- UI는 shadcn/ui만 씁니다. 없으면 `packages/ui`에서 `pnpm dlx shadcn@latest add <이름>`으로 추가하고, 다른 UI 라이브러리를 들이지 않습니다. Base UI의 `render` prop, 아이콘은 lucide-react. 폼 패턴·차트·오류 처리·변경 이력(`recordAudit`) 규칙과 알려진 함정은 `docs/conventions.md`를 따릅니다.
- 컴포넌트마다 옆에 `<이름>.stories.tsx`를 둡니다. 앱의 표시용 컴포넌트 스토리 제목은 `백오피스/`, `키오스크/`, `홈페이지/`로 시작하고 같은 Storybook에 나옵니다.
- 접근성(WCAG 2.2·KWCAG 2.2): 네이티브 요소 먼저, 텍스트 대비 4.5:1(destructive는 red-700), 모든 기능 키보드 가능·`:focus-visible` 유지, 조작 크기 24px 이상(권장 44), 입력칸 레이블과 오류의 `aria-invalid`·`aria-describedby` 연결(`@avocado/ui/lib/field-a11y`), 바뀌는 안내는 `role="status"`, 페이지별 `<title>`과 본문 바로가기. 자동 검사는 `eslint-plugin-jsx-a11y`(recommended 전부)와 axe(Storybook·Playwright)입니다.
- TypeScript strict(`packages/config/tsconfig.base.json`의 `"strict": true`)를 유지하고 `any`·`as` 단언·`@ts-ignore`를 피합니다. 외부 입력(폼, URL, 키오스크 API 응답)은 zod로 검증합니다.

## 6. Git·PR

- 흐름: GitHub Flow. `main`에 직접 커밋·푸시하지 않고, 최신 `main`에서 브랜치를 만들어 PR로만 병합합니다. PR은 목적 하나로 작게 만들고 본문에 무엇·왜·검사 결과를 적습니다.
- 브랜치 이름: `feat/…`, `fix/…`, `refactor/…`, `docs/…`, `test/…`, `chore/…`, `release/…`
- 커밋 메시지: Conventional Commits `<타입>: <한국어 요약>`, 타입은 `feat`, `fix`, `refactor`, `perf`, `docs`, `test`, `style`, `chore`, `ci`, `build`. 호환이 깨지면 본문에 `BREAKING CHANGE:`를 적습니다.
  - 실제 예) `fix: 공개 데모 DB 잠금이 멈춘 인스턴스에 묶여 요청이 걸리던 문제 (#70)`, `feat: v1.0.0 런칭 점검 — 로그인 잠금 우회·실시간 반영·통계 오류·동시 작업·접근성 (0.2.0) (#57)`
  - 표준과 다른 점: 변경을 `[Unreleased]`에 모았다가 릴리스 PR(`release: v1.0.0 준비 … (#66)`, `release` 타입)에서 한 번에 버전을 올리므로, 평소 커밋·PR 제목에는 버전을 붙이지 않습니다. 버전을 올린 PR만 `(x.y.z)`를 붙입니다. squash 병합이 `(#PR)`을 덧붙입니다.
  - 본문은 `-` 목록으로 무엇을 왜 바꿨는지 적습니다.
- 기여자는 ryushin01만 남깁니다(2026-11-21 사용자 결정). 커밋 작성자는 항상 `ryushin0 <141554987+ryushin01@users.noreply.github.com>`이고, 이 저장소는 백엔드 코드가 있어 커밋 본문 끝에 공동 작성자 줄 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` 하나만 넣습니다.
  - GitHub Actions가 커밋하는 워크플로는 작성자를 ryushin01로 설정합니다(`github-actions[bot]` 금지).
  - Dependabot PR은 그대로 병합하지 않습니다. 변경 내역을 확인하고 같은 변경을 ryushin01 커밋으로 다시 만들어 병합합니다(병합 커밋 작성자가 dependabot이 되지 않게).
- 버전: Semantic Versioning(주.부.수). 릴리스할 때 루트와 모든 앱·패키지의 `package.json` `version`을 같은 값으로 맞춥니다(README에 버전 배지는 없음). 문서만 바뀐 PR은 버전을 올리지 않습니다.
- 변경 기록: Keep a Changelog. `CHANGELOG.md`에 최신을 위에 두고, 릴리스 전 변경은 `## [Unreleased]` 아래 `### 추가`·`### 바뀜`·`### 수정`(필요하면 `### 제거`)에 적습니다. 릴리스할 때 `## [x.y.z] - YYYY-MM-DD`로 옮깁니다.
- 병합은 squash. CI가 통과하면 바로 병합하고 CodeRabbit(`.coderabbit.yaml`, 한국어 리뷰) 리뷰는 기다리지 않습니다. 이미 달린 맞는 지적은 반영합니다. `docs/conventions.md` 규칙을 바꾸면 `.coderabbit.yaml`의 경로별 지침도 함께 고칩니다.

## 7. 배포·릴리스

- 이 저장소에 연결된 Vercel 프로젝트들은 `main`에 병합하면 자동 배포됩니다: `avocado-web`(`apps/web`), `avocado-admin`(`apps/admin`), `avocado-kiosk`(`apps/launcher`). 앱마다 `vercel.json`으로 `main`만 배포하고 PR 미리보기는 끕니다. 바뀐 앱이 없으면 건너뜁니다(Affected Projects).
- 데모 모드: 데모 배포에만 `NEXT_PUBLIC_DEMO_MODE=1`. 백오피스 로그인 화면의 "본사 관리자로 둘러보기"·"강남점 스태프로 둘러보기"로 들어갑니다. 백오피스 데모는 데모 전용 Neon 무료 DB(`avocado-demo-db`, Vercel Neon 연동이 `DATABASE_URL` 관리)를 쓰고 30분마다 시드로 되돌립니다. `DATABASE_URL`이 없거나 Neon이 시간 초과·오류면 메모리 PGlite(개발 시드)로 대신하고 데모 안내에 `오프라인 데이터로 표시 중`을 보여 줍니다(`apps/admin/src/db/shared-guard.ts`). 키오스크는 백오피스 API가 닿지 않으면 데모·개발 중에 카탈로그 스냅숏을 보여 줍니다. 데모 모드가 꺼지면 원래대로 동작해야 합니다.
- 백오피스 Cron(`apps/admin/vercel.json`)이 매일 `/api/cron/retention`을 부릅니다(`CRON_SECRET`).
- 릴리스: 태그·GitHub 릴리스 `vX.Y.Z`(제목도 같음), 대상은 병합 커밋 전체 SHA, 본문은 요약 한 단락과 CHANGELOG의 해당 절.
- 릴리스 뒤 백업 `bash ~/Documents/Archive/Backup/backup.sh`, 보관함 `avocado-monorepo v1.0.0 고도화 계획.md`에 진행 기록, 소개가 바뀌면 프로필 `ryushin01/ryushin01` README 표 갱신.

## 8. 보안·주의사항

- 비밀값과 `.env*`의 실제 값을 커밋하지 않습니다. `.env.development`의 개발용 값(`NEXTAUTH_SECRET` 등)과 `preview` 스크립트의 로컬 값을 운영·데모 설정에 쓰지 않습니다.
- **먼저 묻기:** 새 런타임 의존성 추가(UI 라이브러리는 금지), 빌드·배포 설정(`next.config.ts`, `turbo.json`, 앱별 `vercel.json`, 워크플로) 변경, DB 스키마를 바꾸는 마이그레이션.
- **절대 금지:** 비밀값을 `NEXT_PUBLIC_*` 변수에 넣기, `.env` 커밋, `eslint-disable`·`--no-verify`로 검사 우회, `main` 직접 푸시.
- `SEED_DEMO=1`로 운영 계정을 만들지 않습니다(공개된 비밀번호 `avocado1234` 계정이 함께 들어감). 공개 데모에 실제 DB나 유료 키를 넣지 않습니다.
- 키오스크 API는 손님 이름을 가려(김*수) 보내고 전화번호는 보내지 않습니다. 변경 이력 `detail`·로그·Sentry에 비밀번호·토큰 원문·손님 정보를 넣지 않습니다. 백업 파일(`backups/`)은 커밋하지 않습니다.
- pnpm 12의 `minimumReleaseAge`(공개 하루 안 된 버전 거부)와 `allowBuilds`(설치 스크립트 허용 목록)를 지킵니다. 잠금 파일을 지우지 않습니다.
- 카탈로그 이미지는 `packages/domain/assets`에만 커밋합니다(앱 `public/images`는 복사본, git 제외).
- 로고·아이콘은 Flaticon 그림이라 출처 표기(홍보 사이트 바닥글, 백오피스 로그인, 키오스크 시작 화면, README)를 지우지 않습니다.

## 9. 공통 규칙

규칙은 3계층입니다. 1층 전역(`~/.claude/CLAUDE.md`, OpenCode는 `~/.config/opencode/AGENTS.md`로 같은 파일) → 2층 ryushin01 공통(`~/Documents/GitHub/CLAUDE.md`, Claude Code만 읽음) → 3층 이 파일. 충돌하면 이 파일이 우선합니다. 2층을 읽지 못하는 도구를 위해 핵심을 아래에 요약합니다.

- 답변·커밋·PR·문서는 한국어로 씁니다.
- 허락을 묻지 않고 끝까지 진행한 뒤 결과를 한 번에 보고합니다(비용·새 비밀값·디자인 결정·되돌리기 어려운 일·다른 조직 저장소 공개 글은 진행 전에 보고하고 결정을 받음).
- 사용자의 진행 중인 작업을 보호합니다. 로컬에 커밋하지 않은 변경이 있으면 `git worktree add`로 따로 작업하고 끝나면 지웁니다.
- 다른 세션에 보내는 공지는 ryushin01 그룹 세션에만 보냅니다.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# avocado-monorepo — 에이전트 작업 안내

위 블록은 `next dev`가 다시 넣는 Next.js 안내이므로 지우지 않습니다. 앱 폴더마다 `AGENTS.md`가 따로 있으니 그 앱을 고칠 때 함께 읽습니다. 자세한 내용은 `README.md`, `docs/conventions.md`, `docs/development.md`, `docs/demo.md`, `docs/deployment.md`에 있습니다.

## 1. 프로젝트 개요

- 보드게임 카페 프랜차이즈 모노레포입니다(화면은 한국어). 포트폴리오 프로젝트이며 매장·직원·손님 데이터는 모두 가상입니다.
- 화면 축 3개: 홍보 사이트(손님 온라인 예약 포함) · 백오피스 · 매장 키오스크
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
- E2E·스토리 검사 전에 `pnpm exec playwright install chromium`
- 환경 변수(이름만): 백오피스 `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `SEED_DEMO`, `CRON_SECRET`, `BOOKING_API_TOKEN`, `PGLITE_DATA_DIR` / 런처 `BACKOFFICE_URL`, `LAUNCHER_CAFE_ID`, `KIOSK_API_TOKEN` / 홍보 사이트 `BACKOFFICE_URL`, `BOOKING_API_TOKEN`, `SITE_URL`, `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` / 공통 `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` / 데모 `NEXT_PUBLIC_DEMO_MODE`, `NEXT_PUBLIC_DEMO_KIOSK_URL`, `NEXT_PUBLIC_DEMO_BACKOFFICE_URL`
- 데이터 가져오기: `pnpm import:avocado-images` → `pnpm import:avocado`, 홍보 사이트 사진은 `pnpm import:avocado-media`(기본으로 옆 폴더 `../avocado-master`를 읽음)

## 4. 검사·테스트 명령

- 완료 기준: 루트에서 `pnpm typecheck && pnpm lint && pnpm test && pnpm e2e && pnpm build`가 모두 통과해야 합니다.
- CI(`.github/workflows/ci.yml`, 작업 하나) 순서: `pnpm install --frozen-lockfile` → `pnpm audit --prod --audit-level high` → `pnpm typecheck` → `pnpm lint` → `pnpm test:coverage` → `pnpm build` → `pnpm --filter @avocado/web size` → `pnpm --filter @avocado/web lhci` → Playwright 설치 → `pnpm e2e` → `pnpm build-storybook` → `pnpm test:stories`(모든 스토리 axe)
- 타입 검사는 TypeScript 7(`tsc7`), 도구는 TypeScript 6입니다. 각 패키지의 `typescript`는 `~6.0.3`으로 고정하고 7로 올리지 않습니다(lint가 실패). 편집기와 결과가 다르면 `pnpm typecheck`를 기준으로 삼습니다.
- E2E(`apps/admin/e2e/`)는 세 앱을 프로덕션 빌드로 띄워 병렬로 돕니다. 데이터를 바꾸는 테스트는 서로 다른 매장을 씁니다(배정은 `docs/conventions.md`).
- 품질 예산(홍보 사이트): JS 450 kB·CSS 70 kB(gzip, `apps/web/.size-limit.json`), Lighthouse 데스크톱 성능 90·접근성 100·권장 95·SEO 90(`apps/web/lighthouserc.json`)

## 5. 코드 스타일

- ESLint 9(`packages/config`, FSD 경계 규칙, jsx-a11y recommended 전부). 별도 포매터 스크립트는 없으니 주변 코드 서식을 따릅니다.
- React Compiler를 켜 두었으므로 성능만을 위한 `useMemo`·`useCallback`·`memo`를 새로 넣지 않고 Hooks 규칙을 지킵니다.
- UI는 shadcn/ui만 씁니다. 없으면 `packages/ui`에서 `pnpm dlx shadcn@latest add <이름>`으로 추가하고, 다른 UI 라이브러리를 들이지 않습니다. Base UI의 `render` prop, 아이콘은 lucide-react. 폼 패턴·차트·오류 처리·변경 이력(`recordAudit`) 규칙과 알려진 함정은 `docs/conventions.md`를 따릅니다.
- 컴포넌트마다 옆에 `<이름>.stories.tsx`를 둡니다. 앱의 표시용 컴포넌트 스토리 제목은 `백오피스/`, `키오스크/`, `홈페이지/`로 시작하고 같은 Storybook에 나옵니다.
- 테스트: Vitest(`*.test.ts`, 백오피스 컴포넌트는 `*.test.tsx`), Playwright E2E. Jest는 쓰지 않습니다.
- 접근성(KWCAG 2.2): 네이티브 요소 먼저, 텍스트 대비 4.5:1(destructive는 red-700), 모든 기능 키보드 가능·`:focus-visible` 유지, 조작 크기 24px 이상(권장 44), 입력칸 레이블과 오류의 `aria-invalid`·`aria-describedby` 연결(`@avocado/ui/lib/field-a11y`), 바뀌는 안내는 `role="status"`, 페이지별 `<title>`과 본문 바로가기.

## 6. Git·PR

- `main`에 직접 커밋·푸시하지 않습니다. 최신 `main`에서 `feat/...`, `fix/...`, `docs/...`, `chore/...`, `refactor/...` 브랜치를 만듭니다.
- 커밋·PR 제목: `<type>: <한국어 요약> (#PR)` 예) `fix: 공개 데모 DB 잠금이 멈춘 인스턴스에 묶여 요청이 걸리던 문제 (#70)`. 본문은 `-` 목록으로 무엇을 왜 바꿨는지 적고, 끝에 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`를 붙입니다.
- `CHANGELOG.md`는 Keep a Changelog 형식입니다. 변경은 `## [Unreleased]` 아래 `### 추가`·`### 바뀜`·`### 수정`에 적고, 릴리스할 때 버전 절로 옮기며 루트와 앱·패키지의 `package.json` 버전을 함께 올립니다.
- 병합은 squash. CI가 통과하면 바로 병합하고 CodeRabbit(`.coderabbit.yaml`, 한국어 리뷰) 리뷰는 기다리지 않습니다. 이미 달린 맞는 지적은 반영합니다. `docs/conventions.md` 규칙을 바꾸면 `.coderabbit.yaml`의 경로별 지침도 함께 고칩니다.

## 7. 배포·릴리스

- Vercel 프로젝트 3개가 이 저장소에 연결되어 `main`에 병합하면 자동 배포됩니다: `avocado-web`(`apps/web`), `avocado-admin`(`apps/admin`), `avocado-kiosk`(`apps/launcher`). 앱마다 `vercel.json`으로 `main`만 배포하고 PR 미리보기는 끕니다. 바뀐 앱이 없으면 건너뜁니다(Affected Projects).
- 데모 모드: 데모 배포에만 `NEXT_PUBLIC_DEMO_MODE=1`. 백오피스 로그인 화면의 "본사 관리자로 둘러보기"·"강남점 스태프로 둘러보기"로 들어갑니다. 백오피스 데모는 데모 전용 Neon 무료 DB(`avocado-demo-db`, Vercel Neon 연동이 `DATABASE_URL` 관리)를 쓰고 30분마다 시드로 되돌립니다. `DATABASE_URL`이 없으면 메모리 PGlite를 씁니다. 데모 모드가 꺼지면 원래대로 동작해야 합니다.
- 백오피스 Cron(`apps/admin/vercel.json`)이 매일 `/api/cron/retention`을 부릅니다(`CRON_SECRET`).
- 릴리스: 태그·GitHub 릴리스 `vX.Y.Z`(제목도 같음), 대상은 병합 커밋 전체 SHA, 본문은 요약 한 단락과 CHANGELOG의 해당 절.
- 릴리스 뒤 백업 `bash ~/Documents/Archive/Backup/backup.sh`, 보관함 `avocado-monorepo v1.0.0 고도화 계획.md`에 진행 기록, 소개가 바뀌면 프로필 `ryushin01/ryushin01` README 표 갱신.

## 8. 보안·주의사항

- 비밀값과 `.env*`의 실제 값을 커밋하지 않습니다. `.env.development`의 개발용 값(`NEXTAUTH_SECRET` 등)을 운영·데모 설정에 쓰지 않습니다.
- `SEED_DEMO=1`로 운영 계정을 만들지 않습니다(공개된 비밀번호 `avocado1234` 계정이 함께 들어감). 공개 데모에 실제 DB나 유료 키를 넣지 않습니다.
- 키오스크 API는 손님 이름을 가려(김*수) 보내고 전화번호는 보내지 않습니다. 변경 이력 `detail`·로그·Sentry에 비밀번호·토큰 원문·손님 정보를 넣지 않습니다. 백업 파일(`backups/`)은 커밋하지 않습니다.
- pnpm 12의 `minimumReleaseAge`(공개 하루 안 된 버전 거부)와 `allowBuilds`(설치 스크립트 허용 목록)를 지킵니다. 잠금 파일을 지우지 않습니다.
- 카탈로그 이미지는 `packages/domain/assets`에만 커밋합니다(앱 `public/images`는 복사본, git 제외).
- 로고·아이콘은 Flaticon 그림이라 출처 표기(홍보 사이트 바닥글, 백오피스 로그인, 키오스크 시작 화면, README)를 지우지 않습니다.

## 9. 공통 규칙

공통 규칙은 `~/Documents/GitHub/CLAUDE.md`에 있으며, 이 파일과 충돌하면 이 파일이 우선합니다.

- 답변·커밋·PR·문서는 한국어로 씁니다.
- 허락을 묻지 않고 끝까지 진행한 뒤 결과를 한 번에 보고합니다(비용·비밀값·디자인 결정·되돌릴 수 없는 공개 행동은 보고만).
- 사용자의 진행 중인 작업을 보호합니다. 로컬에 커밋하지 않은 변경이 있으면 `git worktree add`로 따로 작업하고 끝나면 지웁니다.
- 다른 세션에 보내는 공지는 ryushin01 그룹 세션에만 보냅니다.

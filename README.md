# 보드게임 카페 프랜차이즈

보드게임 카페 프랜차이즈의 세 가지 웹 앱을 한 저장소에서 관리합니다(pnpm workspaces + Turborepo).

| 앱 | 폴더 | 포트 | 쓰는 사람 | 내용 |
|---|---|---|---|---|
| 백오피스 | `apps/admin` | 3000 | 본사 관리자·매장 스태프 | 카탈로그, 매장 재고, 이용 기록(대여·반납), 매장·직원 관리, 대시보드, 통계 |
| 가맹점 런처 | `apps/launcher` | 3001 | 매장 손님 (태블릿 키오스크) | 매장 보유 게임 둘러보기. 예약 확인·대기 등록은 준비 중 |
| 프랜차이즈 사이트 | `apps/web` | 3002 | 일반 방문자 | avocado를 옮긴 홍보 사이트: 게임 유형 소개, 유형별 목록, 게임 상세 |

| 공통 패키지 | 폴더 | 내용 |
|---|---|---|
| `@avocado/ui` | `packages/ui` | shadcn/ui 컴포넌트, 테마 CSS, 공통 훅 |
| `@avocado/domain` | `packages/domain` | 게임 카탈로그(avocado 변환 데이터·썸네일), 유형·난이도, 백오피스↔런처 API 타입 |
| `@avocado/config` | `packages/config` | 공통 tsconfig, ESLint 설정 |

저장소: [github.com/ryushin01/avocado-monorepo](https://github.com/ryushin01/avocado-monorepo) (로컬 폴더 이름은 `avocado`). 원래 avocado 프로젝트(`ryushin01/avocado`)와는 별도 저장소입니다.

> 아직 백엔드와 인증이 없습니다. 백오피스 데이터는 서버 메모리의 목 데이터라 서버를 다시 켜면 처음 상태로 돌아갑니다. 런처는 백오피스의 조회 API를 읽으므로 백오피스가 켜져 있어야 합니다.

## 시작하기

Node.js 22 이상과 pnpm 12가 필요합니다. 명령은 모두 저장소 루트에서 실행합니다.

pnpm 버전은 루트 `package.json`의 `packageManager`(`pnpm@12.16.1`)로 고정되어 있습니다. `pnpm -v`가 12보다 낮으면 먼저 올려 주세요. pnpm 9는 이 버전으로 자동 전환하지 않습니다.

```bash
npm install -g pnpm@12.16.1
```

```bash
pnpm install
pnpm exec playwright install chromium   # E2E 테스트를 돌릴 때만

pnpm dev                          # 세 앱을 모두 띄움
pnpm dev:admin               # 백오피스만
pnpm dev:launcher                 # 런처 + 런처가 읽는 백오피스
pnpm dev:web                     # 홍보 사이트만
```

특정 앱·패키지에서만 실행할 때는 `--filter`를 씁니다. 예: `pnpm --filter @avocado/admin test`

의존성을 추가할 때도 그것을 쓰는 앱·패키지에 추가합니다. 예: `pnpm --filter @avocado/web add <패키지>`. pnpm은 각 패키지가 `package.json`에 선언한 의존성만 가져올 수 있게 하므로, 루트에 설치돼 있다고 다른 곳에서 쓸 수 있는 것이 아닙니다. 내부 패키지는 `"workspace:*"`로 연결합니다.

pnpm 12는 공개된 지 하루가 안 된 패키지 버전을 설치하지 않습니다(`minimumReleaseAge`, 공급망 공격 대비). 의존성 범위에 맞는 더 오래된 버전이 없을 때만 pnpm이 그 버전을 `pnpm-workspace.yaml`의 `minimumReleaseAgeExclude`에 적습니다. 하루가 지나면 그 항목은 지워도 됩니다.

### 런처 설정

런처는 매장마다 환경 변수로 어느 백오피스·매장을 볼지 정합니다(`apps/launcher/.env.example`).

| 변수 | 기본값 | 설명 |
|---|---|---|
| `BACKOFFICE_URL` | `http://localhost:3000` | 백오피스 주소 |
| `LAUNCHER_CAFE_ID` | `c_gangnam` | 이 키오스크가 놓인 매장 |

## 스크립트

| 명령 | 설명 |
|---|---|
| `pnpm build` | 모든 앱 프로덕션 빌드 |
| `pnpm typecheck` | 모든 앱·패키지 타입 검사 |
| `pnpm lint` | ESLint |
| `pnpm test` | 단위 테스트 (Vitest) |
| `pnpm e2e` | E2E 테스트 (지금은 백오피스만) |
| `pnpm import:avocado-images` | avocado 데이터의 게임 이미지를 내려받아 128px webp 썸네일 생성 (`packages/domain/assets`). 있는 파일은 건너뜀 |
| `pnpm import:avocado` | avocado 데이터로 카탈로그 다시 생성 (`packages/domain/data/catalog.json`) |
| `pnpm import:avocado-media` | avocado 사진·아이콘을 홍보 사이트용 webp로 다시 생성 (`apps/web/public/images`) |

avocado 데이터가 바뀌면 `import:avocado-images` → `import:avocado` 순서로 실행합니다. 둘 다 기본으로 이 저장소 옆의 `../avocado-master`를 읽고, 다른 위치라면 경로를 인자로 넘기세요.

```bash
pnpm import:avocado-images /path/to/avocado
pnpm import:avocado /path/to/avocado/public/data
pnpm import:avocado-media /path/to/avocado   # 홍보 사이트 사진
```

카탈로그 이미지는 `packages/domain/assets`에만 커밋합니다. 각 앱의 `dev`·`build` 스크립트가 맨 앞에서 자기 `public/images`로 복사합니다(복사본은 git 제외).

## 폴더 구조

```
apps/
├─ admin/        백오피스 (README.md, docs/architecture.md)
├─ launcher/     가맹점 런처 (손님용 키오스크)
└─ web/          프랜차이즈 홈페이지
packages/
├─ ui/           shadcn/ui 컴포넌트와 테마
├─ domain/       카탈로그 데이터·썸네일, 공통 타입, avocado 변환 스크립트
└─ config/       tsconfig, ESLint
docs/
└─ conventions.md  모든 앱 공통 작성 규칙
```

## 문서

- [apps/admin/README.md](apps/admin/README.md): 백오피스 기능, 개발용 계정
- [apps/admin/docs/architecture.md](apps/admin/docs/architecture.md): 도메인 모델, 권한, 키오스크 API, Next.js 16 렌더링 규칙
- [apps/launcher/README.md](apps/launcher/README.md), [apps/web/README.md](apps/web/README.md)
- [docs/conventions.md](docs/conventions.md): UI·폼·테스트 규칙과 알려진 함정

## 아직 하지 않은 것

- 백엔드 API와 실제 인증 (런처 조회 API도 아직 인증 없음)
- 예약·대기: 백오피스 관리 화면, 런처의 예약 확인·대기 등록
- 런처·홈페이지의 E2E 테스트

# 개발 가이드

## pnpm

pnpm 버전은 루트 `package.json`의 `packageManager`(`pnpm@12.16.1`)로 고정되어 있습니다. `pnpm -v`가 12보다 낮으면 먼저 올려 주세요. pnpm 9는 이 버전으로 자동 전환하지 않습니다.

```bash
npm install -g pnpm@12.16.1
```

특정 앱·패키지에서만 실행할 때는 `--filter`를 씁니다. 예: `pnpm --filter @avocado/admin test`

의존성을 추가할 때도 그것을 쓰는 앱·패키지에 추가합니다. 예: `pnpm --filter @avocado/web add <패키지>`. pnpm은 각 패키지가 `package.json`에 선언한 의존성만 가져올 수 있게 하므로, 루트에 설치돼 있다고 다른 곳에서 쓸 수 있는 것이 아닙니다. 내부 패키지는 `"workspace:*"`로 연결합니다.

pnpm 12는 공개된 지 하루가 안 된 패키지 버전을 설치하지 않습니다(`minimumReleaseAge`, 공급망 공격 대비). 의존성 범위에 맞는 더 오래된 버전이 없을 때만 pnpm이 그 버전을 `pnpm-workspace.yaml`의 `minimumReleaseAgeExclude`에 적습니다. 하루가 지나면 그 항목은 지워도 됩니다.

## 런처 설정

런처는 매장마다 환경 변수로 어느 백오피스·매장을 볼지 정합니다(`apps/launcher/.env.example`).

| 변수 | 기본값 | 설명 |
|---|---|---|
| `BACKOFFICE_URL` | `http://localhost:3000` | 백오피스 주소 |
| `LAUNCHER_CAFE_ID` | `c_gangnam` | 이 키오스크가 놓인 매장 |
| `KIOSK_API_TOKEN` | `kio_dev_c_gangnam` (예시) | 이 기기의 키오스크 토큰. 백오피스 매장 관리 > 키오스크 토큰에서 매장·기기마다 발급합니다. 운영에서는 필수, 개발 DB에는 매장마다 `kio_dev_<매장 id>`가 있습니다 |

## 스크립트

| 명령 | 설명 |
|---|---|
| `pnpm dev` | 세 앱을 모두 띄움 (DB 설치 불필요, 처음 실행 때 시드 데이터를 넣음) |
| `pnpm dev:admin` | 백오피스만 |
| `pnpm dev:launcher` | 런처와 런처가 읽는 백오피스 |
| `pnpm dev:web` | 홍보 사이트만 |
| `pnpm build` | 모든 앱 프로덕션 빌드 |
| `pnpm typecheck` | 모든 앱·패키지 타입 검사 |
| `pnpm lint` | ESLint |
| `pnpm test` | 단위·컴포넌트 테스트 (Vitest) |
| `pnpm test:coverage` | 단위 테스트 + 커버리지 (앱마다 `coverage/`) |
| `pnpm e2e` | E2E 테스트 (백오피스, 키오스크용 런처, 홈페이지를 함께 띄움) |
| `pnpm import:avocado-images` | avocado 데이터의 게임 이미지를 내려받아 128px webp 썸네일 생성 (`packages/domain/assets`). 있는 파일은 건너뜀 |
| `pnpm import:avocado` | avocado 데이터로 카탈로그 다시 생성 (`packages/domain/data/catalog.json`) |
| `pnpm import:avocado-media` | avocado 사진·아이콘을 홍보 사이트용 webp로 다시 생성 (`apps/web/public/images`) |

`main` 푸시와 PR마다 GitHub Actions가 검사를 모두 실행합니다(`.github/workflows/ci.yml`). PR 리뷰는 CodeRabbit이 합니다(`.coderabbit.yaml`, GitHub에 앱 설치 필요).

avocado 데이터가 바뀌면 `import:avocado-images` → `import:avocado` 순서로 실행합니다. 둘 다 기본으로 이 저장소 옆의 `../avocado-master`를 읽고, 다른 위치라면 경로를 인자로 넘기세요.

```bash
pnpm import:avocado-images /path/to/avocado
pnpm import:avocado /path/to/avocado/public/data
pnpm import:avocado-media /path/to/avocado   # 홍보 사이트 사진
```

카탈로그 이미지는 `packages/domain/assets`에만 커밋합니다. 각 앱의 `dev`·`build` 스크립트가 맨 앞에서 자기 `public/images`로 복사합니다(복사본은 git 제외).

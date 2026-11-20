# 배포한다면 확인할 것

홍보 사이트는 Vercel에 배포했고(`main`에 머지하면 자동 배포), 백오피스와 런처는 로컬에서 실행합니다. 이 두 앱까지 배포한다면 호스팅과 DB 서비스에 상관없이 확인할 것을 모았습니다.

## 배포 단위

세 앱을 각각 따로 배포합니다. 백오피스의 화면과 백엔드는 나누지 않고 하나로 배포합니다.

- **백오피스:** 서버 컴포넌트와 서버 액션이 DB를 직접 읽어 화면과 백엔드가 같은 프로세스에서 돕니다. 나누려면 모든 조회·변경에 API와 인증 전달을 새로 만들어야 하고, 지금 규모에서 얻는 것이 없습니다.
- **런처·홈페이지:** 이미 별도 앱입니다. 런처는 키오스크 API로만 백오피스에 접근합니다.
- **나누는 것을 다시 볼 때:** 모바일 앱이나 외부 파트너처럼 웹 밖의 소비자가 생길 때, 집계·알림처럼 부하나 수명이 화면과 다른 작업이 생길 때(이 경우에도 그 작업만 분리), 백엔드를 다른 팀이 맡을 때입니다. `src/server`가 화면과 경계가 나뉘어 있어 그때 옮기기 쉽습니다.

## 첫 관리자 계정

운영 DB에는 시드를 넣지 않으므로 처음에는 계정이 하나도 없습니다. 첫 배포 뒤 한 번만 실행합니다.

```bash
DATABASE_URL=postgres://… pnpm --filter @avocado/admin create-admin --email owner@example.com --name 박대표
```

- 마이그레이션을 먼저 적용하고, 관리자 한 명을 만든 뒤 **임시 비밀번호를 한 번만** 보여 줍니다. 첫 로그인 때 새 비밀번호로 바꾸게 됩니다.
- 재직 중인 관리자가 이미 있으면 아무것도 하지 않습니다. 그다음 계정은 백오피스의 직원 관리에서 만듭니다.
- 매장도 처음에는 없으므로 로그인한 뒤 매장 관리에서 등록합니다.
- `SEED_DEMO=1`로 계정을 만들면 안 됩니다. 데모 매장·게임·기록과 문서에 공개된 비밀번호(`avocado1234`) 계정이 같이 들어갑니다.
- 개발 의존성(`tsx`)을 쓰므로 `pnpm install`을 개발 의존성까지 설치한 곳(CI 작업, 관리용 컴퓨터 등)에서 실행합니다.

## 배포 전에 정해야 하는 것

- [ ] **마이그레이션 실행 방법.** 지금은 서버가 처음 DB를 열 때 `process.cwd()/src/db/migrations`의 마이그레이션을 적용합니다.
  - 배포본에 `apps/admin/src/db/migrations` 폴더가 있어야 하고, 서버를 `apps/admin`에서 실행해야 합니다.
  - 서버를 여러 대 띄우면 동시에 적용하려 할 수 있습니다. 배포 단계에서 한 번만 실행하는 방식이 더 안전합니다.

## 앱별 환경 변수

### 백오피스 (`apps/admin`)

| 변수 | 운영 값 | 비고 |
|---|---|---|
| `DATABASE_URL` | 운영 PostgreSQL 주소 | 없으면 서버 디스크의 PGlite를 씀. 운영에서는 반드시 설정 |
| `NEXTAUTH_URL` | 백오피스의 실제 주소 (`https://…`) | 로그인 후 돌아올 주소 |
| `NEXTAUTH_SECRET` | 긴 임의 값 (`openssl rand -base64 32`) | 세션 서명용. 저장소의 개발 값을 쓰면 안 됨. 바꾸면 모든 로그인이 풀림 |
| `SEED_DEMO` | 설정하지 않음 | 시연용 서버에서만 `1` |
| `CRON_SECRET` | 긴 임의 값 | 하루 한 번 보관 기간이 지난 기록을 지우는 `/api/cron/retention`의 비밀 값. Vercel Cron이 `Authorization: Bearer <값>`으로 보낸다. 없으면 이 경로는 401 |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry 프로젝트의 DSN (선택) | 없으면 Sentry로 보내지 않음. 아래 "오류 확인" 참고 |

### 런처 (`apps/launcher`, 키오스크마다 하나)

| 변수 | 운영 값 | 비고 |
|---|---|---|
| `BACKOFFICE_URL` | 백오피스 주소 | 서버에서만 읽음 (손님 화면에 노출되지 않음) |
| `LAUNCHER_CAFE_ID` | 이 키오스크가 놓인 매장 id | |
| `KIOSK_API_TOKEN` | 백오피스 **매장 관리 → 매장 메뉴 → 키오스크 토큰**에서 발급한 값 | 운영에서 없으면 401. 다른 매장의 토큰이면 403. 발급할 때 한 번만 보임 |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry 프로젝트의 DSN (선택) | 빌드할 때 넣는다. 없으면 Sentry로 보내지 않음 |

세 변수는 서버를 켤 때의 환경 변수를 읽습니다. 빌드 하나를 여러 매장에 쓸 수 있고, 값을 바꾸면 다시 시작만 하면 됩니다. 빌드할 때 없어도 됩니다(빌드 중에는 백오피스를 부르지 않고, 화면은 요청마다 그립니다). 운영에서 하나라도 빠지면 개발 기본값(강남점, localhost)을 쓰지 않고 백오피스를 부르지 않으며, 빠진 이름을 `launcher_config_missing` 로그로 남깁니다.

### 홈페이지 (`apps/web`)

게임 이미지는 `cf.geekdo-images.com`에서 불러옵니다. 아래 변수는 모두 선택이며, 없으면 Sentry와 PostHog로 아무것도 보내지 않습니다.

| 변수 | 설명 |
|---|---|
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry 프로젝트의 DSN입니다. 브라우저에도 노출되는 값이며 비밀 값이 아닙니다. 빌드할 때 넣습니다. |
| `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` | 빌드할 때 소스맵을 올립니다. `SENTRY_AUTH_TOKEN`은 비밀 값입니다. |
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHog 프로젝트 키입니다. 브라우저에도 노출되는 값이며 비밀 값이 아닙니다. 빌드할 때 넣습니다. |
| `NEXT_PUBLIC_POSTHOG_HOST` | PostHog 주소입니다. 없으면 `https://us.i.posthog.com`(EU는 `https://eu.i.posthog.com`). 빌드할 때 넣습니다. |

Sentry로 보내는 내용은 오류와 스택 정보이고, 쿠키, 헤더, 쿼리 문자열, 사용자 정보, 방문 세션, 이동·클릭 기록은 모으지 않습니다. 오류에 붙는 콜백 인수, 일반 객체로 거부된 Promise의 필드 값, 주소의 `#` 뒤도 보내기 전에 지웁니다(`apps/web/src/shared/config/sentry.ts`). 브라우저는 같은 주소의 `/monitoring`으로 보내므로 CSP를 넓히지 않습니다. 브라우저 SDK는 DSN이 있을 때만 첫 화면 뒤(load 뒤 한가할 때, load가 10초 안에 오지 않으면 그때 바로)에 따로 받고(`apps/web/src/shared/lib/monitoring`), 받는 동안 난 오류는 20개까지 모았다가 보냅니다. 처음부터 받던 때보다 홈의 첫 로딩 JS가 259 kB에서 201 kB(gzip, 옛 브라우저용 `noModule` 폴리필 제외)로 줄었습니다.

PostHog로는 페이지 이동과 Web Vitals(LCP, INP, CLS, FCP, TTFB)만 보냅니다(`apps/web/src/shared/config/analytics.ts`). 쿠키와 브라우저 저장소를 쓰지 않고, 사람을 식별하지 않으며(`person_profiles: "never"`), 자동 클릭 수집과 화면 녹화를 끄고, Do Not Track을 따릅니다. 보내기 직전에 모든 이벤트의 주소 속성(`$current_url` 등)에서 쿼리 문자열과 해시를 빼고, 그 쿼리 키에서 뽑힌 속성(`키`, `$session_entry_키`, `$initial_키`)과 알려진 광고·캠페인 식별자(`utm_*`, `gclid`, `gad_source` 등)도 뺍니다. 캠페인 수집은 SDK 설정에서도 끕니다(`save_campaign_params: false`). 키가 있을 때만 스크립트를 내려받고, 브라우저는 같은 주소의 `/ingest`로 보내 `next.config.ts`의 rewrites가 PostHog로 넘깁니다.

## 빌드와 실행

```bash
pnpm install --frozen-lockfile
pnpm --filter @avocado/admin build      # 런처·홈페이지도 같은 방식
pnpm --filter @avocado/admin start      # 3000번 포트 (런처 3001, 홈페이지 3002)
```

- Node 24 이상을 씁니다(`.node-version`, CI와 같음).
- `build`가 카탈로그 이미지를 `public/images`로 복사하므로 `packages/domain/assets`도 배포본에 있어야 합니다.
- 배포 전에 CI의 다섯 가지 검사가 통과했는지 확인합니다.

## 공개 데모로 띄울 때

저장소가 공개라 개발 계정 비밀번호(`avocado1234`), 개발 서명 키, 개발 키오스크 토큰(`kio_dev_<매장 id>`)을 누구나 알 수 있습니다.

- [ ] `SEED_DEMO=1`로 인터넷에 띄우면 누구나 관리자로 로그인해 데이터를 바꿀 수 있습니다. 공개 데모는 시연용 비밀번호와 토큰으로 바꾸거나, 읽기 전용 방식이나 주기적 초기화를 먼저 마련합니다.
- [ ] `NEXTAUTH_SECRET`은 `.env.development`의 값을 쓰지 않고 새로 만듭니다. 이 값을 알면 로그인 쿠키를 위조할 수 있습니다.

## 보안

- [ ] 모든 앱을 HTTPS로만 엽니다. 키오스크 토큰과 로그인 쿠키가 오갑니다.
- [ ] 로그인 실패 5번이면 15분 잠깁니다. 이메일 기준이므로, 누군가 일부러 남의 계정을 잠글 수 있습니다. IP별 요청 제한은 프록시 구성에 따라 믿을 수 있는 IP가 달라지므로 호스팅을 정한 뒤 그쪽에 둡니다.
- [ ] 키오스크 기기를 잃어버리거나 바꾸면 매장 관리에서 그 토큰을 폐기합니다.
- [ ] 퇴사한 직원은 직원 관리에서 퇴사 처리합니다. 다음 요청부터 바로 막힙니다(세션이 12시간 남아 있어도).
- [ ] 키오스크 API는 손님 이름을 가려서(김*수) 보내고 전화번호는 보내지 않습니다. 이 규칙을 바꾸는 변경은 따로 검토합니다.
- [ ] `.env.development`의 값(개발용 비밀 값)이 운영 설정에 들어가지 않았는지 확인합니다.

## 오류 확인

- 서버 오류는 앱 프로세스의 표준 오류에 한 줄 JSON으로 남습니다(`service`, `event`, `path`, `digest` 등). 호스팅의 로그 보관 기간을 확인합니다.
- 직원이 알려 준 오류 번호는 로그의 `digest`로 찾습니다.
- [ ] 런처에서 `event`가 `backoffice_error`(상태 401이면 토큰 문제), `backoffice_unreachable`, `launcher_config_missing`(설정 빠짐)이면 손님 화면에는 연결 안내만 보입니다. 이 로그에 알림을 겁니다.

### Sentry (세 앱 공통, 무료 Developer 요금제로 충분)

코드는 준비돼 있고 DSN만 넣으면 동작합니다(`packages/monitoring`). DSN이 없으면 아무것도 보내지 않습니다.

1. Sentry에서 Next.js 프로젝트를 앱마다 만들고(admin·launcher·web), 각 DSN을 그 앱의 `NEXT_PUBLIC_SENTRY_DSN`에 넣어 다시 빌드합니다. 한 프로젝트를 함께 써도 `service` 태그로 나눠 볼 수 있습니다.
2. 소스맵을 올리려면 빌드 환경에 `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`(비밀 값)을 넣습니다. 없으면 소스맵 없이 보냅니다.
3. Sentry의 알림 규칙으로 새 오류·`backoffice_unreachable` 같은 이벤트를 메일로 받습니다.

- **보내는 것:** 서버 요청 오류(`onRequestError`), 화면 오류(오류 화면에 잡힌 것), `logError`로 남기는 오류(키오스크의 백오피스 연결 실패·설정 빠짐, 변경 이력 실패, 보관 기간 정리 실패 등). 같은 로그 이벤트는 10분에 한 번만 보내 양을 줄입니다. 이벤트 종류마다 따로 세므로(두 종류가 계속 나면 30일에 8,640건) 무료 한도(월 5천 건)를 보장하지는 않습니다. Sentry 프로젝트의 사용량 알림과 한도(Spike Protection)를 함께 켜 두세요.
- **보내지 않는 것:** 쿠키, 요청 헤더·본문, 쿼리 문자열, 사용자 정보, 방문 기록·클릭 기록. DB 오류 메시지의 쿼리 값(손님 전화번호 등)은 서버 로그와 같은 규칙으로 가립니다(`scrubEvent`). 브라우저는 같은 주소의 `/monitoring`으로 보내므로 CSP를 넓히지 않습니다.

## 운영 데이터

- **보관 기간** (`apps/admin/src/server/retention/repository.ts`): 손님 예약(방문 예정 시각 기준)·현장 대기(등록 시각 기준)는 90일, 변경 이력은 2년, 로그인 실패·요청 제한 횟수는 하루가 지나면 지웁니다. 이용 기록은 손님 정보가 없어 통계를 위해 남깁니다.
  - Vercel에서는 Cron(`apps/admin/vercel.json`)이 매일 새벽 3시(한국)에 `/api/cron/retention`을 부릅니다(`CRON_SECRET` 필요). 다른 호스팅은 같은 일을 하는 `DATABASE_URL=… pnpm --filter @avocado/admin db:prune`을 하루 한 번 예약 작업으로 돌립니다.
  - 지운 수는 `retention_pruned` 로그로, 실패는 `retention_failed`로 남습니다.
- [ ] 시각은 DB에 UTC로 저장하고 화면은 한국 시각으로 보여 줍니다. 서버 시간대 설정과 상관없습니다.
- [ ] 첫 배포 뒤 매장·게임 카탈로그를 실제 데이터로 등록 (데모 시드 대신)

## 백업과 복원

백업에는 손님 이름·휴대전화가 들어 있습니다. 저장소에 넣지 말고(`backups/`는 git 제외) 접근을 제한한 곳에 암호화해 보관하고, 보관 기간(90일)이 지난 백업은 지웁니다.

- **관리형 PostgreSQL:** 호스팅의 자동 백업·특정 시점 복원(Neon은 과거 시점에서 브랜치를 만들어 복원)을 씁니다. 무료 요금제는 되돌릴 수 있는 기간이 짧으므로 아래 논리 백업을 함께 둡니다.
- **논리 백업:** `DATABASE_URL=… pnpm --filter @avocado/admin db:backup`이 pg_dump로 일반 SQL 파일을 만듭니다(PostgreSQL 클라이언트 도구 필요). `DATABASE_URL`이 없으면 개발 DB(PGlite)를 같은 형식으로 내보냅니다. 파일은 이 계정만 읽을 수 있게(0600, 기본 `backups/` 폴더는 0700) 만들고, 이름에 초 단위 시각과 임의 꼬리표를 붙여 앞 백업을 덮지 않습니다. 실패하면 덜 만든 파일을 지우고, 오류 내용(손님 정보가 든 SQL) 대신 오류 코드만 보입니다.
- **복원:** 빈 DB를 만들고 `psql "$RESTORE_DATABASE_URL" -v ON_ERROR_STOP=1 -f <백업 파일>`로 넣은 뒤, 백오피스의 `DATABASE_URL`을 그 DB로 바꿔 띄웁니다. 백업에 마이그레이션 적용 기록이 들어 있어, 서버가 처음 열 때 이미 적용한 마이그레이션은 다시 하지 않고 백업 뒤에 생긴 것만 이어서 올립니다.
- **복원 시험:** `src/db/backup.test.ts`가 시드를 넣은 DB를 pg_dump로 백업하고 새 DB에 복원해, 모든 표의 내용이 같고 앱이 마이그레이션을 다시 하지 않는지 CI에서 매번 확인합니다. 손으로 확인할 때는 `pnpm --filter @avocado/admin db:restore <백업 파일>`이 개발용 PGlite DB(`.data/pglite-restored`)로 복원하고, `PGLITE_DATA_DIR=.data/pglite-restored`로 띄워 로그인·목록을 봅니다.
- [ ] 운영을 시작하면 분기마다 한 번 최신 백업을 시험용 DB에 복원해 로그인·예약 목록을 확인합니다.

## 홍보 사이트 데모 (Vercel)

`apps/web`은 Vercel 프로젝트 `avocado-web`(루트 폴더 `apps/web`)에 연결되어 있습니다. `main`에 푸시하면 자동으로 운영 배포됩니다. 하루 배포 한도를 아끼려고 PR 미리보기 배포는 껐습니다(`apps/web/vercel.json`의 `git.deploymentEnabled`). 환경 변수는 필요 없습니다. 공유 정보와 `sitemap.xml`의 주소는 Vercel의 운영 주소를 쓰고, 다른 도메인을 연결하면 `SITE_URL`로 덮어씁니다. 백오피스와 키오스크는 서버와 DB가 필요해 배포하지 않습니다.

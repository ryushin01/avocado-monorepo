# 공개 데모

| 앱 | 주소 | 들어가는 법 |
|---|---|---|
| 홍보 사이트 | https://avocado-web-ryushin01.vercel.app/ | 바로 |
| 백오피스 | https://avocado-admin-ryushin01.vercel.app/ | 로그인 화면의 "본사 관리자로 둘러보기" 또는 "강남점 스태프로 둘러보기" (직접 입력: `admin@example.com` / `avocado1234`) |
| 매장 키오스크 (강남점) | https://avocado-kiosk-ryushin01.vercel.app/ | 바로 |

매장·직원·손님은 모두 개발용 시드의 가상 데이터입니다.

## 키오스크와 백오피스를 함께 보기

1. 백오피스에 로그인해 **예약·대기** 화면(강남점)을 열어 둡니다.
2. 다른 탭에서 키오스크의 **대기 등록**으로 현장 대기를 등록합니다.
3. 백오피스 화면에 새로고침 없이 나타납니다(15초마다 갱신).
4. 백오피스에서 **호출**을 누르면 키오스크의 **내 순서 확인**(전화번호 뒷자리)에 "지금 호출됐습니다"가 보입니다.

두 화면 위쪽의 데모 안내에 서로의 링크가 있습니다.

## 데모 모드가 하는 일

데모 배포에만 `NEXT_PUBLIC_DEMO_MODE=1`을 넣습니다. 이 값이 없으면 앱은 원래대로 동작합니다.

- **DB:** 데모 배포(`avocado-admin`)는 데모 전용 Neon 무료 DB(`avocado-demo-db`)를 씁니다. Vercel에 설치된 Neon 연동이 Production 환경에 `DATABASE_URL`·`DATABASE_URL_UNPOOLED` 등을 넣으므로 저장소에는 주소가 없습니다. 화면·서버 액션·API 라우트를 맡은 모든 함수가 이 PostgreSQL을 직접 써서, Vercel이 함수를 여러 대로 늘려도 같은 데이터를 봅니다(`apps/admin/src/db/demo-shared.ts`).
  - 처음 연 인스턴스가 PostgreSQL 권고 잠금을 잡고 마이그레이션을 적용합니다(풀러를 거치지 않는 `DATABASE_URL_UNPOOLED`로). 비어 있으면 바로 시드를 넣습니다.
  - **30분마다 되돌리기:** 크론(Hobby는 하루 한 번까지) 대신 요청이 올 때 확인합니다. 인스턴스는 마지막으로 되돌린 시각을 기억해 대부분 DB에 묻지 않고, 30분이 지났으면 트랜잭션 안에서 권고 잠금을 잡은 뒤 그 시각(`avocado_demo.reset_state`)을 다시 읽습니다. 다른 인스턴스가 이미 되돌렸으면 그대로 두고, 아니면 앱 표를 모두 비우고(TRUNCATE) 시드를 넣습니다. 한 트랜잭션이라 다른 요청은 되돌리기 전이나 뒤의 데이터만 봅니다. 실패하면 데이터를 그대로 두고 10초 뒤 다시 합니다.
  - 잠금은 20초 넘게 기다리지 않습니다(`lock_timeout`). Vercel은 요청이 끊긴 인스턴스를 멈출 수 있어, 잠금을 쥔 채 멈춘 연결은 15초 동안 아무것도 보내지 않으면 PostgreSQL이 끊어 잠금을 풉니다(`idle_session_timeout`, `idle_in_transaction_session_timeout`). 그래서 다른 인스턴스가 잠금을 기다리다 요청이 끝없이 걸리지 않습니다.
  - 쉬는 연결은 20초 뒤 닫아, 방문자가 없을 때 Neon이 잠들어 무료 계산 시간을 아낍니다.
- **`DATABASE_URL`이 없는 데모(로컬에서 켤 때):** 메모리 PGlite에 개발용 시드를 넣어 시작하고 30분마다 새로 만듭니다(`apps/admin/src/db/server.ts`). Vercel은 화면(서버 액션 포함)과 API 라우트(로그인, 키오스크 API)를 서로 다른 함수로 띄우므로, 메모리 DB는 `/api/demo/db` 한 곳에만 두고 나머지는 `drizzle-orm/pg-proxy`로 SQL을 보냅니다(`apps/admin/src/db/demo-proxy.ts`). 데모 전용 DB를 쓰는 배포에서는 이 경로가 404입니다.
  - pg-proxy는 트랜잭션을 지원하지 않아, begin부터 commit·rollback까지 세션 번호로 묶고 받는 쪽은 그동안 PGlite 트랜잭션을 열어 둡니다. 10초 동안 아무 요청이 없으면 되돌리고 잠금을 풉니다.
  - 요청 열쇠는 `NEXTAUTH_SECRET`에서 만듭니다. 열쇠가 틀리거나 데모가 아니면 404를 돌려줍니다.
  - 한 인스턴스의 쿼리는 하나씩 보냅니다. 한꺼번에 많이 보내면 Vercel이 받는 함수를 여러 대로 늘려 DB가 갈라집니다.
- **로그인:** 로그인 화면에 데모 계정 버튼이 생기고, 비밀번호 변경은 막습니다(모두 같은 계정을 쓰므로).
- **키오스크:** 백오피스 요청 제한 시간을 5초에서 15초로 늘립니다. 한동안 쉬었던 백오피스는 첫 요청 때 함수와 Neon이 깨어나느라 느립니다.

## 오프라인 동작

포트폴리오 데모가 외부 서비스 장애로 비어 보이지 않도록, 화면에 필요한 자료는 모두 저장소에 있거나 대신할 자료가 있습니다.

| 외부 의존 | 쓰는 곳 | 닿지 않을 때 |
|---|---|---|
| 데모 전용 Neon DB(`DATABASE_URL`) | 백오피스 공개 데모 | 25초 안에 열리지 않거나 1분마다 하는 확인(`select 1`)이 실패하면(무료 한도 초과·장애·오프라인) 그 인스턴스의 메모리 PGlite(개발용 시드)로 대신하고, 1분 뒤 다시 시도합니다. 화면 위 데모 안내에 `오프라인 데이터로 표시 중`(`role="status"`)이 붙습니다(`apps/admin/src/db/shared-guard.ts`). 바꾼 내용은 함수마다 다를 수 있습니다. |
| 백오피스 키오스크 API | 키오스크 처음 화면·보유 게임 | 공개 데모와 개발 중에는 함께 배포한 본사 카탈로그 스냅숏(로컬 썸네일)으로 보여 주고 `오프라인 데이터로 표시 중` 안내를 띄웁니다. 이용 현황은 알 수 없어 숨깁니다. 데모가 아닌 실제 매장 운영에서는 엉뚱한 목록 대신 기존 연결 안내를 보입니다. 예약 확인·대기 등록은 연결 안내를 보입니다. |
| BoardGameGeek 표지 원본 | 홍보 사이트 게임 칸·게임 화면 | 함께 배포한 썸네일(`/images/games/*.webp`)로 바꿉니다. |
| 백오피스 예약 API | 홍보 사이트 온라인 예약 | 기존대로 매장 전화번호를 안내합니다. |
| 글꼴(Geist·Instrument Sans·IBM Plex Mono·Comfortaa·고운돋움) | 세 앱 | npm 패키지의 파일을 함께 배포해 외부 요청이 없습니다(빌드 때도). |
| Vercel 이미지 최적화(`/_next/image`) | 홍보 사이트 사진·게임 표지 | 사이트 사진(큰 사진·유형 배너·매장 사진·메뉴 배너·10위권 표시)은 이미 줄인 webp라 최적화를 거치지 않고 원본 파일을 보냅니다(`unoptimized`). 무료 요금제 변환 한도를 넘어 402가 나도 그대로 보입니다. 게임 표지는 위처럼 썸네일로 바꿉니다. |
| PostHog·Sentry | 홍보 사이트 분석, 세 앱 오류 수집 | 키(`NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_SENTRY_DSN`)가 없으면 스크립트를 받지 않습니다. 보내기 실패는 화면에 영향이 없습니다. |

로컬에서 `.env` 없이 확인하려면 `pnpm install` 뒤 `pnpm dev`(개발 서버) 또는 `pnpm preview`(세 앱 프로덕션 빌드 뒤 실행, 메모리 DB·개발용 시드·로컬 전용 토큰)를 씁니다. CI(`pnpm e2e`)는 두 가지를 검사합니다.

- `apps/admin/e2e/offline.spec.ts`: 브라우저의 localhost 밖 요청을 모두 끊고(표지 원본 요청도 실패시킴) 세 앱의 모든 라우트와 주요 상태(온라인 예약 찾기·오류·확정, 키오스크 대기 등록·내 순서·예약 도착, 백오피스 실시간 반영·테이블 배정, 모바일 목록, 없는 주소)가 내용과 함께 뜨는지, 이미지·글꼴이 깨지지 않는지, 화면·상태마다 axe 위반이 없는지 봅니다. `kiosk-offline.spec.ts`는 키오스크 태블릿의 인터넷이 끊긴 경우를 봅니다.
- `apps/admin/e2e/deployed-offline.spec.ts`: 같은 빌드를 공개 데모 설정(`NEXT_PUBLIC_DEMO_MODE=1`)으로 한 벌 더 띄우고 공유 데모 DB·백오피스 주소를 아무도 듣지 않는 포트로 줘서, 배포본의 서버 쪽 외부가 끊겼을 때 위 표의 대체(임시 데이터 안내, 카탈로그 스냅숏, 연결 안내, 전화 예약 안내)와 이미지 최적화 402를 봅니다.

## 한계

- 데이터는 모든 방문자가 함께 씁니다. 다른 방문자가 바꾼 내용이 그대로 보이고, 내가 바꾼 내용도 남에게 보입니다.
- 바꾼 내용은 마지막으로 되돌린 뒤 30분이 지나 처음 오는 요청 때 처음 상태로 돌아갑니다(아무도 없으면 그다음 방문 때). 되돌리는 1~2초 동안 다른 요청은 잠시 기다립니다.
- 함수가 여러 대로 늘어도 같은 DB를 보므로 화면마다 데이터가 갈라지지 않습니다.
- 한동안 아무도 쓰지 않았다면 첫 화면이 몇 초 걸립니다(함수와 Neon이 깨어나는 시간).
- Neon 무료 요금제(프로젝트당 저장 1GB, 계산 100 CU-시간) 안에서만 씁니다. 한도를 넘으면 그달 남은 기간 DB가 멈추며, 요금이 나가지는 않습니다.

## Vercel 프로젝트

| 프로젝트 | 루트 폴더 | 환경 변수 (Production) |
|---|---|---|
| `avocado-admin` | `apps/admin` | `NEXT_PUBLIC_DEMO_MODE=1`, `NEXT_PUBLIC_DEMO_KIOSK_URL`, `NEXTAUTH_URL`(데모 주소), `NEXTAUTH_SECRET`(데모 전용으로 새로 만든 값), `DATABASE_URL`·`DATABASE_URL_UNPOOLED` 등(Neon 연동이 관리, 저장소 `avocado-demo-db`, 지역 iad1, Free) |
| `avocado-kiosk` | `apps/launcher` | `NEXT_PUBLIC_DEMO_MODE=1`, `NEXT_PUBLIC_DEMO_BACKOFFICE_URL`, `BACKOFFICE_URL`, `LAUNCHER_CAFE_ID=c_gangnam`, `KIOSK_API_TOKEN=kio_dev_c_gangnam`(시드의 개발용 토큰) |

두 프로젝트 모두 홍보 사이트(`avocado-web`)처럼 이 저장소에 연결돼 `main`에 머지하면 배포되고, 바뀐 앱이 없으면 건너뜁니다(Affected Projects). 키오스크는 `apps/launcher/vercel.json`으로 `main`만 배포합니다.

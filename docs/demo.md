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

- **DB:** 백오피스는 `DATABASE_URL`을 보지 않고 메모리 PGlite에 개발용 시드를 넣어 시작합니다(`apps/admin/src/db/server.ts`). 30분마다 새로 만들어 방문자가 바꾼 내용을 되돌립니다.
- **DB 하나를 함께 쓰기:** Vercel은 화면(서버 액션 포함)과 API 라우트(로그인, 키오스크 API)를 서로 다른 함수로 띄웁니다. 함수마다 메모리 DB를 열면 키오스크가 등록한 대기가 백오피스에 보이지 않으므로, 메모리 DB는 `/api/demo/db` 한 곳에만 두고 나머지는 `drizzle-orm/pg-proxy`로 SQL을 보냅니다(`apps/admin/src/db/demo-proxy.ts`).
  - pg-proxy는 트랜잭션을 지원하지 않아, begin부터 commit·rollback까지 세션 번호로 묶고 받는 쪽은 그동안 PGlite 트랜잭션을 열어 둡니다. 10초 동안 아무 요청이 없으면 되돌리고 잠금을 풉니다.
  - 요청 열쇠는 `NEXTAUTH_SECRET`에서 만듭니다. 열쇠가 틀리거나 데모가 아니면 404를 돌려줍니다.
  - 한 인스턴스의 쿼리는 하나씩 보냅니다. 한꺼번에 많이 보내면 Vercel이 받는 함수를 여러 대로 늘려 DB가 갈라집니다.
- **로그인:** 로그인 화면에 데모 계정 버튼이 생기고, 비밀번호 변경은 막습니다(모두 같은 계정을 쓰므로).
- **키오스크:** 백오피스 요청 제한 시간을 5초에서 15초로 늘립니다. 한동안 쉬었던 백오피스는 첫 요청 때 메모리 DB를 새로 만들어 느립니다.

## 한계

- 바꾼 내용은 30분마다, 또 서버가 한동안 쉬었다 다시 켜질 때 처음 상태로 돌아갑니다.
- 방문자가 몰려 Vercel이 함수를 여러 대로 늘리면, 대마다 메모리 DB가 따로 생겨 잠시 화면마다 데이터가 달라 보일 수 있습니다.
- 한동안 아무도 쓰지 않았다면 첫 화면이 몇 초 걸립니다.

## Vercel 프로젝트

| 프로젝트 | 루트 폴더 | 환경 변수 (Production) |
|---|---|---|
| `avocado-admin` | `apps/admin` | `NEXT_PUBLIC_DEMO_MODE=1`, `NEXT_PUBLIC_DEMO_KIOSK_URL`, `NEXTAUTH_URL`(데모 주소), `NEXTAUTH_SECRET`(데모 전용으로 새로 만든 값) |
| `avocado-kiosk` | `apps/launcher` | `NEXT_PUBLIC_DEMO_MODE=1`, `NEXT_PUBLIC_DEMO_BACKOFFICE_URL`, `BACKOFFICE_URL`, `LAUNCHER_CAFE_ID=c_gangnam`, `KIOSK_API_TOKEN=kio_dev_c_gangnam`(시드의 개발용 토큰) |

두 프로젝트 모두 홍보 사이트(`avocado-web`)처럼 이 저장소에 연결돼 `main`에 머지하면 배포되고, 바뀐 앱이 없으면 건너뜁니다(Affected Projects). 키오스크는 `apps/launcher/vercel.json`으로 `main`만 배포합니다.

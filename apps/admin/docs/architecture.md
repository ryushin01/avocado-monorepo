# 아키텍처

## 도메인 모델

```
Cafe (매장) ──< InventoryItem (매장 재고) >── BoardGame (카탈로그)
  │  └──────< PlaySession (이용 기록) >────────┘
  └──< User (직원, 스태프의 소속 매장)
```

| 모델 | 위치 | 설명 |
|---|---|---|
| `BoardGame` | `src/lib/games/types.ts` | 본사 공통 카탈로그. 이름·영문명·이미지·유형(여러 개)·인원·플레이 시간·난이도. 매장 정보는 없다. |
| `Cafe` | `src/lib/cafes/types.ts` | 프랜차이즈 매장 (시드는 가상의 5개 매장). 상태는 `open`(운영 중)·`closed`(폐점) |
| `InventoryItem` | `src/lib/inventory/types.ts` | 매장 하나가 보유한 게임 하나. `(cafeId, gameId)`가 키. 보유 수량과 상태 하나(`available`·`maintenance`·`retired`) |
| `PlaySession` | `src/lib/plays/types.ts` | 게임 한 번 대여. `startedAt`(이용 시작), `returnedAt`(반납, 없으면 이용 중), `playerCount`, `table`. 인기 순위를 계산한다. |
| `Reservation` | `src/lib/reservations/types.ts` | 예약. 이름·휴대전화·인원·방문 시각·메모, 상태 `pending`(가예약)·`confirmed`(확정)·`seated`(입장)·`cancelled`(취소)·`no_show`(노쇼), 키오스크 도착 시각 `arrivedAt` |
| `WaitlistEntry` | `src/lib/waitlist/types.ts` | 현장 대기. 그날 매장별 번호, 이름·휴대전화·인원, 상태 `waiting`·`called`·`seated`·`left`(이탈) |
| `User` | `src/lib/auth/roles.ts` | `admin` 또는 `staff`. 스태프는 `cafeId`로 소속 매장을 가진다. `active: false`는 퇴사. 로그인 계정이며 비밀번호는 bcrypt 해시로 `users.password_hash`에 둔다. |

정해 둔 것:

- **상태는 게임당 하나**입니다. "3박스 중 1박스만 점검 중"은 표현하지 않습니다.
- **카탈로그 유형**은 avocado의 `boardgameTypeData.json`과 이름까지 같게 유지합니다. `packages/domain/scripts/import-avocado.mjs`가 원본과 다르면 멈춥니다.
- **대시보드 집계 기준:** 관리자는 전체 매장, 스태프는 소속 매장을 기준으로 집계합니다.
  - **보유 박스:** 폐기를 빼고 셉니다.
  - **보유 게임(종):** 여러 매장이 가진 같은 게임은 한 번만 셉니다.
  - **유형별 차트:** 여러 유형에 속한 게임은 각 유형에 모두 셉니다.
  - **인원수별 차트:** 최소~최대 인원 사이에 그 인원이 들어가는 게임을 셉니다. 마지막 구간은 "8명 이상"입니다.
  - **플레이 시간별 차트:** 최소 플레이 시간으로 나누고, 경계값은 아래 구간에 넣습니다(예: 30분은 "30분 이하").
  - **이용 현황** (`plays/repository.ts`의 `usage`): 지금 이용 중(반납 전), 오늘 이용(한국 시간 0시부터 이용 시작한 횟수), 최근 7일 이용을 셉니다. 요약 칸은 전체, 관리자의 매장별 현황 표는 매장마다 보여줍니다.
- **통계** (`lib/stats/repository.ts`, 화면 `/stats`)
  - **기간:** 최근 7·14·28일(기본 28일). 오늘은 아직 끝나지 않아 빼고, **어제까지의 온전한 날**만 셉니다. 비교 대상은 바로 앞의 같은 길이 기간입니다. 28일이 최대인 것은 목 이용 기록이 60일치라 지난 기간까지 채울 수 있는 길이이기 때문입니다(4주라 요일도 고르게 들어감).
  - **범위:** 관리자는 전체 매장 또는 매장 하나(`?cafe=`), 스태프는 소속 매장만. 폐점 매장은 빠집니다.
  - **요약 수치:** 이용 횟수·하루 평균(늘면 좋음, 초록·빨강으로 표시), 평균 이용 시간·평균 인원(좋고 나쁨이 없어 회색). 평균 이용 시간은 반납한 기록만으로 계산합니다.
  - **요일·시간대:** 한국 시간 기준 이용 시작 횟수. 시간 범위는 기록이 있는 시간대(지금은 12~23시)입니다.
  - **박스당 이용(회전율):** 기간 이용 횟수 ÷ 범위 안 매장의 보유 박스(폐기 제외, 점검 중 포함). 많이 이용된 10개는 박스를 늘릴 후보, 적게 이용된 10개는 진열을 바꾸거나 옮길 후보입니다.
- **예약 규칙** (`reservations/repository.ts`)
  - 직원이 전화 등으로 받아 등록합니다(손님이 직접 예약하는 화면은 아직 없음). 기본 상태는 확정이고, 가예약으로 받을 수도 있습니다.
  - 상태는 가예약 → 확정 → 입장, 또는 취소·노쇼로 끝납니다. 끝난 예약은 고치거나 상태를 바꿀 수 없고, 확정을 가예약으로 되돌리지 않습니다.
  - 지난 시각으로 등록할 수 없습니다(수정할 때는 시각을 바꿀 때만 확인). 노쇼는 예약 시각이 지나야 처리할 수 있습니다.
  - 정원·테이블 배정·중복 예약 제한은 아직 없습니다.
- **현장 대기 규칙** (`waitlist/repository.ts`)
  - 번호는 매장별로 한국 날짜마다 1번부터 매깁니다. 같은 휴대전화 번호는 한 번만 줄에 설 수 있습니다.
  - 대기 중 → 호출 → 입장, 또는 이탈(호출 후 오지 않음·손님 취소). '앞에 남은 팀'은 줄에 있는(대기 중·호출) 팀 중 먼저 온 팀 수입니다.
- **손님 정보 보호** (`guests/contact.ts`, `kiosk/to-kiosk-guest.ts`)
  - 전화번호는 숫자만 저장하고 휴대전화(010~019)만 받습니다.
  - 키오스크 응답에는 전화번호를 넣지 않고, 이름은 가려서(김*수) 보냅니다. 손님은 전화번호 뒷자리 4자리로만 찾습니다.
- **인기 순위:** 지금 시각 기준 최근 7일(주간)·30일(월간)의 이용 시작 횟수로 매깁니다(이용 중인 기록 포함, 취소한 기록 제외). 횟수가 같으면 이름순이고, 1~10위만 보여줍니다.
  - 이용 기록 시드(`plays/seed.ts`)는 개발 DB를 처음 만들 때 그 시각 기준 60일치를 넣습니다(시간이 지나면 기록도 그만큼 오래된 것이 되므로, 새 시드가 필요하면 `db:reset`). 지난 기록은 모두 반납돼 있고, 매장마다 3~5개가 지금 이용 중입니다.
  - 매장이 보유한(폐기 제외) 게임만 이용됩니다. 게임별 인기도가 날마다 오르내려서 주간과 월간 순위가 달라집니다.
- **대여·반납 규칙** (`plays/repository.ts`, `inventory/repository.ts`)
  - 빌려줄 수 있는 게임: 상태가 이용 가능이고 `보유 수량 − 이용 중` > 0. 폐점 매장에서는 시작할 수 없습니다.
  - 이용 중인 박스가 있으면 재고에서 제외할 수 없고, 수량을 이용 중인 수보다 적게 줄일 수 없습니다.
  - 상태(점검 중·폐기)는 이용 중이어도 바꿀 수 있습니다. 새로 빌려주지 않을 뿐, 지금 쓰는 박스는 반납받습니다.
  - 잘못 입력한 이용 중 기록은 '이용 취소'로 지웁니다. 반납한 기록은 고치거나 지우지 않습니다.
  - 날짜 경계는 한국 시간(`plays/time.ts`)입니다. 지난 기록의 날짜 필터도 한국 날짜 기준입니다.
- **폐점** (`cafes/repository.ts`)
  - 폐점한 매장은 `visibleCafes`에서 빠지므로 대시보드 집계, 재고·이용 기록의 매장 선택, 카탈로그의 보유 현황에 나오지 않습니다. 재고와 이용 기록은 지우지 않습니다.
  - 이용 중인 게임이 있으면 폐점할 수 없습니다. 운영 재개는 언제든 할 수 있습니다.
  - 폐점 매장의 스태프는 재고·이용 기록에서 '매장 없음'을 봅니다. 직원 관리에서 다른 매장으로 옮깁니다.
- **직원 규칙** (`users/repository.ts`)
  - 이메일은 겹칠 수 없습니다(대소문자 무시). 스태프의 소속 매장은 운영 중이어야 하고, 관리자는 소속 매장이 없습니다.
  - 자기 역할은 바꿀 수 없고 자신을 퇴사 처리할 수 없습니다. 재직 중인 관리자가 한 명은 남아야 합니다.
  - 퇴사한 직원의 쿠키로 들어오면 재직 중인 첫 관리자로 봅니다(`findActiveUser`).
- **게임 썸네일:** `BoardGame.thumbnailUrl`은 `packages/domain/scripts/import-avocado-images.mjs`가 avocado 원본 이미지로 만든 로컬 파일입니다. 목록은 `thumbnailUrl ?? imageUrl`을 씁니다. 관리자가 원본 이미지 주소를 바꾸면 썸네일은 지웁니다(예전 이미지이므로).

## 권한

`src/lib/auth/permissions.ts`에 모여 있습니다.

| 규칙 | 함수 |
|---|---|
| 카탈로그 등록·수정은 관리자만 | `canManageCatalog` |
| 재고·이용 기록은 관리자는 모든 매장, 스태프는 소속 매장만 | `canManageInventory`, `canRecordPlays` |
| 매장·직원 관리는 관리자만 | `canManageOrganization` |
| 화면에 보여줄 매장: 운영 중인 매장 중에서, 스태프는 요청과 관계없이 소속 매장, 관리자는 요청한 매장(잘못되면 첫 매장) | `resolveCafe`, `visibleCafes` |
| 페이지 단위 역할 제한 (`/cafes`, `/staff`) | `requireRole` (`guard.ts`, 권한 없으면 `forbidden()` → 403) |

화면에서 버튼을 숨기는 것은 편의일 뿐입니다. **모든 서버 액션은 시작할 때 `getCurrentUser()`로 권한을 다시 확인합니다.** 새 액션을 만들 때도 같은 규칙을 지키세요.

## 데이터 흐름

```
page.tsx / actions.ts            화면·서버 액션: 권한 확인, 입력 검증(zod)
        │
        ▼
lib/<domain>/data.ts             서버 전용(server-only) 진입점. 저장소를 고른다.
        │
        ▼
lib/<domain>/repository.ts       인터페이스 + Drizzle 구현 (규칙·상태 전이도 여기, 단위 테스트 대상)
        │
        ▼
src/db                           Drizzle 스키마·마이그레이션. server.ts의 getDb()가 연결을 하나만 만들어 함께 쓴다
                                 (DATABASE_URL이면 PostgreSQL, 아니면 PGlite. globalThis에 보관해 HMR에도 유지)
```

- **repository:** `Database`(Drizzle)를 받아 동작합니다. 테스트에서는 `createTestDb({...})`(`src/db/testing.ts`)가 테스트마다 새 메모리 PGlite를 만들고 원하는 데이터를 넣어 줍니다. 주지 않은 항목은 시드로 채웁니다.
- **동시성:** 마지막 박스 대여(`plays.start`)와 대기 번호 발급(`waitlist.add`)은 트랜잭션 안에서 해당 줄을 잠그고(`FOR UPDATE`) 확인합니다.
- **시각:** DB는 `timestamptz`로 저장하고, 도메인 타입은 ISO 문자열입니다. 바꾸는 곳은 `src/db/mappers.ts` 한 곳입니다.
- **스키마 변경:** `src/db/schema.ts`를 고치고 `pnpm db:generate`로 마이그레이션 SQL을 만들어 함께 커밋합니다. 서버는 처음 DB를 열 때 적용합니다.
- **시드 데이터:** 카탈로그는 공통 패키지의 `@avocado/domain/catalog`(avocado 변환 결과 `packages/domain/data/catalog.json`)에서 필요한 항목만 골라 씁니다(`games/seed.ts`). 재고는 `inventory/seed.ts`가 매장·게임 조합의 해시로 매번 같게 만듭니다.

### 키오스크 조회 API

가맹점 런처가 매장 보유 게임과 지금 빌릴 수 있는지를 읽습니다.

- `GET /api/kiosk/cafes/{cafeId}/games` → `KioskCafeGames` (`@avocado/domain/kiosk`에 응답 타입이 있습니다)
- `GET /api/kiosk/cafes/{cafeId}/reservations?phone4=1234` → 오늘 아직 끝나지 않은 내 예약
- `POST /api/kiosk/cafes/{cafeId}/reservations/{id}/check-in` `{ phone4 }` → 도착 알림 (뒷자리를 한 번 더 확인)
- `GET /api/kiosk/cafes/{cafeId}/waitlist[?phone4=1234]` → 줄에 있는 팀 수와 내 대기
- `POST /api/kiosk/cafes/{cafeId}/waitlist` `{ name, phone, partySize }` → 대기 등록. 입력 오류 400(`fieldErrors`), 같은 번호 중복 409
- 운영 중인 매장만 응답하고, 없거나 폐점한 매장은 404입니다. 폐기한 게임은 빠집니다.
- 상태: 남은 박스가 있으면 `available`, 모두 이용 중이면 `in-use`, 점검 중이면 `unavailable`
- 썸네일은 백오피스 주소를 붙인 절대 주소입니다(런처가 다른 포트에서 뜨기 때문).
- **토큰:** 백오피스에 `KIOSK_API_TOKEN`을 설정하면 `Authorization: Bearer <토큰>`이 맞는 요청만 받습니다(아니면 401). 런처도 같은 값을 설정합니다. 설정하지 않으면(개발) 모두 받습니다. 지금은 모든 매장이 토큰 하나를 같이 쓰므로, 로그인이 정해지면 매장별 토큰으로 바꿔 토큰으로 매장도 확인해야 합니다.
- 상태를 바꾸는 요청(도착, 대기 등록)은 백오피스 `/reservations` 화면을 갱신합니다.

### 로그인 (Auth.js 4)

- 이메일·비밀번호(Credentials) 로그인, 세션은 JWT 쿠키(12시간). 설정은 `lib/auth/options.ts`, 경로는 `/api/auth/*`, 화면은 `/login`.
- **요청마다 DB 확인:** JWT는 서버에서 바로 끊을 수 없으므로, `getCurrentUser()`가 요청마다 DB에서 직원을 다시 읽어 퇴사 처리된 직원은 바로 로그인 화면(`?error=inactive`)으로 보냅니다. 역할·소속 매장 변경도 바로 반영됩니다.
- 로그인하지 않았으면 `getCurrentUser()`가 `/login`으로 보냅니다. 모든 화면과 서버 액션은 이 함수로 시작하므로 따로 막는 곳이 없습니다.
- 없는 이메일에도 비밀번호 비교를 한 번 해서, 응답 시간으로 계정이 있는지 알 수 없게 했습니다.
- 운영에서는 `NEXTAUTH_URL`·`NEXTAUTH_SECRET`이 필요합니다. 개발 값은 `.env.development`(비밀 아님)에 있습니다.

### 다른 저장소로 바꿀 때

1. 각 `repository.ts`의 인터페이스(`GameRepository`, `InventoryRepository`, `CafeRepository`, `PlayRepository`, `UserRepository`, `ReservationRepository`, `WaitlistRepository`, `StatsRepository`)를 새 저장소로 구현합니다. 실패는 `"in-use"`, `"duplicate-name"` 같은 문자열 코드로 돌려주고, 서버 액션이 문구로 바꿉니다. 순위·분포 집계는 백엔드에서 하는 편이 낫습니다.
2. `data.ts`에서 새 구현을 쓰게 합니다. 화면과 서버 액션은 고칠 필요가 없습니다. PostgreSQL이면 `DATABASE_URL`만 주면 됩니다.
3. 모바일 무한 스크롤은 지금 서버 액션(`fetchCatalogAction`, `fetchInventoryAction`)으로 다음 묶음을 읽습니다. 서버 액션은 순서대로 하나씩 처리되므로, 조회 전용 API(Route Handler 등)로 바꾸는 것도 고려하세요.

## Next.js 16 렌더링 규칙 (`cacheComponents`)

이 버전은 학습 데이터와 다를 수 있으니, 작업 전에 `node_modules/next/dist/docs/`의 해당 문서를 확인하세요(`AGENTS.md` 참고).

- **요청 시점 데이터는 `<Suspense>` 안에서 읽습니다.** 세션(현재 사용자), `searchParams`, DB 조회가 여기에 해당하고, 밖에서 읽으면 빌드가 실패합니다. 그래서 각 페이지는 `XxxPage`(정적 틀 + Suspense)와 `XxxContent`(async, 데이터 읽기)로 나뉩니다.
- **DB 조회와 세션 확인은 `connection()`을 먼저 부릅니다.** 빌드 때 정적 HTML에 고정되지 않게 하고, Auth.js가 안에서 쓰는 난수 때문에 미리 렌더링이 멈추는 것을 막습니다(`data.ts`, `current-user.ts`).
- **레이아웃 최상단에서 사용자를 기다리지 않습니다.** 사이드바 틀은 Suspense 밖에 두고, 사용자에 따라 달라지는 메뉴·계정 영역만 Suspense 슬롯으로 넣습니다. 틀까지 Suspense 안에 두면 모바일에서 하이드레이션 불일치가 납니다([conventions.md](conventions.md#알려진-함정) 참고).
- **`forbidden()`** 은 `experimental.authInterrupts`로 켜 두었습니다. Suspense 안에서 불러도 `src/app/forbidden.tsx`가 보입니다.
- **변경 후 갱신:** 서버 액션이 바꾼 데이터를 보여주는 경로를 `revalidatePath`로 갱신합니다.
  - 재고: `/inventory`, `/games`(보유 현황), `/`(대시보드), `/plays`(빌려줄 수 있는 게임)
  - 이용 기록: `/plays`, `/inventory`(이용 중 수), `/cafes`, `/`(인기 순위)
  - 매장·직원: 사이드바(계정 영역)와 모든 매장 선택에 쓰이므로 `revalidatePath("/", "layout")`
- **현재 시각:** 렌더링 중에 `Date.now()`를 부르면 React lint(`react-hooks/purity`)에 걸립니다. 이용 중 경과 시간처럼 시각이 필요하면 `data.ts`에서 데이터와 함께 돌려줍니다(`listActivePlays`).
  - 화면이 열려 있는 동안 시간이 흘러야 하면 `useMinuteClock`(`src/hooks/use-minute-clock.ts`)을 씁니다. 서버가 준 시각으로 하이드레이션한 뒤 브라우저 시각으로 1분마다 갱신합니다(이용 중 경과 시간, `ElapsedTime`).

## 목록 화면 패턴

카탈로그(`/games`), 재고(`/inventory`), 이용 기록의 지난 기록(`/plays`)은 같은 구조를 씁니다. 매장·직원 관리는 항목이 적어 한 번에 보여줍니다(데스크톱 표, 모바일 카드).

- **URL이 상태의 원본입니다.**
  - 검색 조건은 `q`, `category`, `status`, 재고·이용 기록은 `cafe`, 이용 기록은 `date`(YYYY-MM-DD)도 씁니다. 페이지는 `page`입니다.
  - `ListToolbar`가 빈 값과 '전체'를 빼고 주소를 만듭니다. `page`는 넣지 않아서 조건을 바꾸면 1페이지로 돌아갑니다.
- **데스크톱과 모바일을 둘 다 그리고 CSS로 하나만 보입니다.**
  - `md:` 이상은 표 + `ListPagination`, 그 미만은 `InfiniteList`입니다.
  - JS로 화면 크기를 판단하면 첫 화면이 잠깐 데스크톱으로 보이기 때문입니다.
- **범위를 벗어난 페이지**는 마지막 페이지로 보여줍니다.
- **`InfiniteList`**(`components/list/infinite-list.tsx`)
  - 서버가 그린 첫 묶음에 이어 다음 묶음을 불러옵니다.
  - 수정·등록 뒤 서버 데이터가 갱신되면, 이미 불러온 범위를 한 번에 다시 받아 스크롤 위치를 지킵니다.
  - 조건이 바뀌면 부모가 `key`를 바꿔 처음부터 시작합니다.

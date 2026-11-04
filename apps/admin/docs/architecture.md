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
| `User` | `src/lib/auth/roles.ts` | `admin` 또는 `staff`. 스태프는 `cafeId`로 소속 매장을 가진다. `active: false`는 퇴사. 목 DB `users`에 있고 개발용 계정 전환 목록이기도 하다. |

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
- **인기 순위:** 지금 시각 기준 최근 7일(주간)·30일(월간)의 이용 시작 횟수로 매깁니다(이용 중인 기록 포함, 취소한 기록 제외). 횟수가 같으면 이름순이고, 1~10위만 보여줍니다.
  - 이용 기록 목 데이터(`plays/seed.ts`)는 서버를 켤 때 그 시각 기준 60일치를 만듭니다. 지난 기록은 모두 반납돼 있고, 매장마다 3~5개가 지금 이용 중입니다.
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
lib/<domain>/repository.ts       인터페이스 + 인메모리 구현 (순수 함수, 단위 테스트 대상)
        │
        ▼
lib/mock-db                      cafes · games · inventory · plays · users 배열 (globalThis에 보관해 HMR에도 유지)
```

- **repository:** `MockDb`를 받아 동작하는 순수 구현이라, 테스트에서는 `createMockDb({...})`로 원하는 데이터를 만들어 검증합니다.
- **시드 데이터:** 카탈로그는 공통 패키지의 `@avocado/domain/catalog`(avocado 변환 결과 `packages/domain/data/catalog.json`)에서 필요한 항목만 골라 씁니다(`games/seed.ts`). 재고는 `inventory/seed.ts`가 매장·게임 조합의 해시로 매번 같게 만듭니다.

### 키오스크 조회 API

가맹점 런처가 매장 보유 게임과 지금 빌릴 수 있는지를 읽습니다.

- `GET /api/kiosk/cafes/{cafeId}/games` → `KioskCafeGames` (`@avocado/domain/kiosk`에 응답 타입이 있습니다)
- 운영 중인 매장만 응답하고, 없거나 폐점한 매장은 404입니다. 폐기한 게임은 빠집니다.
- 상태: 남은 박스가 있으면 `available`, 모두 이용 중이면 `in-use`, 점검 중이면 `unavailable`
- 썸네일은 백오피스 주소를 붙인 절대 주소입니다(런처가 다른 포트에서 뜨기 때문).
- **아직 인증이 없습니다.** 읽기 전용 정보만 주며, 인증이 정해지면 매장별 키오스크 토큰을 확인해야 합니다.

### 백엔드로 바꿀 때

1. 각 `repository.ts`의 인터페이스(`GameRepository`, `InventoryRepository`, `CafeRepository`, `PlayRepository`, `UserRepository`)를 API 호출로 구현합니다. 실패는 `"in-use"`, `"duplicate-name"` 같은 문자열 코드로 돌려주고, 서버 액션이 문구로 바꿉니다. 순위·분포 집계는 백엔드에서 하는 편이 낫습니다.
2. `data.ts`에서 인메모리 구현 대신 새 구현을 쓰게 합니다. 화면과 서버 액션은 고칠 필요가 없습니다.
3. `lib/auth/current-user.ts`의 `getCurrentUser()`를 실제 세션 조회로 바꾸고, `mock-auth-actions.ts`와 계정 메뉴의 "계정 전환" 그룹을 지웁니다. `mock-users.ts`의 `SEED_USERS`는 직원 시드로 옮깁니다.
4. 모바일 무한 스크롤은 지금 서버 액션(`fetchCatalogAction`, `fetchInventoryAction`)으로 다음 묶음을 읽습니다. 서버 액션은 순서대로 하나씩 처리되므로, 조회 전용 API(Route Handler 등)로 바꾸는 것도 고려하세요.

## Next.js 16 렌더링 규칙 (`cacheComponents`)

이 버전은 학습 데이터와 다를 수 있으니, 작업 전에 `node_modules/next/dist/docs/`의 해당 문서를 확인하세요(`AGENTS.md` 참고).

- **요청 시점 데이터는 `<Suspense>` 안에서 읽습니다.** `cookies()`(현재 사용자), `searchParams`, 목 데이터 조회가 여기에 해당하고, 밖에서 읽으면 빌드가 실패합니다. 그래서 각 페이지는 `XxxPage`(정적 틀 + Suspense)와 `XxxContent`(async, 데이터 읽기)로 나뉩니다.
- **목 데이터 조회는 `connection()`을 먼저 부릅니다.** 메모리에서 바로 읽으면 빌드 때 정적 HTML에 고정되기 때문입니다(`data.ts` 참고).
- **레이아웃 최상단에서 사용자를 기다리지 않습니다.** 사이드바 틀은 Suspense 밖에 두고, 사용자에 따라 달라지는 메뉴·계정 영역만 Suspense 슬롯으로 넣습니다. 틀까지 Suspense 안에 두면 모바일에서 하이드레이션 불일치가 납니다([conventions.md](conventions.md#알려진-함정) 참고).
- **`forbidden()`** 은 `experimental.authInterrupts`로 켜 두었습니다. Suspense 안에서 불러도 `src/app/forbidden.tsx`가 보입니다.
- **변경 후 갱신:** 서버 액션이 바꾼 데이터를 보여주는 경로를 `revalidatePath`로 갱신합니다.
  - 재고: `/inventory`, `/games`(보유 현황), `/`(대시보드), `/plays`(빌려줄 수 있는 게임)
  - 이용 기록: `/plays`, `/inventory`(이용 중 수), `/cafes`, `/`(인기 순위)
  - 매장·직원: 사이드바(계정 영역·계정 전환)와 모든 매장 선택에 쓰이므로 `revalidatePath("/", "layout")`
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

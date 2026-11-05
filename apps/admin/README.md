# 백오피스 (`apps/admin`)

보드게임 카페 프랜차이즈 직원이 쓰는 운영 백오피스입니다. 본사 공통 게임 카탈로그와 매장별 재고를 관리하고, 대시보드에서 매장 현황을 한눈에 봅니다.

> 데이터는 PostgreSQL(Drizzle ORM)에 저장합니다. 개발할 때는 설치 없이 Node 안에서 도는 PostgreSQL(PGlite, `.data/pglite`)을 쓰고, `DATABASE_URL`을 주면 실제 PostgreSQL에 붙습니다. 로그인은 Auth.js 4(이메일·비밀번호)입니다.

## 주요 기능

| 메뉴 | 경로 | 관리자 | 스태프 | 내용 |
|---|---|---|---|---|
| 대시보드 | `/` | 전체 매장 | 소속 매장 | 지금 상태: 요약 수치(지금 이용 중·오늘 이용 포함), 주간·월간 인기 게임 1~10위, 유형별·인원수별·플레이 시간별 보유 차트, 최근 점검 중 게임, 매장별 재고 상태·재고·이용 현황(관리자) |
| 통계 | `/stats` | 전체 또는 매장 하나 | 소속 매장 | 기간 분석(최근 7·14·28일 vs 그 전 같은 기간): 지난 기간 대비 증감과 추이선이 붙은 요약 수치, 일별 이용 추이, 요일·시간대 히트맵, 많이·거의 이용되지 않은 게임(박스당 이용), 매장별 비교(관리자) |
| 보드게임 | `/games` | 조회·등록·수정 | 조회 | 모든 매장이 함께 쓰는 게임 카탈로그와 매장 보유 현황 |
| 재고 관리 | `/inventory` | 모든 매장 | 소속 매장 | 매장별 보유 게임 추가·제외, 수량·상태(이용 가능/점검 중/폐기) 변경, 이용 중인 박스 수 |
| 예약·대기 | `/reservations` | 모든 매장 | 소속 매장 | 현장 대기(키오스크 등록분 포함) 호출·입장·이탈, 직접 대기 등록. 날짜별 예약 등록·수정·확정·입장·노쇼·취소, 손님의 키오스크 도착 알림 표시 |
| 이용 기록 | `/plays` | 모든 매장 | 소속 매장 | 게임 대여(이용 시작)·반납, 지금 이용 중 목록(경과 시간 1분마다 갱신), 지난 기록 검색(게임 이름·날짜) |
| 매장 관리 | `/cafes` | ✅ | ❌ | 매장 등록·수정, 폐점 처리·운영 재개, 키오스크 기기 토큰 발급·폐기 |
| 직원 관리 | `/staff` | ✅ | ❌ | 직원 등록·수정(역할·소속 매장), 퇴사·복직 처리 |

- **목록 화면:** 검색·카테고리·상태 필터가 URL에 남아 공유하거나 새로고침해도 유지됩니다.
  - 데스크톱(768px 이상): 표 + 페이지 번호(20개씩)
  - 모바일: 카드 목록 + 무한 스크롤
- **권한:** 화면에서 버튼을 숨기는 것과 별도로, 모든 서버 액션이 서버에서 권한을 다시 확인합니다. 스태프가 주소에 다른 매장을 넣어도 소속 매장만 보입니다.
- **게임 데이터:** [avocado](../avocado-master) 프로젝트의 보드게임 110개와 유형 분류(전략·테마·가족·파티·추상 전략·워게임·컬렉터블 게임)를 씁니다.
- **인기 순위:** 최근 7일(주간)·30일(월간)의 이용 시작 횟수로 매깁니다. 이용 기록 화면에서 입력한 기록이 바로 반영되고, 서버를 켤 때 매장별 60일치 목 기록이 함께 만들어집니다.
- **대여·반납:** 이용 가능 상태이고 남은 박스가 있는 게임만 빌려줄 수 있습니다. 이용 중인 박스가 있으면 재고에서 제외하거나 그보다 적게 줄일 수 없습니다.
- **폐점:** 폐점한 매장은 대시보드 집계와 재고·이용 기록의 매장 선택에서 빠지고, 재고·기록은 남습니다. 이용 중인 게임이 있으면 폐점할 수 없습니다.
- **게임 썸네일:** avocado 데이터의 원본 이미지로 미리 만든 128px webp(개당 8KB 이하, 원본은 `packages/domain/assets/games/`)를 씁니다. 불러오는 중이거나 이미지가 없으면 avocado의 목록 자리표시 이미지가 보입니다.

## 기술 스택

- [Next.js](https://nextjs.org) 16 (App Router, `cacheComponents`), React 19, TypeScript
- [shadcn/ui](https://ui.shadcn.com) (`base-nova` 스타일, [Base UI](https://base-ui.com) 기반), Tailwind CSS 4, [lucide](https://lucide.dev) 아이콘
- [Recharts](https://recharts.org) (shadcn chart 컴포넌트로 사용), zod (입력 검증), sonner (알림)
- PostgreSQL + [Drizzle ORM](https://orm.drizzle.team), 개발·테스트는 [PGlite](https://pglite.dev)
- [Auth.js](https://next-auth.js.org) 4 (`next-auth`, 이메일·비밀번호, JWT 세션), bcryptjs
- Vitest (단위 테스트), Playwright (E2E)

## 시작하기

설치는 저장소 루트에서 합니다([루트 README](../../README.md) 참고).

```bash
pnpm dev:admin               # 루트에서. http://localhost:3000
```

처음 실행하면 개발 DB(`.data/pglite`)를 만들고 가상 매장·게임·직원·기록을 시드로 넣습니다. 데이터는 서버를 다시 켜도 남습니다. 처음 상태로 돌리려면 `pnpm --filter @avocado/admin db:reset` 뒤 다시 실행하세요.

### 개발용 계정

`http://localhost:3000/login`에서 로그인합니다. 비밀번호는 모두 **`avocado1234`** 입니다(개발 서버의 로그인 화면 아래에도 나옵니다).

| 이메일 | 이름 | 역할 | 소속 매장 |
|---|---|---|---|
| admin@example.com | 김관리 | 관리자 | - (모든 매장) |
| gangnam@example.com | 이스태프 | 스태프 | 강남점 |
| hongdae@example.com | 박스태프 | 스태프 | 홍대점 |
| pangyo@example.com | 최스태프 | 스태프 | 판교점 |

left@example.com(정퇴사)은 퇴사 처리된 직원이라 로그인할 수 없습니다.

- 직원 관리에서 새 직원을 등록할 때 초기 비밀번호를 정하고, 직원은 처음 로그인할 때 본인 비밀번호로 바꿉니다. 비밀번호를 잊은 직원은 관리자가 임시 비밀번호로 재설정합니다.
- 본인 비밀번호는 계정 메뉴 > 비밀번호 변경에서 바꿉니다.
- 같은 이메일로 5번 연속 틀리면 15분 동안 로그인이 잠깁니다.

### 환경 변수

| 변수 | 개발 | 운영 |
|---|---|---|
| `DATABASE_URL` | 없으면 PGlite | PostgreSQL 주소 (필수) |
| `PGLITE_DATA_DIR` | 기본 `.data/pglite`, `memory://`면 메모리 (E2E) | - |
| `NEXTAUTH_URL`, `NEXTAUTH_SECRET` | `.env.development`에 개발 값이 있음 | 서비스 주소와 서명 키 (필수) |
| `SEED_DEMO` | - | `1`이면 빈 DB에 개발용 시드를 넣음 |

예시는 `.env.example`에 있습니다. 개발 서버(`next dev`)는 처음 DB를 열 때 마이그레이션을 적용하고, 비어 있으면 시드를 넣습니다.

## 스크립트

이 폴더에서 `pnpm <명령>`으로 실행하거나, 루트에서 `pnpm --filter @avocado/admin <명령>`으로 실행합니다.

| 명령 | 설명 |
|---|---|
| `pnpm dev` | 개발 서버 (3000번 포트). 먼저 카탈로그 이미지를 `public/images`로 복사함 |
| `pnpm build` / `pnpm start` | 프로덕션 빌드 / 실행 |
| `pnpm typecheck` | 라우트 타입 생성 후 타입 검사 |
| `pnpm lint` | ESLint |
| `pnpm test` | 단위 테스트 (Vitest) |
| `pnpm e2e` | E2E 테스트 (Playwright). 백오피스(3100, 메모리 DB)와 키오스크 테스트용 런처(3101)를 프로덕션 빌드로 직접 띄우고, 실제 로그인 화면으로 로그인 |
| `pnpm db:generate` | `src/db/schema.ts`를 바꾼 뒤 마이그레이션 SQL 만들기 (`src/db/migrations`, git에 넣음) |
| `pnpm create-admin --email <이메일> --name <이름>` | 운영 DB에 첫 관리자 만들기 (관리자가 없을 때만). 임시 비밀번호를 한 번 보여 줌 (`docs/deployment.md`) |
| `pnpm db:reset` | 개발 DB(`.data/pglite`) 지우기. 다음 실행 때 시드로 다시 만듦 |

게임 카탈로그와 썸네일은 공통 패키지 `packages/domain`에 있습니다. avocado 데이터에서 다시 만드는 방법은 루트 README를 보세요.

## 폴더 구조

```
src/
├─ app/
│  ├─ (backoffice)/          사이드바가 있는 화면들
│  │  ├─ page.tsx            대시보드
│  │  ├─ stats/              통계 화면
│  │  ├─ games/              카탈로그 화면 + 서버 액션
│  │  ├─ inventory/          재고 화면 + 서버 액션
│  │  ├─ plays/              이용 기록(대여·반납) 화면 + 서버 액션
│  │  ├─ reservations/       예약·현장 대기 화면 + 서버 액션
│  │  ├─ cafes/ staff/       매장·직원 관리 화면 + 서버 액션 (관리자)
│  ├─ login/ password/       로그인, 비밀번호 변경 화면
│  ├─ api/kiosk/             가맹점 런처(키오스크)용 API (게임 조회, 예약 확인·도착, 대기 등록·조회)
│  └─ forbidden.tsx          403 화면
├─ components/
│  ├─ list/                  목록 공통: 툴바, 페이지네이션, 무한 스크롤, 빈 상태
│  ├─ form/                  대화상자 폼 공통 훅
│  ├─ games/ inventory/ plays/ reservations/ cafes/ staff/ dashboard/ stats/ layout/
├─ lib/
│  ├─ games/ inventory/ cafes/ plays/ users/ reservations/ waitlist/ stats/   도메인별 types · schema · repository · data(서버 전용) · seed
│  ├─ guests/                손님 연락처: 전화번호 정리·검증, 키오스크용 이름 가리기
│  ├─ kiosk/                 재고 → 키오스크 응답 변환
│  ├─ auth/                  현재 사용자, 역할, 권한
│  ├─ list.ts                페이지 계산·URL 생성
│  └─ form.ts                폼 결과 타입·변환
src/db/                      DB: 스키마(schema.ts)·마이그레이션·연결(server.ts)·시드·테스트용 메모리 DB(testing.ts)
scripts/create-admin.ts      첫 관리자 만들기 (규칙은 src/lib/users/first-admin.ts)
e2e/                         Playwright 테스트 (auth.setup.ts가 먼저 실제로 로그인)
public/images/games/         카탈로그 썸네일 복사본 (git 제외, dev·build 전에 자동 복사)
docs/architecture.md         백오피스 설계 문서
```

## 문서

- [docs/architecture.md](docs/architecture.md): 도메인 모델, 권한, 데이터 흐름, Next.js 16 렌더링 규칙, 백엔드 교체 방법
- [../../docs/conventions.md](../../docs/conventions.md): 모든 앱 공통 UI·폼·테스트 작성 규칙과 지금까지 겪은 함정

shadcn/ui 컴포넌트는 `packages/ui`에 있고 `@avocado/ui/components/<이름>`으로 가져옵니다.

## 아직 하지 않은 것

- 관리자가 새로 등록한 게임의 썸네일: 입력한 원본 이미지 주소를 그대로 불러옵니다(지연 로딩만 적용)

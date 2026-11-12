# 프랜차이즈 사이트 (`apps/web`)

avocado(Vite + React)를 Next.js + TypeScript로 옮긴 홍보 사이트입니다. 게임 데이터는 공통 카탈로그(`@avocado/domain/catalog`)를 빌드할 때 읽어 정적 페이지로 만듭니다.

| 화면 | 경로 | avocado에서 |
|---|---|---|
| 홈 | `/` | 메인: 왼쪽에 고정된 큰 사진, 오른쪽에 유형별 소개와 순위 상위 10개, 유형 사진 |
| 유형별 목록 | `/games/[유형]` | 목록: 랭킹·최신·평점·난이도 순 정렬 (`?sort=`) |
| 게임 상세 | `/game/[BGG ID]` | 상세: 순위·평점·난이도, 게임 정보. 구매처 목록 대신 매장 안내 |
| 브랜드 소개 | `/about` | 새로 추가: 브랜드 소개, 매장 둘러보기, 매장 안내(`#stores`), 가맹 문의(`#franchise`). 매장과 연락처는 가상 정보 |

- avocado의 로그인·회원가입·게이트웨이 화면은 홍보 사이트에 필요 없어 옮기지 않았습니다.
- 브랜드 이름·문구는 `src/shared/config/site.ts` 한 곳에 있습니다.
- 사진은 avocado 원본을 webp로 줄여 `public/images`에 넣었습니다(루트에서 `pnpm import:avocado-media`). 약 11MB → 1.2MB
- 게임 표지는 BoardGameGeek 원본 주소를 Next.js 이미지 최적화로 줄여 보냅니다(`next.config.ts`의 `images.remotePatterns`).
- avocado의 색(어두운 바탕, 흰 패널, 주황 강조색 `#ff5100`)을 `src/app/globals.css`에서 공통 테마 위에 덮어씁니다.
- 레이아웃도 avocado를 따릅니다. 데스크톱에서는 왼쪽 패널이 화면 높이로 고정되고 오른쪽만 스크롤됩니다(홈 6칸 중 2칸, 목록·상세 8칸 중 2칸). 모바일 목록·상세는 `grid` 대신 `flex`입니다. 격자 칸 안의 `sticky`는 그 칸을 벗어나지 못해 머리글이 고정되지 않기 때문입니다.
- 공간 연출은 더 현대 서울 사이트를 참고했습니다. 홈 유형 사진은 들어올 때 안쪽에서 화면 폭 가득 펼쳐지고 사진이 천천히 물러나며(`.space-reveal`), 소개 화면의 매장 둘러보기는 화면을 고정해 두고 세로 스크롤만큼 옆으로 넘어갑니다(`views/about/ui/store-tour.tsx`). 라이브러리 없이 CSS 스크롤 타임라인(`animation-timeline: view()`)으로 만들고 `src/app/globals.css`에 모았습니다. 지원하지 않는 브라우저와 동작 줄이기에서는 사진을 차례로 쌓은 정지 화면입니다.
- 메뉴는 전체 화면 Sheet이고, 표지는 도착할 때까지 스켈레톤을 보여 줍니다(`entities/game/ui/game-image.tsx`).
- 유형마다 키보드용 카드 건너뛰기 링크가 있습니다. 평소에는 숨어 있다가 초점을 받으면 나타납니다.
- 검색·공유 설정은 `src/app/robots.ts`, `sitemap.ts`, `public/images/og.jpg`와 `src/shared/lib/page-metadata.ts`에 있습니다. 사이트 주소는 `SITE_URL`, 없으면 Vercel의 운영 주소를 읽습니다(`src/shared/config/site-url.ts`).
- 글꼴은 제목 주아(Jua), 본문 고운돋움(Gowun Dodum), 영문·숫자 Lato, 숫자 옆 한글 해바라기(Sunflower)입니다. `next/font/google`이 빌드할 때 받아 함께 배포하므로 보안 헤더(`font-src 'self'`)를 바꾸지 않아도 됩니다.

```bash
pnpm dev:web   # 루트에서. http://localhost:3002
```

코드는 Feature-Sliced Design을 따릅니다([docs/conventions.md](../../docs/conventions.md#프론트엔드-구조-feature-sliced-design)): `views`(화면), `widgets`(머리글·메뉴·바닥글·캐러셀·유형 소개), `entities/game`, `shared/config`, `shared/lib`.

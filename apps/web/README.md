# 프랜차이즈 사이트 (`apps/web`)

avocado(Vite + React)를 Next.js + TypeScript로 옮긴 홍보 사이트입니다. 게임 데이터는 공통 카탈로그(`@avocado/domain/catalog`)를 빌드할 때 읽어 정적 페이지로 만듭니다.

| 화면 | 경로 | avocado에서 |
|---|---|---|
| 홈 | `/` | 메인: 큰 사진 넘기기, 유형별 소개와 순위 상위 10개, 유형 사진 |
| 유형별 목록 | `/games/[유형]` | 목록: 랭킹·최신·평점·난이도 순 정렬 (`?sort=`) |
| 게임 상세 | `/game/[BGG ID]` | 상세: 순위·평점·난이도, 게임 정보. 구매처 목록 대신 매장 안내 |

- avocado의 로그인·회원가입·게이트웨이 화면은 홍보 사이트에 필요 없어 옮기지 않았습니다.
- 브랜드 이름·문구는 `src/lib/site.ts` 한 곳에 있습니다.
- 사진은 avocado 원본을 webp로 줄여 `public/images`에 넣었습니다(루트에서 `pnpm import:avocado-media`). 약 11MB → 1.2MB
- 게임 표지는 BoardGameGeek 원본 주소를 Next.js 이미지 최적화로 줄여 보냅니다(`next.config.ts`의 `images.remotePatterns`).
- avocado의 색(어두운 바탕, 흰 패널, 주황 강조색 `#ff5100`)을 `src/app/globals.css`에서 공통 테마 위에 덮어씁니다.

```bash
pnpm dev:web   # 루트에서. http://localhost:3002
```

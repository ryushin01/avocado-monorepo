## 앱 메모

저장소 맨 위 [AGENTS.md](../../AGENTS.md)와 [docs/conventions.md](../../docs/conventions.md)를 따릅니다. 스크립트는 저장소 맨 위에서 실행합니다(`pnpm --filter @avocado/launcher <script>`).

아래 `nextjs-agent-rules` 블록은 `next dev`가 자동으로 써 넣는 영어 원문이라 고치지 않습니다(바꾸면 다시 생깁니다).

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

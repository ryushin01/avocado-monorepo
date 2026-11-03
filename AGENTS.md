<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project notes

Board game cafe franchise monorepo (Korean UI), pnpm workspaces + Turborepo. Use pnpm only (no npm/yarn); the version is pinned in `packageManager`. Run commands from the repo root; target one project with `pnpm --filter <name>`, and add a dependency to the app/package that imports it (pnpm is strict, internal packages use `workspace:*`).

- `apps/admin`: staff/admin back office (port 3000). Read its `README.md` and `docs/architecture.md` before changing it.
- `apps/launcher`: customer kiosk (port 3001). Reads the backoffice kiosk API; contract types in `@avocado/domain/kiosk`.
- `apps/web`: franchise promo site ported from avocado (port 3002). Static pages from `@avocado/domain/catalog`.
- `packages/ui`: shadcn/ui components + theme (`@avocado/ui/components/<name>`). Add components there with the shadcn CLI.
- `packages/domain`: catalog data/thumbnails generated from avocado, shared types. `packages/config`: tsconfig/ESLint.

Before changing code, read `README.md` (layout, scripts) and `docs/conventions.md` (UI rules: shadcn/ui only, Base UI `render` prop, form pattern, test rules, known pitfalls). Each app folder may have its own `AGENTS.md`.

Done means all of these pass from the root: `pnpm typecheck && pnpm lint && pnpm test && pnpm e2e && pnpm build`.

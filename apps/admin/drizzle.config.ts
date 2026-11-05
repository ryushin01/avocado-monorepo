import { defineConfig } from "drizzle-kit";

// 마이그레이션 SQL은 스키마(src/db/schema.ts)에서 만들고 git에 넣는다: pnpm db:generate
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
});

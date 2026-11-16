import { sql, type AnyColumn } from "drizzle-orm";

/**
 * 편집 폼의 낙관적 잠금(db/schema.ts의 version). 행을 바꿀 때 SET에 넣어 1 올린다.
 * 저장은 폼을 연 시점의 버전과 같을 때만(WHERE version = 그 값) 하므로, 그사이 다른 직원이 바꿨으면 0행이 바뀐다.
 */
export const nextVersion = (column: AnyColumn) => sql`${column} + 1`;

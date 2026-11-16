import { sql } from "drizzle-orm";

/**
 * 편집 폼의 낙관적 잠금(db/schema.ts의 version). 행을 바꿀 때 SET에 넣어 새 버전을 받는다.
 * 모든 표가 같은 시퀀스(row_version)를 쓰므로 한 번 쓴 값은 다시 나오지 않는다.
 * 저장은 폼을 연 시점의 버전과 같을 때만(WHERE version = 그 값) 하므로, 그사이 다른 직원이 바꿨으면 0행이 바뀐다.
 */
export const nextVersion = () => sql`nextval('row_version')`;

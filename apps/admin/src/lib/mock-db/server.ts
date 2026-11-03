import "server-only";

import { createMockDb, type MockDb } from "./index";

// 개발 서버 HMR로 모듈이 다시 로드돼도 목 데이터가 유지되도록 globalThis에 보관한다.
const globalForDb = globalThis as { mockDb?: MockDb };

export function getMockDb() {
  return (globalForDb.mockDb ??= createMockDb());
}

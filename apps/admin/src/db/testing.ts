import { openPglite } from "./index";
import { insertSeedData } from "./seed";
import { createSeedData, type SeedData } from "./seed-data";

/**
 * 테스트마다 새로 만드는 메모리 DB. 주지 않은 항목은 시드로 채운다(createSeedData와 같다).
 * passwordHash를 주면 직원 비밀번호도 넣는다.
 */
export async function createTestDb(init: Partial<SeedData> = {}, now = new Date(), passwordHash?: string) {
  const db = await openPglite("memory://");
  await insertSeedData(db, createSeedData(init, now), passwordHash);
  return db;
}

/**
 * 실행한 SQL을 차례로 모으는 테스트 DB(개발용 시드). 요청 하나가 DB에 몇 번 다녀오는지 검사할 때 쓴다.
 * 마이그레이션·시드 질의는 빼고 돌려준다.
 */
export async function createQueryCountingTestDb() {
  const queries: string[] = [];
  const db = await openPglite("memory://", { logQuery: (query) => queries.push(query) });
  await insertSeedData(db, createSeedData({}, new Date()));
  queries.length = 0;
  return { db, queries };
}

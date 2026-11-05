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

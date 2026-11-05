import { count } from "drizzle-orm";

import type { Database } from "./index";
import {
  fromCafe,
  fromGame,
  fromInventoryItem,
  fromPlay,
  fromReservation,
  fromWaitlistEntry,
} from "./mappers";
import { seedKioskDevice } from "@/server/kiosk/devices";

import * as schema from "./schema";
import type { SeedData } from "./seed-data";

const CHUNK = 1000;

async function insertAll<T>(rows: T[], insert: (chunk: T[]) => Promise<unknown>) {
  for (let i = 0; i < rows.length; i += CHUNK) await insert(rows.slice(i, i + CHUNK));
}

/**
 * 초기 데이터를 넣는다. passwordHash를 주면 시드 직원 모두 그 비밀번호로 로그인할 수 있다.
 * 외래 키 순서대로(매장·게임 → 직원·재고 → 기록) 넣는다.
 */
export async function insertSeedData(db: Database, data: SeedData, passwordHash?: string) {
  await db.transaction(async (tx) => {
    await insertAll(data.cafes, (c) => tx.insert(schema.cafes).values(c.map(fromCafe)));
    await insertAll(data.games, (c) => tx.insert(schema.games).values(c.map(fromGame)));
    await insertAll(data.users, (c) =>
      tx.insert(schema.users).values(
        c.map((u) => ({ ...u, cafeId: u.cafeId ?? null, passwordHash: passwordHash ?? null })),
      ),
    );
    await insertAll(data.inventory, (c) => tx.insert(schema.inventoryItems).values(c.map(fromInventoryItem)));
    await insertAll(data.plays, (c) => tx.insert(schema.playSessions).values(c.map(fromPlay)));
    await insertAll(data.reservations, (c) => tx.insert(schema.reservations).values(c.map(fromReservation)));
    await insertAll(data.waitlist, (c) =>
      tx.insert(schema.waitlistEntries).values(c.map(fromWaitlistEntry)),
    );
    // 개발용 키오스크 기기 (토큰 kio_dev_<매장 id>)
    const openCafes = data.cafes.filter((c) => c.status === "open");
    if (openCafes.length > 0) {
      await tx.insert(schema.kioskDevices).values(openCafes.map((c) => seedKioskDevice(c.id, new Date())));
    }
  });
}

export async function isEmpty(db: Database) {
  const [{ value }] = await db.select({ value: count() }).from(schema.cafes);
  return value === 0;
}

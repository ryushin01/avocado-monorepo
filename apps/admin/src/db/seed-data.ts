import type { New } from "@/db/mappers";
import { SEED_USERS } from "@/server/auth/mock-users";
import type { User } from "@/entities/user";
import { SEED_CAFES } from "@/server/cafes/seed";
import { createSeedTables } from "@/server/cafes/seed-tables";
import type { Cafe, CafeTable } from "@/entities/cafe";
import { createSeedGames } from "@/server/games/seed";
import type { BoardGame } from "@/entities/game";
import { createSeedInventory } from "@/server/inventory/seed";
import type { InventoryItem } from "@/entities/inventory";
import { createSeedPlays } from "@/server/plays/seed";
import type { PlaySession } from "@/entities/play";
import { createSeedReservations, createSeedWaitlist } from "@/server/reservations/seed";
import type { Reservation } from "@/entities/reservation";
import type { WaitlistEntry } from "@/entities/waitlist";
import { createSeedAudit, type SeedAuditLog } from "@/server/audit/seed";

export type SeedData = {
  cafes: New<Cafe>[];
  games: New<BoardGame>[];
  inventory: New<InventoryItem>[];
  plays: PlaySession[];
  users: New<User>[];
  reservations: New<Reservation>[];
  waitlist: WaitlistEntry[];
  tables: CafeTable[];
  /** 변경 이력 화면이 처음부터 비지 않게 넣는 지난 작업 몇 건 */
  audit: SeedAuditLog[];
};

/**
 * 개발·테스트용 초기 데이터. 주지 않은 항목은 시드로 채운다(재고는 매장·게임으로, 이용 기록은 재고로 만든다).
 * 이용 기록·예약·대기는 now 기준이라 같은 now면 매번 같은 결과다.
 */
export function createSeedData(init: Partial<SeedData> = {}, now = new Date()): SeedData {
  const cafes = init.cafes ?? SEED_CAFES.map((c) => ({ ...c }));
  const games = init.games ?? createSeedGames();
  const inventory = init.inventory ?? createSeedInventory(cafes, games);
  const tables = init.tables ?? createSeedTables(cafes);
  const users = init.users ?? SEED_USERS.map((u) => ({ ...u }));
  return {
    cafes,
    games,
    inventory,
    plays: init.plays ?? createSeedPlays(cafes, games, inventory, now),
    users,
    reservations: init.reservations ?? createSeedReservations(cafes, now, tables),
    waitlist: init.waitlist ?? createSeedWaitlist(cafes, now),
    tables,
    audit: init.audit ?? createSeedAudit(users, cafes, now),
  };
}

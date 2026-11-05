import { SEED_USERS } from "@/server/auth/mock-users";
import type { User } from "@/entities/user";
import { SEED_CAFES } from "@/server/cafes/seed";
import type { Cafe } from "@/entities/cafe";
import { createSeedGames } from "@/server/games/seed";
import type { BoardGame } from "@/entities/game";
import { createSeedInventory } from "@/server/inventory/seed";
import type { InventoryItem } from "@/entities/inventory";
import { createSeedPlays } from "@/server/plays/seed";
import type { PlaySession } from "@/entities/play";
import { createSeedReservations, createSeedWaitlist } from "@/server/reservations/seed";
import type { Reservation } from "@/entities/reservation";
import type { WaitlistEntry } from "@/entities/waitlist";

export type SeedData = {
  cafes: Cafe[];
  games: BoardGame[];
  inventory: InventoryItem[];
  plays: PlaySession[];
  users: User[];
  reservations: Reservation[];
  waitlist: WaitlistEntry[];
};

/**
 * 개발·테스트용 초기 데이터. 주지 않은 항목은 시드로 채운다(재고는 매장·게임으로, 이용 기록은 재고로 만든다).
 * 이용 기록·예약·대기는 now 기준이라 같은 now면 매번 같은 결과다.
 */
export function createSeedData(init: Partial<SeedData> = {}, now = new Date()): SeedData {
  const cafes = init.cafes ?? SEED_CAFES.map((c) => ({ ...c }));
  const games = init.games ?? createSeedGames();
  const inventory = init.inventory ?? createSeedInventory(cafes, games);
  return {
    cafes,
    games,
    inventory,
    plays: init.plays ?? createSeedPlays(cafes, games, inventory, now),
    users: init.users ?? SEED_USERS.map((u) => ({ ...u })),
    reservations: init.reservations ?? createSeedReservations(cafes, now),
    waitlist: init.waitlist ?? createSeedWaitlist(cafes, now),
  };
}

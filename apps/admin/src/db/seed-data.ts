import { SEED_USERS } from "@/lib/auth/mock-users";
import type { User } from "@/lib/auth/roles";
import { SEED_CAFES } from "@/lib/cafes/seed";
import type { Cafe } from "@/lib/cafes/types";
import { createSeedGames } from "@/lib/games/seed";
import type { BoardGame } from "@/lib/games/types";
import { createSeedInventory } from "@/lib/inventory/seed";
import type { InventoryItem } from "@/lib/inventory/types";
import { createSeedPlays } from "@/lib/plays/seed";
import type { PlaySession } from "@/lib/plays/types";
import { createSeedReservations, createSeedWaitlist } from "@/lib/reservations/seed";
import type { Reservation } from "@/lib/reservations/types";
import type { WaitlistEntry } from "@/lib/waitlist/types";

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

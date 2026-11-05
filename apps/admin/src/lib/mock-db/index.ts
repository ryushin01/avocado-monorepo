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

/**
 * 백엔드가 정해지기 전까지 쓰는 인메모리 저장소.
 * 각 repository는 이 객체만 바라보므로, 실제 API로 바꿀 때 repository 구현만 교체하면 된다.
 */
export type MockDb = {
  cafes: Cafe[];
  games: BoardGame[];
  inventory: InventoryItem[];
  /** 이용(대여·반납) 기록 */
  plays: PlaySession[];
  /** 직원 (개발용 계정 전환 목록이기도 하다) */
  users: User[];
  /** 예약 */
  reservations: Reservation[];
  /** 현장 대기 */
  waitlist: WaitlistEntry[];
  nextGameId: number;
  nextCafeId: number;
  nextUserId: number;
  nextPlayId: number;
  nextReservationId: number;
  nextWaitlistId: number;
};

type Collections = "cafes" | "games" | "inventory" | "plays" | "users" | "reservations" | "waitlist";

export function createMockDb(
  init: Partial<Pick<MockDb, Collections>> = {},
  now = new Date(),
): MockDb {
  const cafes = init.cafes ?? SEED_CAFES.map((c) => ({ ...c }));
  const games = init.games ?? createSeedGames();
  const inventory = init.inventory ?? createSeedInventory(cafes, games);
  const plays = init.plays ?? createSeedPlays(cafes, games, inventory, now);
  const users = init.users ?? SEED_USERS.map((u) => ({ ...u }));
  const reservations = init.reservations ?? createSeedReservations(cafes, now);
  const waitlist = init.waitlist ?? createSeedWaitlist(cafes, now);
  return {
    cafes,
    games,
    inventory,
    plays,
    users,
    reservations,
    waitlist,
    nextGameId: games.length + 1,
    nextCafeId: cafes.length + 1,
    nextUserId: users.length + 1,
    nextPlayId: plays.length + 1,
    nextReservationId: reservations.length + 1,
    nextWaitlistId: waitlist.length + 1,
  };
}

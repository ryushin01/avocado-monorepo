import type { User } from "@/lib/auth/roles";
import type { Cafe } from "@/lib/cafes/types";
import type { BoardGame } from "@/lib/games/types";
import type { InventoryItem } from "@/lib/inventory/types";
import type { PlaySession } from "@/lib/plays/types";
import type { Reservation } from "@/lib/reservations/types";
import type { WaitlistEntry } from "@/lib/waitlist/types";

import type { schema } from "./index";

// DB 행 ↔ 도메인 타입. 도메인은 시각을 ISO 문자열, 빈 값을 undefined로 다룬다.

type Row<T extends { $inferSelect: unknown }> = T["$inferSelect"];
type Insert<T extends { $inferInsert: unknown }> = T["$inferInsert"];

const iso = (d: Date | null) => (d ? d.toISOString() : undefined);
const date = (s: string | undefined) => (s ? new Date(s) : null);
const opt = <T,>(v: T | null) => v ?? undefined;

export const toCafe = (r: Row<typeof schema.cafes>): Cafe => ({
  id: r.id,
  name: r.name,
  region: r.region,
  address: opt(r.address),
  phone: opt(r.phone),
  openedAt: r.openedAt,
  status: r.status,
  closedAt: iso(r.closedAt),
});
export const fromCafe = (c: Cafe): Insert<typeof schema.cafes> => ({
  ...c,
  address: c.address ?? null,
  phone: c.phone ?? null,
  closedAt: date(c.closedAt),
});

export const toGame = (r: Row<typeof schema.games>): BoardGame => ({
  id: r.id,
  bggId: opt(r.bggId),
  name: r.name,
  englishName: opt(r.englishName),
  imageUrl: opt(r.imageUrl),
  thumbnailUrl: opt(r.thumbnailUrl),
  categories: r.categories,
  minPlayers: r.minPlayers,
  maxPlayers: r.maxPlayers,
  playTimeMin: r.playTimeMin,
  playTimeMax: r.playTimeMax,
  difficulty: r.difficulty,
  createdAt: r.createdAt.toISOString(),
});
export const fromGame = (g: BoardGame): Insert<typeof schema.games> => ({
  ...g,
  bggId: g.bggId ?? null,
  englishName: g.englishName ?? null,
  imageUrl: g.imageUrl ?? null,
  thumbnailUrl: g.thumbnailUrl ?? null,
  createdAt: new Date(g.createdAt),
});

export const toInventoryItem = (r: Row<typeof schema.inventoryItems>): InventoryItem => ({
  cafeId: r.cafeId,
  gameId: r.gameId,
  quantity: r.quantity,
  status: r.status,
  updatedAt: r.updatedAt.toISOString(),
});
export const fromInventoryItem = (i: InventoryItem): Insert<typeof schema.inventoryItems> => ({
  ...i,
  updatedAt: new Date(i.updatedAt),
});

export const toPlay = (r: Row<typeof schema.playSessions>): PlaySession => ({
  id: r.id,
  cafeId: r.cafeId,
  gameId: r.gameId,
  startedAt: r.startedAt.toISOString(),
  returnedAt: iso(r.returnedAt),
  playerCount: r.playerCount,
  table: opt(r.table),
});
export const fromPlay = (p: PlaySession): Insert<typeof schema.playSessions> => ({
  ...p,
  startedAt: new Date(p.startedAt),
  returnedAt: date(p.returnedAt),
  table: p.table ?? null,
});

export const toUser = (r: Row<typeof schema.users>): User => ({
  id: r.id,
  name: r.name,
  email: r.email,
  role: r.role,
  cafeId: opt(r.cafeId),
  active: r.active,
});

export const toReservation = (r: Row<typeof schema.reservations>): Reservation => ({
  id: r.id,
  cafeId: r.cafeId,
  name: r.name,
  phone: r.phone,
  partySize: r.partySize,
  startsAt: r.startsAt.toISOString(),
  memo: opt(r.memo),
  status: r.status,
  createdAt: r.createdAt.toISOString(),
  arrivedAt: iso(r.arrivedAt),
  closedAt: iso(r.closedAt),
});
export const fromReservation = (r: Reservation): Insert<typeof schema.reservations> => ({
  ...r,
  startsAt: new Date(r.startsAt),
  memo: r.memo ?? null,
  createdAt: new Date(r.createdAt),
  arrivedAt: date(r.arrivedAt),
  closedAt: date(r.closedAt),
});

export const toWaitlistEntry = (r: Row<typeof schema.waitlistEntries>): WaitlistEntry => ({
  id: r.id,
  cafeId: r.cafeId,
  number: r.number,
  name: r.name,
  phone: r.phone,
  partySize: r.partySize,
  createdAt: r.createdAt.toISOString(),
  status: r.status,
  calledAt: iso(r.calledAt),
  closedAt: iso(r.closedAt),
});
export const fromWaitlistEntry = (e: WaitlistEntry): Insert<typeof schema.waitlistEntries> => ({
  ...e,
  createdAt: new Date(e.createdAt),
  calledAt: date(e.calledAt),
  closedAt: date(e.closedAt),
});

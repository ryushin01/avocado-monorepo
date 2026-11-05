import {
  boolean,
  date,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import type { Role } from "@/lib/auth/roles";
import type { CafeStatus } from "@/lib/cafes/types";
import type { GameCategory, GameDifficulty } from "@/lib/games/types";
import type { InventoryStatus } from "@/lib/inventory/types";
import type { ReservationStatus } from "@/lib/reservations/types";
import type { WaitlistStatus } from "@/lib/waitlist/types";

// 시각은 모두 timestamptz로 저장하고, 도메인 타입(ISO 문자열)으로는 repository에서 바꾼다.
const at = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

export const cafes = pgTable("cafes", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  region: text("region").notNull(),
  address: text("address"),
  phone: text("phone"),
  openedAt: date("opened_at", { mode: "string" }).notNull(),
  status: text("status").$type<CafeStatus>().notNull(),
  closedAt: at("closed_at"),
});

export const games = pgTable("games", {
  id: text("id").primaryKey(),
  bggId: integer("bgg_id"),
  name: text("name").notNull(),
  englishName: text("english_name"),
  imageUrl: text("image_url"),
  thumbnailUrl: text("thumbnail_url"),
  categories: text("categories").array().$type<GameCategory[]>().notNull(),
  minPlayers: integer("min_players").notNull(),
  maxPlayers: integer("max_players").notNull(),
  playTimeMin: integer("play_time_min").notNull(),
  playTimeMax: integer("play_time_max").notNull(),
  difficulty: text("difficulty").$type<GameDifficulty>().notNull(),
  createdAt: at("created_at").notNull(),
});

export const inventoryItems = pgTable(
  "inventory_items",
  {
    cafeId: text("cafe_id")
      .notNull()
      .references(() => cafes.id),
    gameId: text("game_id")
      .notNull()
      .references(() => games.id),
    quantity: integer("quantity").notNull(),
    status: text("status").$type<InventoryStatus>().notNull(),
    updatedAt: at("updated_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.cafeId, t.gameId] })],
);

export const playSessions = pgTable(
  "play_sessions",
  {
    id: text("id").primaryKey(),
    cafeId: text("cafe_id")
      .notNull()
      .references(() => cafes.id),
    gameId: text("game_id")
      .notNull()
      .references(() => games.id),
    startedAt: at("started_at").notNull(),
    returnedAt: at("returned_at"),
    playerCount: integer("player_count").notNull(),
    table: text("table_label"),
  },
  (t) => [index("play_sessions_cafe_started_idx").on(t.cafeId, t.startedAt)],
);

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    role: text("role").$type<Role>().notNull(),
    cafeId: text("cafe_id").references(() => cafes.id),
    active: boolean("active").notNull(),
    /** bcrypt. 없으면 로그인할 수 없다(비밀번호를 정하기 전). */
    passwordHash: text("password_hash"),
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email)],
);

export const reservations = pgTable(
  "reservations",
  {
    id: text("id").primaryKey(),
    cafeId: text("cafe_id")
      .notNull()
      .references(() => cafes.id),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    partySize: integer("party_size").notNull(),
    startsAt: at("starts_at").notNull(),
    memo: text("memo"),
    status: text("status").$type<ReservationStatus>().notNull(),
    createdAt: at("created_at").notNull(),
    arrivedAt: at("arrived_at"),
    closedAt: at("closed_at"),
  },
  (t) => [index("reservations_cafe_starts_idx").on(t.cafeId, t.startsAt)],
);

export const waitlistEntries = pgTable(
  "waitlist_entries",
  {
    id: text("id").primaryKey(),
    cafeId: text("cafe_id")
      .notNull()
      .references(() => cafes.id),
    number: integer("number").notNull(),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    partySize: integer("party_size").notNull(),
    createdAt: at("created_at").notNull(),
    status: text("status").$type<WaitlistStatus>().notNull(),
    calledAt: at("called_at"),
    closedAt: at("closed_at"),
  },
  (t) => [index("waitlist_cafe_created_idx").on(t.cafeId, t.createdAt)],
);

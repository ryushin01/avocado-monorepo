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

import type { AuditAction } from "@/entities/audit";
import type { Role } from "@/entities/user";
import type { CafeStatus } from "@/entities/cafe";
import type { GameCategory, GameDifficulty } from "@/entities/game";
import type { InventoryStatus } from "@/entities/inventory";
import type { ReservationStatus } from "@/entities/reservation";
import type { WaitlistStatus } from "@/entities/waitlist";

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
    /** 관리자가 정한 임시 비밀번호라면 true. 다음 로그인 때 본인 비밀번호로 바꿔야 한다. */
    mustChangePassword: boolean("must_change_password").notNull().default(false),
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

/** 매장 키오스크(런처) 기기. 토큰 원문은 발급할 때 한 번만 보여주고, 여기에는 해시만 둔다. */
export const kioskDevices = pgTable(
  "kiosk_devices",
  {
    id: text("id").primaryKey(),
    cafeId: text("cafe_id")
      .notNull()
      .references(() => cafes.id),
    name: text("name").notNull(),
    /** SHA-256(토큰) 16진수 */
    tokenHash: text("token_hash").notNull(),
    /** 화면에서 기기를 구분하는 앞부분 (예: kio_ab12…) */
    tokenPrefix: text("token_prefix").notNull(),
    createdAt: at("created_at").notNull(),
    lastUsedAt: at("last_used_at"),
    revokedAt: at("revoked_at"),
  },
  (t) => [uniqueIndex("kiosk_devices_token_idx").on(t.tokenHash), index("kiosk_devices_cafe_idx").on(t.cafeId)],
);

/** 관리 작업의 변경 이력. 추가만 하고 고치거나 지우지 않는다. */
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: text("id").primaryKey(),
    at: at("at").notNull(),
    actorId: text("actor_id")
      .notNull()
      .references(() => users.id),
    /** 작업할 때의 직원 이름 */
    actorName: text("actor_name").notNull(),
    action: text("action").$type<AuditAction>().notNull(),
    targetName: text("target_name").notNull(),
    cafeId: text("cafe_id").references(() => cafes.id),
    detail: text("detail"),
  },
  (t) => [index("audit_logs_at_idx").on(t.at)],
);

/** 로그인 연속 실패 기록 (이메일별). 성공하면 지운다. */
export const loginAttempts = pgTable("login_attempts", {
  /** 소문자로 맞춘 이메일 */
  email: text("email").primaryKey(),
  failures: integer("failures").notNull(),
  lastFailedAt: at("last_failed_at").notNull(),
  lockedUntil: at("locked_until"),
});

import type { Cafe } from "@/entities/cafe/@x/inventory";
import type { BoardGame, GameCategory } from "@/entities/game/@x/inventory";

export const INVENTORY_STATUSES = ["available", "maintenance", "retired"] as const;
export type InventoryStatus = (typeof INVENTORY_STATUSES)[number];

export const INVENTORY_STATUS_LABELS: Record<InventoryStatus, string> = {
  available: "이용 가능",
  maintenance: "점검 중",
  retired: "폐기",
};

/** 매장 하나가 보유한 게임 하나. (cafeId, gameId)가 키다. */
export type InventoryItem = {
  cafeId: string;
  gameId: string;
  /** 보유 수량(박스 수) */
  quantity: number;
  status: InventoryStatus;
  updatedAt: string;
};

export type InventoryEntry = InventoryItem & {
  game: BoardGame;
  /** 지금 손님이 이용 중인 박스 수 */
  inUse: number;
};

export type InventoryFilter = {
  q?: string;
  category?: GameCategory;
  status?: InventoryStatus;
};

export type CafeInventoryStats = {
  cafe: Cafe;
  /** 보유 게임 종류 수 */
  gameCount: number;
  /** 보유 박스 수 (폐기 제외) */
  boxCount: number;
  maintenanceCount: number;
  retiredCount: number;
};

export type InventorySummary = {
  cafes: CafeInventoryStats[];
  totals: Omit<CafeInventoryStats, "cafe"> & { cafeCount: number };
  /** 유형별 보유 현황 (폐기 제외). 게임 하나가 여러 유형이면 각 유형에 모두 센다. */
  categories: { category: GameCategory; gameCount: number; boxCount: number }[];
  /** 인원수별로 플레이할 수 있는 게임 수 (폐기 제외, 같은 게임은 한 번) */
  players: { label: string; gameCount: number }[];
  /** 최소 플레이 시간 구간별 게임 수 (폐기 제외, 같은 게임은 한 번) */
  playTime: { label: string; gameCount: number }[];
  /** 점검 중인 게임, 최근 변경 순 */
  maintenance: (InventoryEntry & { cafe: Cafe })[];
};

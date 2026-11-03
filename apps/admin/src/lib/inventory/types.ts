import type { BoardGame, GameCategory } from "@/lib/games/types";

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

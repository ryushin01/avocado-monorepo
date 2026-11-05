import { z } from "zod";

import { parseGameListFilter, GAME_CATEGORIES } from "@/entities/game/@x/inventory";
import { firstParam } from "@/shared/lib/search-params";

import { INVENTORY_STATUSES, type InventoryFilter } from "./types";

export const inventoryStatusSchema = z.enum(INVENTORY_STATUSES, {
  error: "알 수 없는 상태입니다.",
});

const quantity = z.coerce
  .number({ error: "보유 수량을 입력해주세요." })
  .int("보유 수량은 정수여야 합니다.")
  .min(1, "보유 수량은 1 이상이어야 합니다.")
  .max(99, "보유 수량은 99 이하여야 합니다.");

export const inventoryAddSchema = z.object({
  gameId: z
    .string({ error: "추가할 게임을 선택해주세요." })
    .min(1, "추가할 게임을 선택해주세요."),
  quantity,
});

export const inventoryEditSchema = z.object({
  quantity,
  status: inventoryStatusSchema,
});

export const inventoryFilterSchema = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.enum(GAME_CATEGORIES).optional(),
  status: inventoryStatusSchema.optional(),
});

/** URL 검색 파라미터 → 재고 필터. 알 수 없는 값은 무시한다. */
export function parseInventoryFilter(
  params: Record<string, string | string[] | undefined>,
): InventoryFilter {
  const status = inventoryStatusSchema.safeParse(firstParam(params.status));
  return {
    ...parseGameListFilter(params),
    status: status.success ? status.data : undefined,
  };
}

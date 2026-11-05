"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentUser } from "@/server/auth/current-user";
import { canManageInventory } from "@/entities/user";
import {
  formDataToObject,
  formError,
  type ActionResult,
  type FormState,
} from "@/shared/lib/form";
import type { BoardGame } from "@/entities/game";
import {
  addInventory,
  getInventory,
  listAddableGames,
  listInventory,
  removeInventory,
  updateInventory,
} from "@/server/inventory/data";
import { INVENTORY_STATUS_LABELS, type InventoryEntry, type InventoryFilter, type InventoryStatus } from "@/entities/inventory";
import { inventoryAddSchema, inventoryEditSchema, inventoryFilterSchema, inventoryStatusSchema } from "@/entities/inventory/schema";
import type { ListResult } from "@/shared/lib/list";

const FORBIDDEN = "이 매장의 재고를 관리할 권한이 없습니다.";
const NOT_FOUND = "재고를 찾을 수 없습니다. 목록을 새로고침해주세요.";
const IN_USE_REMOVE = "손님이 이용 중인 박스가 있어 제외할 수 없습니다. 반납 후 다시 시도해주세요.";

/** 액션마다 서버에서 다시 권한을 확인한다. 화면에서 숨긴 것만으로는 막을 수 없다. */
async function hasAccess(cafeId: string) {
  return canManageInventory(await getCurrentUser(), cafeId);
}

function revalidate() {
  revalidatePath("/inventory");
  revalidatePath("/games"); // 카탈로그의 보유 매장 수·총 수량
  revalidatePath("/"); // 대시보드
  revalidatePath("/plays"); // 빌려줄 수 있는 게임
}

export async function addInventoryAction(
  cafeId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formDataToObject(formData);
  if (!(await hasAccess(cafeId))) return formError(values, FORBIDDEN);

  const parsed = inventoryAddSchema.safeParse(values);
  if (!parsed.success) return formError(values, parsed.error);

  const entry = await addInventory(cafeId, parsed.data.gameId, parsed.data.quantity);
  if (!entry) return formError(values, "이미 보유 중이거나 없는 게임입니다.");

  revalidate();
  return { status: "success", message: `'${entry.game.name}'을(를) 재고에 추가했습니다.` };
}

export async function editInventoryAction(
  cafeId: string,
  gameId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formDataToObject(formData);
  if (!(await hasAccess(cafeId))) return formError(values, FORBIDDEN);

  const parsed = inventoryEditSchema.safeParse(values);
  if (!parsed.success) return formError(values, parsed.error);

  const entry = await updateInventory(cafeId, gameId, parsed.data);
  if (entry === "not-found") return formError(values, NOT_FOUND);
  if (entry === "in-use") {
    const current = await getInventory(cafeId, gameId);
    return {
      status: "error",
      fieldErrors: {
        quantity: [`지금 이용 중인 ${current?.inUse ?? ""}개보다 적게 줄일 수 없습니다.`],
      },
      values,
    };
  }

  revalidate();
  return { status: "success", message: `'${entry.game.name}' 재고를 수정했습니다.` };
}

export async function changeInventoryStatusAction(
  cafeId: string,
  gameId: string,
  status: InventoryStatus,
): Promise<ActionResult> {
  if (!(await hasAccess(cafeId))) return { ok: false, message: FORBIDDEN };
  const parsed = inventoryStatusSchema.safeParse(status);
  if (!parsed.success) return { ok: false, message: "알 수 없는 상태입니다." };

  const entry = await updateInventory(cafeId, gameId, { status: parsed.data });
  if (typeof entry === "string") return { ok: false, message: NOT_FOUND };

  revalidate();
  return {
    ok: true,
    message: `'${entry.game.name}' 상태를 '${INVENTORY_STATUS_LABELS[entry.status]}'(으)로 변경했습니다.`,
  };
}

export async function removeInventoryAction(
  cafeId: string,
  gameId: string,
  gameName: string,
): Promise<ActionResult> {
  if (!(await hasAccess(cafeId))) return { ok: false, message: FORBIDDEN };
  const result = await removeInventory(cafeId, gameId);
  if (result === "not-found") return { ok: false, message: NOT_FOUND };
  if (result === "in-use") return { ok: false, message: IN_USE_REMOVE };
  revalidate();
  return { ok: true, message: `'${gameName}'을(를) 재고에서 제외했습니다.` };
}

const rangeSchema = z.object({
  offset: z.number().int().min(0),
  limit: z.number().int().min(1).max(500),
});

/** 모바일 무한 스크롤에서 재고 다음 묶음을 불러온다. */
export async function fetchInventoryAction(
  cafeId: string,
  filter: InventoryFilter,
  offset: number,
  limit: number,
): Promise<ListResult<InventoryEntry>> {
  if (!(await hasAccess(cafeId))) return { items: [], total: 0 };
  return listInventory(
    cafeId,
    inventoryFilterSchema.parse(filter),
    rangeSchema.parse({ offset, limit }),
  );
}

/** 재고 추가 창의 게임 검색 */
export async function searchAddableGamesAction(
  cafeId: string,
  q: string,
): Promise<BoardGame[]> {
  if (!(await hasAccess(cafeId))) return [];
  return listAddableGames(cafeId, z.string().trim().max(100).parse(q) || undefined);
}

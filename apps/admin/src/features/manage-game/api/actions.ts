"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { recordAudit } from "@/server/audit/data";
import { getCurrentUser } from "@/server/auth/current-user";
import type { AuditAction } from "@/entities/audit";
import { canManageCatalog } from "@/entities/user";
import { formDataToObject, formError, type FormState } from "@/shared/lib/form";
import { createGame, listCatalog, updateGame } from "@/server/games/data";
import { gameInputSchema, gameListFilterSchema } from "@/entities/game/schema";
import type { CatalogEntry, GameListFilter } from "@/entities/game";
import type { ListResult } from "@/shared/lib/list";

const FORBIDDEN = "게임 정보는 관리자만 등록·수정할 수 있습니다.";
const NOT_FOUND = "게임을 찾을 수 없습니다. 목록을 새로고침해주세요.";

async function submitGameForm(
  formData: FormData,
  action: AuditAction,
  save: (input: z.infer<typeof gameInputSchema>) => Promise<{ name: string } | null>,
  done: (name: string) => string,
): Promise<FormState> {
  const values = formDataToObject(formData);
  const actor = await getCurrentUser();
  if (!canManageCatalog(actor)) return formError(values, FORBIDDEN);

  const parsed = gameInputSchema.safeParse(values);
  if (!parsed.success) return formError(values, parsed.error);

  const game = await save(parsed.data);
  if (!game) return formError(values, NOT_FOUND);

  await recordAudit(actor, { action, targetName: game.name });
  revalidatePath("/games");
  revalidatePath("/inventory");
  return { status: "success", message: done(game.name) };
}

export async function createGameAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  return submitGameForm(formData, "game.create", createGame, (name) => `'${name}'을(를) 등록했습니다.`);
}

export async function updateGameAction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  return submitGameForm(
    formData,
    "game.update",
    (input) => updateGame(id, input),
    (name) => `'${name}'을(를) 수정했습니다.`,
  );
}

const rangeSchema = z.object({
  offset: z.number().int().min(0),
  // 모바일 목록이 갱신될 때 이미 불러온 범위를 한 번에 다시 가져올 수 있도록 넉넉히 둔다.
  limit: z.number().int().min(1).max(500),
});

/** 모바일 무한 스크롤에서 카탈로그 다음 묶음을 불러온다. */
export async function fetchCatalogAction(
  filter: GameListFilter,
  offset: number,
  limit: number,
): Promise<ListResult<CatalogEntry>> {
  await getCurrentUser();
  return listCatalog(
    gameListFilterSchema.parse(filter),
    rangeSchema.parse({ offset, limit }),
  );
}

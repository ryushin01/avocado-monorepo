"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/current-user";
import { canRecordPlays } from "@/lib/auth/permissions";
import {
  formDataToObject,
  formError,
  type ActionResult,
  type FormState,
} from "@/lib/form";
import type { ListResult } from "@/lib/list";
import {
  cancelPlay,
  listPlayHistory,
  listRentableGames,
  returnPlay,
  startPlay,
} from "@/lib/plays/data";
import { playHistoryFilterSchema, playStartSchema } from "@/lib/plays/schema";
import { minutesBetween } from "@/lib/plays/time";
import type { PlayEntry, PlayHistoryFilter, RentableGame } from "@/lib/plays/types";

const FORBIDDEN = "이 매장의 이용 기록을 관리할 권한이 없습니다.";
const NOT_FOUND = "이용 중인 기록을 찾을 수 없습니다. 이미 반납했을 수 있습니다.";

/** 액션마다 서버에서 다시 권한을 확인한다. */
async function hasAccess(cafeId: string) {
  return canRecordPlays(await getCurrentUser(), cafeId);
}

function revalidate() {
  revalidatePath("/plays");
  revalidatePath("/inventory"); // 이용 중 수
  revalidatePath("/cafes");
  revalidatePath("/"); // 인기 순위
}

export async function startPlayAction(
  cafeId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formDataToObject(formData);
  if (!(await hasAccess(cafeId))) return formError(values, FORBIDDEN);

  const parsed = playStartSchema.safeParse(values);
  if (!parsed.success) return formError(values, parsed.error);

  const result = await startPlay(cafeId, parsed.data);
  if (result === "closed") return formError(values, "폐점한 매장입니다.");
  if (result === "not-found") return formError(values, "없는 게임입니다.");
  if (result === "unavailable") {
    return formError(values, "남은 박스가 없거나 이용 가능 상태가 아닌 게임입니다.");
  }

  revalidate();
  return { status: "success", message: `'${result.game.name}' 이용을 시작했습니다.` };
}

export async function returnPlayAction(cafeId: string, id: string): Promise<ActionResult> {
  if (!(await hasAccess(cafeId))) return { ok: false, message: FORBIDDEN };
  const entry = await returnPlay(cafeId, id);
  if (!entry) return { ok: false, message: NOT_FOUND };
  revalidate();
  const minutes = minutesBetween(entry.startedAt, entry.returnedAt!);
  return {
    ok: true,
    message: `'${entry.game.name}'을(를) 반납했습니다. (이용 ${minutes}분)`,
  };
}

export async function cancelPlayAction(
  cafeId: string,
  id: string,
  gameName: string,
): Promise<ActionResult> {
  if (!(await hasAccess(cafeId))) return { ok: false, message: FORBIDDEN };
  if (!(await cancelPlay(cafeId, id))) return { ok: false, message: NOT_FOUND };
  revalidate();
  return { ok: true, message: `'${gameName}' 이용 기록을 취소했습니다.` };
}

/** 이용 시작 창에서 고를 수 있는 게임 */
export async function listRentableGamesAction(cafeId: string): Promise<RentableGame[]> {
  if (!(await hasAccess(cafeId))) return [];
  return listRentableGames(cafeId);
}

const rangeSchema = z.object({
  offset: z.number().int().min(0),
  limit: z.number().int().min(1).max(500),
});

/** 모바일 무한 스크롤에서 지난 기록 다음 묶음을 불러온다. */
export async function fetchPlayHistoryAction(
  cafeId: string,
  filter: PlayHistoryFilter,
  offset: number,
  limit: number,
): Promise<ListResult<PlayEntry>> {
  if (!(await hasAccess(cafeId))) return { items: [], total: 0 };
  return listPlayHistory(
    cafeId,
    playHistoryFilterSchema.parse(filter),
    rangeSchema.parse({ offset, limit }),
  );
}

import { z } from "zod";

import { parseGameListFilter } from "@/entities/game/@x/play";
import { firstParam } from "@/shared/lib/search-params";

import type { PlayHistoryFilter } from "./types";

export const playStartSchema = z.object({
  gameId: z
    .string({ error: "이용할 게임을 선택해주세요." })
    .min(1, "이용할 게임을 선택해주세요."),
  playerCount: z.coerce
    .number({ error: "인원을 입력해주세요." })
    .int("인원은 정수여야 합니다.")
    .min(1, "인원은 1명 이상이어야 합니다.")
    .max(20, "인원은 20명 이하여야 합니다."),
  table: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().max(10, "테이블은 10자 이하여야 합니다.").optional(),
  ),
});

export type PlayStartInput = z.infer<typeof playStartSchema>;

export const playHistoryFilterSchema = z.object({
  q: z.string().trim().max(100).optional(),
  date: z.iso.date().optional(),
});

/** URL 검색 파라미터 → 이용 기록 필터. 알 수 없는 값은 무시한다. */
export function parsePlayHistoryFilter(
  params: Record<string, string | string[] | undefined>,
): PlayHistoryFilter {
  const date = z.iso.date().safeParse(firstParam(params.date));
  return {
    q: parseGameListFilter(params).q,
    date: date.success ? date.data : undefined,
  };
}

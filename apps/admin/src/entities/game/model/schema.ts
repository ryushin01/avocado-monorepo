import { GAME_SORT_KEYS } from "./sort";
import { z } from "zod";

import { firstParam } from "@/shared/lib/search-params";

import { GAME_CATEGORIES, GAME_DIFFICULTIES, type GameListFilter } from "./types";

const count = (label: string, max: number) =>
  z.coerce
    .number({ error: `${label}을(를) 입력해주세요.` })
    .int(`${label}은(는) 정수여야 합니다.`)
    .min(1, `${label}은(는) 1 이상이어야 합니다.`)
    .max(max, `${label}은(는) ${max} 이하여야 합니다.`);

/** 빈 문자열은 값 없음(undefined)으로 본다. */
const optionalText = (schema: z.ZodType<string>) =>
  z.preprocess((v) => (v === "" ? undefined : v), schema.optional());

export const gameInputSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "게임 이름을 입력해주세요.")
      .max(100, "게임 이름은 100자 이하여야 합니다."),
    englishName: optionalText(
      z.string().trim().max(100, "영문 이름은 100자 이하여야 합니다."),
    ),
    imageUrl: optionalText(
      z.url({
        protocol: /^https?$/,
        error: "http(s)로 시작하는 이미지 주소를 입력해주세요.",
      }),
    ),
    categories: z.preprocess(
      (v) => (v == null ? [] : Array.isArray(v) ? v : [v]),
      z
        .array(z.enum(GAME_CATEGORIES, { error: "알 수 없는 카테고리입니다." }))
        .min(1, "카테고리를 하나 이상 선택해주세요."),
    ),
    difficulty: z.enum(GAME_DIFFICULTIES, { error: "난이도를 선택해주세요." }),
    minPlayers: count("최소 인원", 20),
    maxPlayers: count("최대 인원", 20),
    playTimeMin: count("최소 플레이 시간", 1440),
    playTimeMax: count("최대 플레이 시간", 1440),
  })
  .refine((v) => v.maxPlayers >= v.minPlayers, {
    path: ["maxPlayers"],
    message: "최대 인원은 최소 인원 이상이어야 합니다.",
  })
  .refine((v) => v.playTimeMax >= v.playTimeMin, {
    path: ["playTimeMax"],
    message: "최대 플레이 시간은 최소 플레이 시간 이상이어야 합니다.",
  });

export type GameInput = z.infer<typeof gameInputSchema>;

export const gameListFilterSchema = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.enum(GAME_CATEGORIES).optional(),
  sort: z.enum(GAME_SORT_KEYS).optional(),
  order: z.literal("desc").optional(),
});

/** URL 검색 파라미터 → 카탈로그 필터. 알 수 없는 값은 무시한다. */
export function parseGameListFilter(
  params: Record<string, string | string[] | undefined>,
): GameListFilter {
  const q = firstParam(params.q)?.trim();
  const category = z.enum(GAME_CATEGORIES).safeParse(firstParam(params.category));
  const sort = z.enum(GAME_SORT_KEYS).safeParse(firstParam(params.sort));
  return {
    q: q || undefined,
    category: category.success ? category.data : undefined,
    sort: sort.success ? sort.data : undefined,
    order: sort.success && firstParam(params.order) === "desc" ? "desc" : undefined,
  };
}

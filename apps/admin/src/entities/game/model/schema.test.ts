import { describe, expect, it } from "vitest";

import { gameInputSchema, parseGameListFilter } from "./schema";

const valid = {
  name: "  카탄  ",
  englishName: "",
  imageUrl: "",
  categories: "family",
  difficulty: "normal",
  minPlayers: "3",
  maxPlayers: "4",
  playTimeMin: "60",
  playTimeMax: "90",
};

const errorPaths = (input: unknown) =>
  gameInputSchema
    .safeParse(input)
    .error?.issues.map((i) => i.path[0])
    .sort();

describe("gameInputSchema", () => {
  it("폼 문자열을 변환한다: 숫자, 공백 제거, 단일 카테고리 → 배열, 빈 선택 항목 → undefined", () => {
    expect(gameInputSchema.parse(valid)).toEqual({
      name: "카탄",
      englishName: undefined,
      imageUrl: undefined,
      categories: ["family"],
      difficulty: "normal",
      minPlayers: 3,
      maxPlayers: 4,
      playTimeMin: 60,
      playTimeMax: 90,
    });
  });

  it("여러 카테고리를 받는다", () => {
    expect(
      gameInputSchema.parse({ ...valid, categories: ["strategy", "thematic"] })
        .categories,
    ).toEqual(["strategy", "thematic"]);
  });

  it("빈 이름과 카테고리 미선택을 거부한다", () => {
    expect(
      errorPaths({ ...valid, name: "   ", categories: undefined }),
    ).toEqual(["categories", "name"]);
  });

  it("최대값이 최소값보다 작으면 최대값 필드에 오류를 낸다", () => {
    expect(
      errorPaths({ ...valid, minPlayers: "5", playTimeMin: "120" }),
    ).toEqual(["maxPlayers", "playTimeMax"]);
  });

  it("알 수 없는 카테고리, 0 이하 인원, http(s)가 아닌 이미지 주소를 거부한다", () => {
    expect(
      errorPaths({
        ...valid,
        categories: ["unknown"],
        minPlayers: "0",
        imageUrl: "javascript:alert(1)",
      }),
    ).toEqual(["categories", "imageUrl", "minPlayers"]);
  });
});

describe("parseGameListFilter", () => {
  it("유효한 값만 필터로 남긴다", () => {
    expect(
      parseGameListFilter({ q: " 카 ", category: "all", status: "available" }),
    ).toEqual({ q: "카", category: undefined });
  });

  it("배열 파라미터는 첫 값을 쓴다", () => {
    expect(parseGameListFilter({ q: ["a", "b"] }).q).toBe("a");
  });
});

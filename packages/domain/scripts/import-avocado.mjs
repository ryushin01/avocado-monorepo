// avocado 프로젝트의 보드게임 데이터를 카탈로그 원본(data/catalog.json)으로 변환한다.
// 사용법: node scripts/import-avocado.mjs [avocado의 public/data 폴더 경로]
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = process.argv[2] ?? path.join(here, "../../../../avocado-master/public/data");
const OUTPUT = path.join(here, "../data/catalog.json");
// scripts/import-avocado-images.mjs가 만든 썸네일 폴더
const THUMBNAIL_DIR = path.join(here, "../assets/games");

// avocado 유형(type) → 카탈로그 카테고리 키. src/catalog/types.ts의 GAME_CATEGORIES와 같아야 한다.
const TYPE_TO_CATEGORY = {
  Strategy: "strategy",
  Thematic: "thematic",
  Family: "family",
  Party: "party",
  Abstract: "abstract",
  Wargames: "wargame",
  Customizable: "customizable",
};
// 유형 설명. avocado 원본은 말투가 제각각이라 여기서 통일한다.
const TYPE_DESCRIPTIONS = {
  Strategy: "자원과 수를 따져 가며 승리를 설계하는 게임입니다.",
  Thematic: "이야기와 세계관에 빠져들어 함께 모험하는 게임입니다.",
  Family: "규칙이 쉬워 어린이부터 어른까지 함께 즐기는 게임입니다.",
  Party: "여럿이 모여 웃고 떠들며 즐기는 게임입니다.",
  Abstract: "운보다 실력으로 두뇌 대결을 벌이는 게임입니다.",
  Wargames: "역사 속 전투를 테이블 위에서 지휘하는 게임입니다.",
  Customizable: "카드를 모으고 덱을 직접 구성해 겨루는 게임입니다.",
};

const read = (file) => JSON.parse(readFileSync(path.join(dataDir, file), "utf8"));

/** "1-4" → [1, 4], "2" → [2, 2] */
function parseRange(value, label, name) {
  const [min, max = min] = String(value).split("-").map(Number);
  if (!Number.isInteger(min) || !Number.isInteger(max) || min > max) {
    throw new Error(`${name}: ${label} 값을 해석할 수 없습니다 (${value})`);
  }
  return [min, max];
}

function toDifficulty(weight) {
  if (weight < 2) return "easy";
  if (weight < 3) return "normal";
  return "hard";
}

// 유형 목록이 원본(boardgameTypeData.json)과 같은지 확인한다.
const types = read("boardgameTypeData.json").result;
const sourceTypes = types.map((t) => t.type).join(",");
const knownTypes = Object.keys(TYPE_TO_CATEGORY).join(",");
if (sourceTypes !== knownTypes) {
  throw new Error(
    `avocado 유형 목록이 바뀌었습니다.\n원본: ${sourceTypes}\n현재: ${knownTypes}\n` +
      "TYPE_TO_CATEGORY와 src/catalog/types.ts를 함께 수정하세요.",
  );
}

const categories = types.map((t) => ({
  key: TYPE_TO_CATEGORY[t.type],
  label: t.name,
  bggType: t.type,
  description: TYPE_DESCRIPTIONS[t.type],
}));

const games = read("boardgameAllData.json").result.map((item) => {
  const [minPlayers, maxPlayers] = parseRange(item.players, "인원", item.name);
  const [playTimeMin, playTimeMax] = parseRange(item.playingTime, "플레이 시간", item.name);
  const gameCategories = [...new Set(item.type.map((t) => TYPE_TO_CATEGORY[t]))];
  if (gameCategories.includes(undefined)) {
    throw new Error(`${item.name}: 알 수 없는 유형 ${item.type.join(", ")}`);
  }
  return {
    bggId: item.bggId,
    rank: item.ranking,
    name: item.name,
    englishName: item.englishName,
    imageUrl: item.image,
    // 로컬 썸네일이 있으면 목록에서는 원본 대신 그것을 쓴다.
    thumbnailUrl: existsSync(path.join(THUMBNAIL_DIR, `${item.bggId}.webp`))
      ? `/images/games/${item.bggId}.webp`
      : undefined,
    yearReleased: item.yearReleased,
    designers: item.designer,
    categories: gameCategories,
    tags: item.category,
    minPlayers,
    maxPlayers,
    bestPlayers: String(item.best),
    playTimeMin,
    playTimeMax,
    minAge: item.minAge,
    rating: item.average,
    weight: item.averageWeight,
    difficulty: toDifficulty(item.averageWeight),
    koreanEdition: Boolean(item.isKoreanVersion),
  };
});

writeFileSync(OUTPUT, JSON.stringify({ categories, games }, null, 2) + "\n");
const thumbnails = games.filter((g) => g.thumbnailUrl).length;
console.log(`유형 ${categories.length}개, 게임 ${games.length}개를 ${OUTPUT}에 저장했습니다. (썸네일 ${thumbnails}개)`);
if (thumbnails < games.length) {
  console.warn("썸네일이 없는 게임이 있습니다. 먼저 pnpm import:avocado-images를 실행하세요.");
}

// Feature-Sliced Design 경계 규칙. 앱의 src 폴더를 읽어 슬라이스마다 규칙을 만든다.
// 위 레이어는 아래 레이어만 가져오고, 같은 레이어의 다른 슬라이스는 가져오지 않으며,
// 슬라이스 밖에서는 공개 API(index.ts, 엔티티의 ui·@x)로만 가져온다.
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

const LAYERS = ["shared", "entities", "features", "widgets", "views", "app"];
const SLICED = ["entities", "features", "widgets", "views"];
const SERVER_MESSAGE = "서버 코드(server, db)는 화면 조각에서 직접 가져오지 않습니다. views·app이나 features의 api에서 읽어 props로 넘기세요.";

const pattern = (regex, message) => ({ regex, message });

function publicApi(layer) {
  if (layer === "entities") {
    return pattern(
      "^@/entities/[^/]+/(?!ui$|schema$|@x/[^/]+$).+",
      "엔티티는 공개 API(@/entities/<이름>, /ui, /schema, /@x/<소비자>)로만 가져옵니다.",
    );
  }
  return pattern(`^@/${layer}/[^/]+/.+`, `${layer}는 공개 API(@/${layer}/<이름>)로만 가져옵니다.`);
}

function rulesFor(layer, slice, { allowServer }) {
  const index = LAYERS.indexOf(layer);
  const upper = LAYERS.slice(index + 1);
  const patterns = [
    ...upper.map((u) => pattern(`^@/${u}(/|$)`, `${layer}에서 위 레이어(${u})를 가져올 수 없습니다.`)),
    ...SLICED.filter((l) => LAYERS.indexOf(l) < index).map(publicApi),
  ];
  if (slice) {
    if (layer === "entities") {
      patterns.push(
        pattern(
          `^@/entities/(?!${slice}(/|$))[^/]+(/ui|/schema)?$`,
          "다른 엔티티는 @x 공개 API(@/entities/<이름>/@x/<이 엔티티>)로만 가져옵니다.",
        ),
        pattern(
          `^@/entities/(?!${slice}(/|$))[^/]+/@x/(?!${slice}$)`,
          "@x는 그 이름의 엔티티에서만 가져옵니다.",
        ),
      );
    } else {
      patterns.push(
        pattern(
          `^@/${layer}/(?!${slice}(/|$))`,
          `같은 레이어(${layer})의 다른 슬라이스를 가져올 수 없습니다. 위 레이어에서 조합하세요.`,
        ),
      );
    }
    patterns.push(pattern(`^@/${layer}/${slice}(/|$)`, "슬라이스 안에서는 상대 경로로 가져옵니다."));
    patterns.push(pattern("^(\\.\\./){3,}", "슬라이스 밖으로 나가는 상대 경로는 쓰지 않습니다."));
  }
  if (!allowServer) patterns.push(pattern("^@/(server|db)(/|$)", SERVER_MESSAGE));
  return { "no-restricted-imports": ["error", { patterns }] };
}

function subdirs(dir) {
  return existsSync(dir)
    ? readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name)
    : [];
}

/** @param {string} appDir 앱 폴더 (import.meta.dirname) */
export function fsdConfig(appDir) {
  const src = path.join(appDir, "src");
  const blocks = [
    { files: ["src/shared/**"], rules: rulesFor("shared", null, { allowServer: false }) },
    { files: ["src/app/**"], rules: rulesFor("app", null, { allowServer: true }) },
  ];
  for (const layer of SLICED) {
    for (const slice of subdirs(path.join(src, layer))) {
      const glob = `src/${layer}/${slice}/**`;
      // 서버 데이터는 views와 features의 서버 액션(api)만 읽는다.
      blocks.push({ files: [glob], rules: rulesFor(layer, slice, { allowServer: layer === "views" }) });
      if (layer === "features") {
        blocks.push({ files: [`src/features/${slice}/api/**`], rules: rulesFor(layer, slice, { allowServer: true }) });
      }
    }
  }
  // 서버 코드는 화면을 모른다. 엔티티의 model과 shared만 가져온다.
  blocks.push({
    files: ["src/server/**", "src/db/**", "scripts/**"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          pattern("^@/(features|widgets|views|app)(/|$)", "서버 코드는 화면 레이어를 가져올 수 없습니다."),
          pattern("^@/entities/[^/]+/(?!schema$).+", "서버 코드는 엔티티의 model 공개 API(@/entities/<이름>, /schema)만 가져옵니다."),
          pattern("^@/shared/ui(/|$)", "서버 코드는 화면 컴포넌트를 가져올 수 없습니다."),
        ],
      }],
    },
  });
  return blocks;
}

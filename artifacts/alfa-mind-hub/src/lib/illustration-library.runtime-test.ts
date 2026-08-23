import { defaultSpec, type WorksheetSpec } from "./creator-options";
import {
  clearLocalIllustrationCache,
  localIllustrationCacheStats,
  localIllustrationAssetsForSpec,
  selectLocalIllustrations,
} from "./illustration-library";
import {
  createWorksheetAssetPlan,
  localAssetsForTopic,
  resolveVisualAssetMentions,
  safeVisualAssetFallback,
  visualAssetPlacementIssues,
  visualAssetPrintIssues,
  visualAssetLabel,
  visualAssetLibrary,
} from "./visual-asset-library";
import { visualAssetKeys } from "./semantic-topics";
import { buildValidWorksheetProject, checkWorksheetProject } from "./worksheet-service";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function spec(prompt: string, theme: string): WorksheetSpec {
  return {
    ...defaultSpec,
    prompt,
    theme,
    level: "Ages 4–5",
    activityType: "Count & Match",
    printing: "Ink Saving",
  };
}

/** Dependency-free coverage for the illustration library and print contracts. */
export function runIllustrationLibraryTests() {
  clearLocalIllustrationCache();
  const compoundMentions = resolveVisualAssetMentions("fish bowl and a yarn ball");
  assert(
    compoundMentions.map((mention) => mention.asset).join(",") === "fishBowl,ball",
    "compound phrases must resolve to their specific local assets",
  );
  assert(
    compoundMentions.map(visualAssetLabel).join(",") === "fish bowl,yarn ball",
    "teacher-facing labels must survive local asset resolution",
  );
  assert(
    visualAssetLibrary.fishBowl.printSafe && visualAssetLibrary.fishBowl.license === "alfa-local",
    "the local manifest must mark renderer-backed assets as print-safe Alfa art",
  );
  assert(
    visualAssetKeys.every(
      (asset) =>
        visualAssetLibrary[asset].renderer === asset &&
        visualAssetLibrary[asset].kind &&
        visualAssetLibrary[asset].topicIds.length > 0 &&
        visualAssetLibrary[asset].ageBands.length > 0 &&
        visualAssetLibrary[asset].styleFamily === "alfa-soft-pastel-line" &&
        ["simple", "detailed"].includes(visualAssetLibrary[asset].complexity) &&
        typeof visualAssetLibrary[asset].decorationSafe === "boolean" &&
        visualAssetLibrary[asset].minPrintPx > 0,
    ),
    "every renderer-backed asset must have local classification and print metadata",
  );
  assert(
    safeVisualAssetFallback("not-a-real-asset") === "circle",
    "an invalid persisted asset must resolve to the local neutral fallback",
  );
  assert(
    visualAssetPrintIssues("fishBowl", 32).length === 1 &&
      visualAssetPrintIssues("fishBowl", 64).length === 0,
    "print QA must expose asset-specific minimum sizes",
  );
  assert(
    visualAssetPlacementIssues("fishBowl", {
      sizePx: 46,
      mechanic: "maze-route",
      decoration: true,
    }).some((issue) => /not approved as non-counted decoration/.test(issue)),
    "non-counted decoration must respect the local asset safety contract",
  );

  const toddlerSpace = createWorksheetAssetPlan(
    { ...spec("Create a counting worksheet about space.", "Space"), level: "Ages 2–3" },
    "count-match",
    { seed: 4 },
  );
  assert(
    !toddlerSpace.selectedAssets.includes("astronaut") &&
      !toddlerSpace.selectedAssets.includes("satellite"),
    "open early-years theme pools must avoid visually complex space assets",
  );
  const animalSpec = spec("Create a count-and-match worksheet about animals.", "Animals");
  const animalAssetsA = localIllustrationAssetsForSpec(animalSpec, "count-match", { seed: 1 });
  const animalAssetsB = localIllustrationAssetsForSpec(animalSpec, "count-match", { seed: 2 });
  assert(
    animalAssetsA.length > 1 &&
      animalAssetsA[0] !== animalAssetsB[0] &&
      JSON.stringify(animalAssetsA) ===
        JSON.stringify(localIllustrationAssetsForSpec(animalSpec, "count-match", { seed: 1 })),
    "open topic pools must rotate deterministically between page seeds",
  );
  const lockedToddler = createWorksheetAssetPlan(
    { ...spec("Count astronauts from 1–3.", "Space"), level: "Ages 2–3" },
    "count-match",
    { seed: 4 },
  );
  assert(
    lockedToddler.selectedAssets.join(",") === "astronaut",
    "teacher-named assets must remain locked even when an open pool would filter them",
  );
  assert(
    JSON.stringify(toddlerSpace.selectedAssets) ===
      JSON.stringify(
        createWorksheetAssetPlan(
          { ...spec("Create a counting worksheet about space.", "Space"), level: "Ages 2–3" },
          "count-match",
          { seed: 4 },
        ).selectedAssets,
      ),
    "the visual allocation plan must be deterministic for the same worksheet seed",
  );
  assert(
    !localAssetsForTopic("ocean", {
      level: "Ages 4–5",
      mechanic: "count-match",
      excludeAssets: ["boat"],
    }).includes("boat"),
    "topic pools must respect deterministic local exclusions",
  );

  const seaAssets = localIllustrationAssetsForSpec(
    spec("Create a count-and-match worksheet about sea animals.", "Ocean"),
    "count-match",
  );
  assert(seaAssets.includes("dolphin") && seaAssets.includes("seahorse"), "sea animals must use rich local art");
  assert(!seaAssets.includes("boat"), "sea animals must not rotate through transport props");
  assert(seaAssets.every((asset) => visualAssetKeys.includes(asset)), "every selected asset must be renderer-safe");

  const locked = selectLocalIllustrations(
    spec("Count 1–5 dolphins and circle the correct number.", "Ocean"),
    "count-circle",
  );
  assert(JSON.stringify(locked.assets) === JSON.stringify(["dolphin"]), "explicit dolphin requests must stay locked");
  assert(locked.intent.topic === "sea-animals", "search intent must retain the visual topic");
  assert(locked.intent.printStyle === "Ink Saving", "search intent must include print style");
  assert(Boolean(locked.intent.cacheKey), "search intent must have a stable cache key");
  selectLocalIllustrations(
    spec("Create a count-and-match worksheet about sea animals.", "Ocean"),
    "count-match",
  );
  assert(localIllustrationCacheStats().hits > 0, "repeated local selection should use the bounded asset cache");

  const oceanSpec = spec(
    "Count groups from 1–5 of friendly sea animals and match each group to a number.",
    "Ocean",
  );
  const project = buildValidWorksheetProject(oceanSpec);
  assert(
    checkWorksheetProject(project, oceanSpec).issues.filter((issue) => issue.severity === "error").length === 0,
    "illustration selection must preserve worksheet validation",
  );
  for (const page of project.pages) {
    if (page.activity.kind !== "count-match") continue;
    for (const group of page.activity.groups) {
      assert(group.correctAnswer === group.renderedObjects.length, "answers must remain derived from rendered objects");
      assert(
        group.renderedObjects.every((object) => visualAssetKeys.includes(object.asset)),
        "count objects must remain renderer-safe",
      );
    }
  }

  const mazeProject = buildValidWorksheetProject({
    ...spec("Make an ocean maze for children.", "Ocean"),
    activityType: "Maze",
    pages: "1",
  });
  const mazePage = mazeProject.pages[0];
  assert(
    mazePage?.activity.kind === "maze" && Boolean(mazePage.activity.decoration),
    "themed mazes should receive one local topic cue outside the wall graph",
  );
  const lockedMaze = buildValidWorksheetProject({
    ...spec("Make a maze with an astronaut.", "Space"),
    activityType: "Maze",
    pages: "1",
  });
  const lockedMazePage = lockedMaze.pages[0];
  assert(
    lockedMazePage?.activity.kind === "maze" &&
      lockedMazePage.activity.decoration?.asset === "astronaut" &&
      checkWorksheetProject(lockedMaze, {
        ...spec("Make a maze with an astronaut.", "Space"),
        activityType: "Maze",
        pages: "1",
      }).issues.every((issue) => issue.severity !== "error"),
    "a detailed explicitly requested maze asset must remain printable at its approved size",
  );
}
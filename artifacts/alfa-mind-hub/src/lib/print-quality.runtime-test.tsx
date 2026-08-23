import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { defaultSpec, type WorksheetSpec } from "./creator-options";
import { localIllustrationAssetsForSpec } from "./illustration-library";
import { layoutIssuesForPage } from "./worksheet-layout";
import { paperSizes, resolvePalette, visualAssetKeys, type RenderMode, type VisualAssetKey, type WorksheetPageModel, type WorksheetProject } from "./worksheet-model";
import { InsectArt } from "../components/studio/InsectArt";
import { PrintablePage } from "../components/studio/PrintablePage";
import { checkWorksheetProject, buildValidWorksheetProject, validateFinalizedPageData } from "./worksheet-service";
import { resolveVisualAssetMentions, visualAssetPlacementIssues, visualAssetLibrary } from "./visual-asset-library";
import { pdfPageGeometry } from "./pdf-export";
import {
  ALFA_ASSET_FAMILY_VERSION,
  ALFA_VECTOR_ENGINE_VERSION,
  isComposedNativeAsset,
  resolveArtworkRecipe,
} from "./artwork-contract";
import { WorksheetArt } from "../components/studio/WorksheetArt";

type Scenario = {
  id: string;
  theme: string;
  activityType: "Counting" | "Matching" | "Maze" | "Memory Pairs";
  skill: string;
  prompt: string;
};

const scenarios: Scenario[] = [
  {
    id: "count-animals",
    theme: "Animals",
    activityType: "Counting",
    skill: "Counting",
    prompt: "Count groups of animals and match each group to a number.",
  },
  {
    id: "count-fruit",
    theme: "Fruits",
    activityType: "Counting",
    skill: "Counting",
    prompt: "Count groups of fruit and circle the correct number.",
  },
  {
    id: "match-animals",
    theme: "Animals",
    activityType: "Matching",
    skill: "Visual Discrimination",
    prompt: "Create a matching worksheet. On the left: cat, dog, horse. On the right: cat, dog, horse.",
  },
  {
    id: "match-nature",
    theme: "Nature",
    activityType: "Matching",
    skill: "Visual Discrimination",
    prompt: "Create a matching worksheet. On the left: tree, flower, leaf. On the right: tree, flower, leaf.",
  },
  {
    id: "maze-ocean",
    theme: "Ocean",
    activityType: "Maze",
    skill: "Problem Solving",
    prompt: "Make an ocean maze for children.",
  },
  {
    id: "maze-space",
    theme: "Space",
    activityType: "Maze",
    skill: "Problem Solving",
    prompt: "Make a maze with an astronaut.",
  },
  {
    id: "memory-insects",
    theme: "Insects",
    activityType: "Memory Pairs",
    skill: "Vocabulary",
    prompt: "Create a memory pairs game with insect pictures.",
  },
];

const papers = Object.keys(paperSizes) as Array<keyof typeof paperSizes>;
const modes: RenderMode[] = ["premium", "soft", "ink", "bw"];

function fail(message: string): never {
  throw new Error(`[print-quality] ${message}`);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) fail(message);
}

function specFor(scenario: Scenario, paper: string): WorksheetSpec {
  return {
    ...defaultSpec,
    level: "Kindergarten",
    difficulty: "Standard",
    pages: "1",
    activityType: scenario.activityType,
    skill: scenario.skill,
    theme: scenario.theme,
    prompt: scenario.prompt,
    paper,
    palette: "Soft Pastels",
    printing: "Color",
    ...(scenario.activityType === "Memory Pairs"
      ? {
          objectiveId: "vocabulary-theme",
          mechanicId: "memory",
          subjectDomain: "Early Literacy",
          activityMechanic: "memory-pairs",
          source: "idea-lab",
        }
      : {}),
  };
}

function pageObjects(page: WorksheetPageModel) {
  if (page.activity.kind === "count-match") {
    return page.activity.groups.flatMap((group) => group.renderedObjects);
  }
  if (page.activity.kind === "count-circle") {
    return page.activity.rows.flatMap((row) => row.renderedObjects);
  }
  if (page.activity.kind === "match-pairs") {
    return [...page.activity.left, ...page.activity.right];
  }
  return [];
}

function styleOfRoot(markup: string) {
  const match = markup.match(/class="worksheet-page" style="([^"]+)"/);
  assert(match?.[1], "rendered page is missing its printable root style");
  return match[1];
}

function svgSizesForObjects(markup: string) {
  return [...markup.matchAll(/data-rendered-object-id="([^"]+)"[\s\S]*?<svg[^>]*\bwidth="([\d.]+)"/g)].map(
    (match) => ({ id: match[1]!, size: Number(match[2]) }),
  );
}

function assertProjectIsPrintable(project: WorksheetProject, spec: WorksheetSpec) {
  const errors = checkWorksheetProject(project, spec).issues.filter((issue) => issue.severity === "error");
  assert(errors.length === 0, `${spec.activityType}/${spec.theme} has validation errors: ${errors.map((issue) => issue.message).join(" | ")}`);

  for (const page of project.pages) {
    assert(validateFinalizedPageData(page).length === 0, `${page.id} has finalized-data errors`);
    const layoutIssues = layoutIssuesForPage(page, {
      level: project.meta.level,
      paper: project.meta.paper,
    });
    assert(
      layoutIssues.length === 0,
      `${page.id} has clipping, collision, or safe-area issues on ${project.meta.paper}: ${layoutIssues.map((issue) => issue.message).join(" | ")}`,
    );
  }
}

function assertCanonicalArtwork(project: WorksheetProject) {
  const manifest = project.artworkManifest;
  assert(manifest, `${project.id} is missing its canonical artwork manifest`);
  assert(
    manifest.engineVersion === ALFA_VECTOR_ENGINE_VERSION &&
      manifest.assetFamilyVersion === ALFA_ASSET_FAMILY_VERSION,
    `${project.id} has an unversioned artwork manifest`,
  );
  const recipes = Object.values(manifest.items);
  // A pure maze has no drawable object item: its verified wall graph is the
  // learning content. Asset-bearing pages, however, must always be stamped.
  const hasDrawableObjects = project.pages.some(
    (page) => page.activity.kind !== "maze" || Boolean(page.activity.decoration),
  );
  assert(
    !hasDrawableObjects || recipes.length > 0,
    `${project.id} has asset-bearing pages but no artwork recipes`,
  );
  for (const recipe of recipes) {
    assert(recipe.engineVersion === ALFA_VECTOR_ENGINE_VERSION, `${recipe.itemId} has a stale engine version`);
    assert(recipe.assetFamilyVersion === ALFA_ASSET_FAMILY_VERSION, `${recipe.itemId} has a stale asset-family version`);
    assert(recipe.capabilities.localOnly && recipe.capabilities.deterministic, `${recipe.itemId} does not declare a local deterministic contract`);
    assert(recipe.capabilities.supportsInkSaving && recipe.capabilities.supportsMonochrome, `${recipe.itemId} lacks a print-mode capability`);
    assert(recipe.seed >= 0 && Number.isInteger(recipe.seed), `${recipe.itemId} has an invalid deterministic seed`);
    assert(
      isComposedNativeAsset(recipe.asset) ? recipe.fallbackCategory === "none" : recipe.fallbackCategory === "native-family",
      `${recipe.itemId} has an invalid native fallback classification`,
    );
  }
}

function assertPdfPaperGeometry() {
  for (const paper of papers) {
    const geometry = pdfPageGeometry(paper);
    const expected = paperSizes[paper];
    assert(
      geometry.widthMm === expected.w && geometry.heightMm === expected.h,
      `PDF geometry does not preserve the ${paper} printable dimensions`,
    );
    assert(
      geometry.format[0] === expected.w && geometry.format[1] === expected.h,
      `PDF format tuple does not preserve the ${paper} printable dimensions`,
    );
  }
}

function assertCountingPage(page: WorksheetPageModel, markup: string) {
  const activity = page.activity;
  if (activity.kind !== "count-match" && activity.kind !== "count-circle") return;
  const groups = activity.kind === "count-match" ? activity.groups : activity.rows;
  const exercises = [
    ...markup.matchAll(
      /data-count-exercise-id="([^"]+)"[^>]*data-correct-answer="(\d+)"/g,
    ),
  ];
  assert(exercises.length === groups.length, `${page.id} rendered ${exercises.length} count exercises for ${groups.length} groups`);

  for (const group of groups) {
    const exercise = exercises.find((match) => match[1] === group.id);
    assert(exercise, `${group.id} is missing from the printed count markup`);
    const start = exercise.index ?? 0;
    const next = exercises.find((match) => (match.index ?? 0) > start)?.index ?? markup.length;
    const section = markup.slice(start, next);
    const renderedCount = (section.match(/data-rendered-object-id=/g) ?? []).length;
    assert(renderedCount === group.renderedObjects.length, `${group.id} rendered ${renderedCount} objects instead of ${group.renderedObjects.length}`);
    assert(Number(exercise[2]) === group.correctAnswer, `${group.id} printed answer differs from its finalized answer`);
    assert(group.correctAnswer === group.renderedObjects.length, `${group.id} answer is not derived from its rendered objects`);
  }

  const objectsById = new Map(pageObjects(page).map((object) => [object.id, object]));
  const mechanic =
    "mechanic" in activity && typeof activity.mechanic === "string" ? activity.mechanic : undefined;
  for (const { id, size } of svgSizesForObjects(markup)) {
    const object = objectsById.get(id);
    assert(object && Number.isFinite(size) && size >= 1, `${page.id} contains an object SVG with no measurable print size`);
    assert(
      visualAssetPlacementIssues(object.asset, { sizePx: size, mechanic }).length === 0,
      `${object.asset} is rendered at ${size}px, below its approved print size`,
    );
  }
}

/**
 * COUNT & CIRCLE is a mechanic-level contract: the same page renderer must
 * consume any native-ready object family without knowing that family's name.
 * Keep this check ordered from the first migrated family to the compatibility
 * family so a regression identifies the earliest broken contract.
 */
function assertNativeCountCircleFamily(asset: VisualAssetKey, noun: string, seed: number) {
  const spec: WorksheetSpec = {
    ...defaultSpec,
    level: "Kindergarten",
    difficulty: "Standard",
    pages: "2",
    activityType: "Counting",
    skill: "Counting",
    theme: "Ocean",
    prompt: `Count ${noun} from 1 to 5 and circle the correct number.`,
    paper: "A4",
    palette: "Soft Pastels",
    printing: "Color",
  };
  const project = buildValidWorksheetProject(spec, seed);
  const page = project.pages.find((candidate) => candidate.activity.kind === "count-circle");
  assert(page, `${asset} count-circle did not produce a count-circle page`);
  assert(
    page.activity.kind === "count-circle",
    `${asset} count-circle resolved to ${page.activity.kind}`,
  );
  assertProjectIsPrintable(project, spec);

  const markup = renderToStaticMarkup(
    createElement(PrintablePage, {
      project,
      page,
      index: project.pages.indexOf(page),
      mode: "premium",
    }),
  );
  assert(
    markup.includes('data-rendered-mechanic="count-circle"'),
    `${asset} count-circle is missing its generic mechanic marker`,
  );
  assert(
    markup.includes('data-count-circle-response-mode="circle"'),
    `${asset} count-circle is missing its circle response-mode marker`,
  );

  const objects = page.activity.rows.flatMap((row) => row.renderedObjects);
  assert(
    objects.length > 0 && (markup.match(/data-alfa-artwork="native-vector"/g) ?? []).length >= objects.length,
    `${asset} count-circle did not render every object through the native vector engine`,
  );
  for (const object of objects) {
    const objectMarkup = markup.slice(markup.indexOf(`data-rendered-object-id="${object.id}"`));
    assert(
      objectMarkup.includes('data-artwork-fallback="none"'),
      `${asset} object ${object.id} reports a fallback renderer`,
    );
  }

  assert(
    (markup.match(/data-count-circle-row-id="/g) ?? []).length === page.activity.rows.length,
    `${asset} count-circle lost one or more generic activity rows`,
  );
  for (const row of page.activity.rows) {
    assert(
      row.choices.filter((choice) => choice === row.correctAnswer).length === 1,
      `${asset} row ${row.id} does not have exactly one correct number choice`,
    );
    const rowStart = markup.indexOf(`data-count-circle-row-id="${row.id}"`);
    const nextRowStart = markup.indexOf('data-count-circle-row-id="', rowStart + 1);
    const rowMarkup = markup.slice(rowStart, nextRowStart >= 0 ? nextRowStart : markup.length);
    assert(
      (rowMarkup.match(/data-count-circle-choice=/g) ?? []).length === row.choices.length,
      `${asset} row ${row.id} printed the wrong number-choice count`,
    );
  }
}

function assertMatchingPage(page: WorksheetPageModel, markup: string) {
  assert(page.activity.kind === "match-pairs", `${page.id} did not produce a match-pairs activity`);
  const activity = page.activity;
  const items = [
    ...markup.matchAll(/data-match-item-id="([^"]+)" data-pair-id="([^"]+)" data-match-side="(left|right)"/g),
  ].map((match) => ({ id: match[1]!, pairId: match[2]!, side: match[3]! }));
  const left = items.filter((item) => item.side === "left");
  const right = items.filter((item) => item.side === "right");
  assert(left.length === activity.left.length && right.length === activity.right.length, `${page.id} lost matching cards in print markup`);
  assert(new Set(left.map((item) => item.pairId)).size === left.length, `${page.id} repeats a left pair id`);
  assert(new Set(right.map((item) => item.pairId)).size === right.length, `${page.id} repeats a right pair id`);
  assert(
    [...left.map((item) => item.pairId)].sort().join("|") === [...right.map((item) => item.pairId)].sort().join("|"),
    `${page.id} has mismatched left/right pair sets`,
  );
  assert(/data-rendered-mechanic="match-pairs"/.test(markup), `${page.id} is missing the matching renderer marker`);
  assert(/grid-template-columns:1fr 42mm 1fr/.test(markup), `${page.id} is missing its three-column matching layout`);

  for (const item of [...activity.left, ...activity.right]) {
    assert(item.label && markup.includes(item.label), `${page.id} is missing the label for ${item.id}`);
    const itemStart = markup.indexOf(`data-match-item-id="${item.id}"`);
    const nextItem = markup.indexOf('data-match-item-id="', itemStart + 1);
    const itemMarkup = markup.slice(itemStart, nextItem >= 0 ? nextItem : markup.length);
    assert(itemMarkup.includes("<svg"), `${page.id} is missing local artwork for matching card ${item.id}`);
    assert(
      visualAssetPlacementIssues(item.asset, { sizePx: 92, mechanic: "match-pairs" }).length === 0,
      `${item.asset} is not print-safe at its matching-card size`,
    );
  }
  if (activity.subtype === "identical-pairs") {
    for (const leftItem of activity.left) {
      const rightItem = activity.right.find((item) => item.pairId === leftItem.pairId);
      assert(rightItem?.asset === leftItem.asset, `${leftItem.id} is paired with a different asset`);
      const leftArtwork = (leftItem as { artwork?: { seed: number; variant: number } }).artwork;
      const rightArtwork = (rightItem as { artwork?: { seed: number; variant: number } } | undefined)?.artwork;
      assert(
        leftArtwork?.seed === rightArtwork?.seed && leftArtwork?.variant === rightArtwork?.variant,
        `${leftItem.id} and its matching partner do not share a deterministic visual variant`,
      );
    }
  }
}

function assertMemoryPage(page: WorksheetPageModel, markup: string) {
  assert(page.activity.kind === "memory-pairs", `${page.id} did not produce a memory-pairs activity`);
  const cards = page.activity.cards;
  for (const card of cards) {
    assert(
      markup.includes(`data-memory-card-id="${card.id}"`),
      `${page.id} is missing memory card ${card.id}`,
    );
    assert(card.artwork, `${card.id} is missing its stamped artwork recipe`);
    const partner = cards.find((candidate) => candidate.id !== card.id && candidate.pairId === card.pairId);
    assert(partner?.artwork, `${card.id} has a partner without a stamped artwork recipe`);
    assert(
      card.artwork.seed === partner.artwork.seed && card.artwork.variant === partner.artwork.variant,
      `${card.id} and ${partner.id} do not share the same memory-pair artwork variant`,
    );
  }
}

function assertMazePage(page: WorksheetPageModel, markup: string) {
  assert(page.activity.kind === "maze", `${page.id} did not produce a maze activity`);
  const maze = page.activity;
  assert(/data-rendered-mechanic="maze-route"/.test(markup), `${page.id} is missing the maze renderer marker`);
  assert(/data-maze-start="[^"]+"/.test(markup) && /data-maze-finish="[^"]+"/.test(markup), `${page.id} is missing START or FINISH metadata`);
  assert(Number(markup.match(/data-maze-solution-cells="(\d+)"/)?.[1]) === maze.solution.length, `${page.id} has a stale maze solution length`);
  assert(maze.solution.length >= 2, `${page.id} has no usable START-to-FINISH solution`);

  if (maze.decoration) {
    const decoration = `data-maze-decoration="${maze.decoration.asset}"`;
    const decorationIndex = markup.indexOf(decoration);
    const decorationSvgIndex = markup.indexOf("<svg", decorationIndex);
    const mazeSvgIndex = markup.indexOf("<svg", decorationSvgIndex + 1);
    assert(
      decorationIndex >= 0 && decorationSvgIndex > decorationIndex && mazeSvgIndex > decorationSvgIndex,
      `${page.id} maze decoration is not outside the SVG route graph`,
    );
    assert(
      visualAssetPlacementIssues(maze.decoration.asset, { sizePx: 58, mechanic: "maze-route", decoration: true }).length === 0,
      `${page.id} maze decoration is below its print minimum or unsafe`,
    );
    const decorationMarkup = markup.slice(decorationIndex, mazeSvgIndex);
    assert(/<svg[^>]*\bwidth="58"/.test(decorationMarkup), `${page.id} maze decoration is not rendered at its approved size`);
    assert(maze.decoration.artwork, `${page.id} maze decoration is missing its canonical artwork recipe`);
    assert(
      decorationMarkup.includes(`data-artwork-seed="${maze.decoration.artwork.seed}"`) &&
        decorationMarkup.includes(`data-artwork-engine="${maze.decoration.artwork.engineVersion}"`),
      `${page.id} maze decoration SVG does not consume its finalized artwork recipe`,
    );
  }
}

function assertPageMarkup(project: WorksheetProject, page: WorksheetPageModel, markup: string, paper: keyof typeof paperSizes) {
  const size = paperSizes[paper];
  const rootStyle = styleOfRoot(markup);
  assert(rootStyle.includes(`width:${size.w}mm`) && rootStyle.includes(`height:${size.h}mm`), `${page.id} has incorrect ${paper} page dimensions`);
  assert(rootStyle.includes("overflow:hidden"), `${page.id} does not clip overflow at the printable page boundary`);
  assert(!markup.includes("data-worksheet-runtime-error"), `${page.id} rendered a runtime-error banner`);
  assert(!markup.includes("data-worksheet-contract-blocked"), `${page.id} rendered a contract-blocked banner`);

  if (page.activity.kind === "count-match" || page.activity.kind === "count-circle") {
    for (const object of pageObjects(page)) {
      assert(markup.includes(`data-rendered-object-id="${object.id}"`), `${page.id} is missing rendered object ${object.id}`);
      const entry = visualAssetLibrary[object.asset];
      assert(entry?.printSafe, `${object.asset} is not marked print-safe`);
      const mechanic =
        "mechanic" in page.activity && typeof page.activity.mechanic === "string"
          ? page.activity.mechanic
          : undefined;
      assert(!visualAssetPlacementIssues(object.asset, { sizePx: entry.minPrintPx, mechanic }).length, `${object.asset} fails its own minimum print placement`);
    }
  }

  if (page.activity.kind === "count-match" || page.activity.kind === "count-circle") assertCountingPage(page, markup);
  if (page.activity.kind === "match-pairs") assertMatchingPage(page, markup);
  if (page.activity.kind === "memory-pairs") assertMemoryPage(page, markup);
  if (page.activity.kind === "maze") assertMazePage(page, markup);
}

function assertEveryLocalAssetRenders() {
  const palette = resolvePalette("Soft Pastel", "premium");
  const bwPalette = resolvePalette("Soft Pastel", "bw");
  for (const asset of visualAssetKeys as VisualAssetKey[]) {
    const entry = visualAssetLibrary[asset];
    for (const candidate of [palette, bwPalette]) {
      const markup = renderToStaticMarkup(
        createElement(InsectArt, {
          asset,
          palette: candidate,
          style: { strokeWeight: 1.7 },
          size: entry.minPrintPx,
        }),
      );
      const inner = markup.match(/<svg[^>]*>([\s\S]+)<\/svg>/)?.[1]?.trim();
      assert(inner && inner.length > 0, `${asset} produced an empty local SVG`);
      assert(markup.includes(`aria-label="${asset}"`), `${asset} did not retain its local renderer identity`);
    }
  }
}

function assertMigratedArtworkRendersAsItsOwnAsset() {
  const palette = resolvePalette("Soft Pastel", "premium");
  const style = { detailLevel: 0.6, expressionIntensity: 0.7, strokeWeight: 1.7 };
  for (const asset of visualAssetKeys.filter(isComposedNativeAsset) as VisualAssetKey[]) {
    const artwork = resolveArtworkRecipe({
      itemId: `test-${asset}`,
      asset,
      paletteId: palette.id,
      printMode: "premium",
      projectSeed: "native-asset-render-test",
    });
    const markup = renderToStaticMarkup(
      createElement(WorksheetArt, {
        object: { id: `test-${asset}`, asset, artwork },
        palette,
        style: style as never,
        size: 64,
      }),
    );
    assert(markup.includes('data-alfa-artwork="native-vector"'), `${asset} did not use its native vector renderer`);
    if (asset === "star") {
      assert(markup.includes("M50 12l10 26"), "star did not render its star primitive");
      assert(!markup.includes('cx="31" cy="73"'), "star incorrectly rendered vehicle wheels");
    }
    if (asset === "starfish") {
      assert(markup.includes('viewBox="0 0 100 100"'), "starfish did not preserve the native 100x100 viewBox");
      assert(markup.includes('data-artwork-fallback="none"'), "starfish still reports a fallback renderer");
      assert(markup.includes('data-artwork-semantic="sea-creature starfish"'), "starfish is missing its semantic token marker");
      assert(markup.includes('data-artwork-anchors="center:50,54;top:50,12'), "starfish is missing its canonical anchor points");
      assert(markup.includes("M50 12c4 0 6 9"), "starfish did not render its native organic silhouette");
    }
    if (asset === "seahorse") {
      assert(markup.includes('viewBox="0 0 100 100"'), "seahorse did not preserve the native 100x100 viewBox");
      assert(markup.includes('data-artwork-fallback="none"'), "seahorse still reports a fallback renderer");
      assert(markup.includes('data-artwork-semantic="sea-creature seahorse"'), "seahorse is missing its semantic token marker");
      assert(markup.includes('data-artwork-tokens="body:accentSoft fins:wing spots:accent highlights:wingAlt outline:ink"'), "seahorse is missing its semantic palette tokens");
      assert(markup.includes('data-artwork-anchors="center:51,53;crest:53,11;neck:47,31;head:68,25;snout:88,28;eye:73,25;fin:33,46;belly:42,67;tailEntry:47,78;tail:45,89;tailCurl:43,92"'), "seahorse is missing its curved-form anchor points");
      assert(markup.includes("M53 18C45 15 38 21 39 31"), "seahorse did not render its vertical Bézier body silhouette");
      assert(markup.includes("M47 77c-10 4-13 13-7 17"), "seahorse did not render its curled tail");
      assert(markup.includes("M61 22c6-5 16-5 21 1"), "seahorse did not render its profile head");
    }
    if (asset === "jellyfish") {
      assert(markup.includes('viewBox="0 0 100 100"'), "jellyfish did not preserve the native 100x100 viewBox");
      assert(markup.includes('data-artwork-fallback="none"'), "jellyfish still reports a fallback renderer");
      assert(markup.includes('data-artwork-semantic="sea-creature jellyfish"'), "jellyfish is missing its semantic token marker");
      assert(markup.includes('data-artwork-tokens="body:accentSoft tentacles:wing highlights:wingAlt outline:ink"'), "jellyfish is missing its semantic palette tokens");
      assert(markup.includes('data-artwork-tentacles="5"'), "jellyfish is missing its stable tentacle count");
      assert(markup.includes('tentacle1Start:28,48;tentacle1End:24,91'), "jellyfish is missing its tentacle anchors");
      assert(markup.includes("M18 39C18 23 31 13 50 13"), "jellyfish did not render its curved bell");
      assert(markup.includes("M28 48C24 56 30 62"), "jellyfish did not render its first wavy tentacle");
      assert(!markup.includes("linearGradient") && !markup.includes("radialGradient") && !markup.includes("fill-opacity") && !markup.includes("opacity="), "jellyfish relies on fragile transparency effects");
    }
    if (asset === "turtle") {
      assert(markup.includes('viewBox="0 0 100 100"'), "turtle did not preserve the native 100x100 viewBox");
      assert(markup.includes('data-artwork-fallback="none"'), "turtle still reports a fallback renderer");
      assert(markup.includes('data-artwork-semantic="animal turtle"'), "turtle is missing its semantic token marker");
      assert(markup.includes('data-artwork-tokens="shell:accentSoft shellPanels:wing body:accent legs:wingAlt highlights:surface outline:ink"'), "turtle is missing its semantic palette tokens");
      assert(markup.includes('data-artwork-legs="4"'), "turtle is missing its four-leg marker");
      assert(markup.includes('shellCenter:50,49;shellTop:50,30;shellFront:81,61;shellRear:19,61;shellRim:50,68'), "turtle is missing its shell anchors");
      assert(markup.includes("frontLeftLeg:63,74;frontRightLeg:75,73;rearLeftLeg:26,74;rearRightLeg:38,74"), "turtle is missing its four leg anchors");
      assert(markup.includes("head:87,59;eye:88,57") && markup.includes("tail:14,60"), "turtle is missing its head, eye, or tail anchors");
      assert(markup.includes("M18 61C18 43 31 30 50 30"), "turtle did not render its domed shell silhouette");
      assert(markup.includes("M50 32c-6 6-8 15-7 24"), "turtle did not render its central shell scute");
      assert(markup.includes("M29 61c-6 4-8 11-5 16"), "turtle did not render its rear leg");
      assert(markup.includes("M69 57c5-6 12-7 18-3"), "turtle did not render its head");
      assert(!markup.includes("<pattern") && !markup.includes("linearGradient") && !markup.includes("radialGradient") && !markup.includes("fill-opacity") && !markup.includes("opacity="), "turtle relies on fragile pattern or transparency effects");
    }
  }
}

function assertJellyfishAliasIntegrity() {
  const explicit = resolveVisualAssetMentions("Count jellyfish from 1 to 5.");
  assert(explicit.length === 1 && explicit[0]?.asset === "jellyfish", "jellyfish did not resolve as one explicit asset");
  assert(!explicit.some((mention) => mention.asset === "fish"), "jellyfish incorrectly resolved its embedded fish word");

  const standaloneJelly = resolveVisualAssetMentions("Count jelly from 1 to 5.");
  assert(!standaloneJelly.some((mention) => mention.asset === "jellyfish" || mention.asset === "fish"), "jelly incorrectly resolved to a sea-creature asset");
}

function assertTurtleAliasIntegrity() {
  const requests = ["turtle", "turtles", "tortoise", "tortoises", "tortue", "tortues"];
  for (const noun of requests) {
    const mentions = resolveVisualAssetMentions(`Count ${noun} from 1 to 5.`);
    assert(mentions.length === 1 && mentions[0]?.asset === "turtle", `${noun} did not resolve as one turtle asset`);
    assert(
      !mentions.some((mention) => ["fish", "starfish", "seahorse", "jellyfish", "shell"].includes(mention.asset)),
      `${noun} incorrectly resolved to a neighboring asset`,
    );
  }

  const compound = resolveVisualAssetMentions("Count tortoiseshells from 1 to 5.");
  assert(!compound.some((mention) => mention.asset === "turtle"), "tortoiseshell incorrectly resolved as turtle");
}

export function runPrintQualityTests() {
  let renderedPages = 0;
  let renderedVariants = 0;

  assertEveryLocalAssetRenders();
  assertMigratedArtworkRendersAsItsOwnAsset();
  assertJellyfishAliasIntegrity();
  assertTurtleAliasIntegrity();
  assertNativeCountCircleFamily("fish", "fish", 701);
  assertNativeCountCircleFamily("starfish", "starfish", 702);
  assertNativeCountCircleFamily("seahorse", "seahorses", 703);
  assertNativeCountCircleFamily("jellyfish", "jellyfish", 704);
  assertNativeCountCircleFamily("turtle", "turtle", 705);
  assertPdfPaperGeometry();
  for (const scenario of scenarios) {
    for (const paper of papers) {
      const spec = specFor(scenario, paper);
      const project = buildValidWorksheetProject(spec, 17 + renderedPages);
      assertProjectIsPrintable(project, spec);
      assertCanonicalArtwork(project);
      assert(project.meta.paper === paper, `${scenario.id} did not preserve requested paper ${paper}`);
      assert(
        scenario.activityType === "Counting"
          ? localIllustrationAssetsForSpec(spec, "count-match").length > 0
          : true,
        `${scenario.id} has no local artwork allocation`,
      );

      for (const mode of modes) {
        for (const [index, page] of project.pages.entries()) {
          const markup = renderToStaticMarkup(
            createElement(PrintablePage, { project, page, index, mode }),
          );
          assertPageMarkup(project, page, markup, paper);
          const answerMarkup = renderToStaticMarkup(
            createElement(PrintablePage, { project, page, index, mode, showAnswers: true }),
          );
          assert(!answerMarkup.includes("data-worksheet-runtime-error"), `${page.id} answer print rendered a runtime-error banner`);
          if (page.activity.kind === "maze") {
            assert(answerMarkup.includes("<polyline"), `${page.id} answer print is missing the verified maze route`);
          }
          renderedPages++;
        }
        renderedVariants++;
      }
    }
  }

  assert(renderedPages === scenarios.length * papers.length * modes.length, "not every paper/mode worksheet variant was rendered");
  assert(renderedVariants === scenarios.length * papers.length * modes.length, "not every paper/mode variant was exercised");
  console.log(
    `[print-quality] passed ${renderedPages} pages across ${scenarios.length} Counting/Matching/Maze scenarios, ${papers.length} paper sizes, and ${modes.length} print modes`,
  );
}
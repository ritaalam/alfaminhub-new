import {
  themeTopics,
  visualAssetKeys,
  visualObjects,
  type VisualAssetKey,
} from "./semantic-topics";
import { resolveAgeTokens } from "./age-tokens";
import { resolveSubject } from "./worksheet-subjects";
import type { WorksheetSpec } from "./creator-options";
import type { WorksheetMechanicId } from "./worksheet-model";

export const VISUAL_ASSET_LIBRARY_VERSION = "alfa-local-visual-assets-v3";

export type VisualAssetKind =
  | "shape"
  | "animal"
  | "insect"
  | "food"
  | "nature"
  | "vehicle"
  | "school"
  | "space"
  | "weather"
  | "life-cycle"
  | "everyday";

export type VisualAgeBand = "early-years" | "preschool" | "early-primary";
export type VisualAssetComplexity = "simple" | "detailed";
export type VisualAssetStyleFamily = "alfa-soft-pastel-line";

export type VisualAssetLibraryEntry = {
  id: VisualAssetKey;
  canonicalLabel: string;
  labels: readonly string[];
  aliases: readonly string[];
  renderer: VisualAssetKey;
  kind: VisualAssetKind;
  topicIds: readonly string[];
  ageBands: readonly VisualAgeBand[];
  supportedMechanics: readonly WorksheetMechanicId[];
  /** Keeps every printable illustration within one coherent local art family. */
  styleFamily: VisualAssetStyleFamily;
  /** Used when selecting uncluttered visual pools for the youngest learners. */
  complexity: VisualAssetComplexity;
  /** May be used as a small non-counted accent outside a learning area. */
  decorationSafe: boolean;
  /** Minimum visible edge for a clear printed picture at 96dpi. */
  minPrintPx: number;
  /** The fallback is always local and renderer-backed; it never makes a network request. */
  fallbackAsset: VisualAssetKey;
  printSafe: true;
  license: "alfa-local";
};

export type ResolvedVisualAssetMention = {
  asset: VisualAssetKey;
  matchedText: string;
  start: number;
  end: number;
  confidence: "exact" | "alias";
};

export type WorksheetAssetPlan = {
  version: typeof VISUAL_ASSET_LIBRARY_VERSION;
  mechanic: string;
  ageBand: VisualAgeBand;
  /** Assets specifically named by the teacher or page contract. */
  requestedAssets: VisualAssetKey[];
  /** Age/mechanic-safe candidates before per-page builders allocate them. */
  candidateAssets: VisualAssetKey[];
  /** Deterministic candidate order used by local builders and composers. */
  selectedAssets: VisualAssetKey[];
  /** True only when no age/mechanic-safe candidate was available. */
  fallbackUsed: boolean;
};

export type WorksheetAssetPlanOptions = {
  seed?: number;
  requiredAssets?: readonly VisualAssetKey[];
  excludedAssets?: readonly VisualAssetKey[];
};

const curatedAliases: Partial<Record<VisualAssetKey, readonly string[]>> = {
  ball: ["yarn ball"],
  fishBowl: ["fish bowl", "fishbowl"],
  closedBook: ["closed book"],
  squareTile: ["square tile"],
  triangularRoadSign: ["triangular road sign", "road sign"],
};

const complexEarlyVisuals = new Set<VisualAssetKey>([
  "astronaut",
  "satellite",
  "seahorse",
  "octopus",
  "jellyfish",
  "dragonfly",
  "chrysalis",
  "fishBowl",
  "triangularRoadSign",
]);

const decorationUnsafeVisuals = new Set<VisualAssetKey>([
  "triangle",
  "rectangle",
  "square",
  "circle",
  "triangularRoadSign",
  "fishBowl",
  "window",
]);

const kindOverrides: Partial<Record<VisualAssetKey, VisualAssetKind>> = {
  circle: "shape",
  square: "shape",
  triangle: "shape",
  rectangle: "shape",
  ladybug: "insect",
  bee: "insect",
  butterfly: "insect",
  ant: "insect",
  dragonfly: "insect",
  beetle: "insect",
  caterpillar: "insect",
  chrysalis: "life-cycle",
  tadpole: "life-cycle",
  chick: "life-cycle",
  seed: "life-cycle",
  sprout: "life-cycle",
  carrot: "food",
  apple: "food",
  egg: "food",
  banana: "food",
  orange: "food",
  strawberry: "food",
  grapes: "food",
  tree: "nature",
  flower: "nature",
  leaf: "nature",
  mushroom: "nature",
  acorn: "nature",
  car: "vehicle",
  bus: "vehicle",
  train: "vehicle",
  airplane: "vehicle",
  bicycle: "vehicle",
  boat: "vehicle",
  pencil: "school",
  backpack: "school",
  ruler: "school",
  book: "school",
  closedBook: "school",
  rocket: "space",
  planet: "space",
  moon: "space",
  astronaut: "space",
  comet: "space",
  satellite: "space",
  alien: "space",
  star: "space",
  cloud: "weather",
  sun: "weather",
  raindrop: "weather",
  snowflake: "weather",
  umbrella: "weather",
};

const visualMechanics: readonly WorksheetMechanicId[] = [
  "count-match",
  "count-circle",
  "find-target",
  "match-pairs",
  "trace-draw",
  "compare-quantity",
  "compare-size",
  "same-different",
  "beginning-sound",
  "beginning-sound-discrimination",
  "pattern-complete",
  "sequence-order",
  "find-and-count",
  "sort-attribute",
  "picture-letter-match",
  "word-initial-complete",
  "memory-pairs",
  "cut-create-build",
  "cut-create-scene",
  "cut-create-count",
  "maze-route",
];

function unique(items: string[]): string[] {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))];
}

function uniqueAssets(items: readonly VisualAssetKey[]): VisualAssetKey[] {
  return [...new Set(items)];
}

function isWordBoundary(value: string, index: number): boolean {
  const character = value[index];
  return !character || !/[\p{L}\p{N}]/u.test(character);
}

function kindFor(asset: VisualAssetKey): VisualAssetKind {
  if (kindOverrides[asset]) return kindOverrides[asset];
  if (themeTopics.some((topic) => topic.id === "insects" && topic.objects.includes(asset))) {
    return "insect";
  }
  if (themeTopics.some((topic) => ["ocean", "farm", "jungle", "animals"].includes(topic.id) && topic.objects.includes(asset))) {
    return "animal";
  }
  return "everyday";
}

function topicIdsFor(asset: VisualAssetKey): string[] {
  const topics = themeTopics.filter((topic) => topic.objects.includes(asset)).map((topic) => topic.id);
  return topics.length ? topics : ["everyday"];
}

function ageBandsFor(asset: VisualAssetKey): VisualAgeBand[] {
  return complexEarlyVisuals.has(asset)
    ? ["preschool", "early-primary"]
    : ["early-years", "preschool", "early-primary"];
}

function aliasesFor(asset: VisualAssetKey): string[] {
  const object = visualObjects[asset];
  return unique([
    ...(curatedAliases[asset] ?? []),
    object.singular,
    object.plural,
    object.label,
  ]);
}

/**
 * One local, renderer-backed manifest. The semantic topic registry remains the
 * source for canonical labels; this layer adds resolver metadata without
 * copying or reauthoring the actual artwork.
 */
export const visualAssetLibrary: Readonly<Record<VisualAssetKey, VisualAssetLibraryEntry>> =
  Object.freeze(
    Object.fromEntries(
      visualAssetKeys.map((asset) => {
        const object = visualObjects[asset];
        const aliases = aliasesFor(asset);
        return [
          asset,
          Object.freeze({
            id: asset,
            canonicalLabel: object.singular,
            labels: Object.freeze(unique([object.singular, object.plural, object.label])),
            aliases: Object.freeze(aliases),
            renderer: asset,
            kind: kindFor(asset),
            topicIds: Object.freeze(topicIdsFor(asset)),
            ageBands: Object.freeze(ageBandsFor(asset)),
            supportedMechanics: Object.freeze([...visualMechanics]),
            styleFamily: "alfa-soft-pastel-line" as const,
            complexity: complexEarlyVisuals.has(asset) ? "detailed" as const : "simple" as const,
            decorationSafe: !decorationUnsafeVisuals.has(asset),
            minPrintPx: complexEarlyVisuals.has(asset) ? 58 : 46,
            fallbackAsset: asset,
            printSafe: true as const,
            license: "alfa-local" as const,
          }),
        ];
      }),
    ) as Record<VisualAssetKey, VisualAssetLibraryEntry>,
  );

export function isVisualAssetKey(value: unknown): value is VisualAssetKey {
  return typeof value === "string" && value in visualAssetLibrary;
}

export function visualAgeBandForLevel(level: string): VisualAgeBand {
  const ageId = resolveAgeTokens(level).id;
  if (ageId === "toddler-2-3" || ageId === "nursery-3-4") return "early-years";
  if (ageId === "preschool-4-5" || ageId === "preschool" || ageId === "pre-k" || ageId === "kindergarten") {
    return "preschool";
  }
  return "early-primary";
}

export function isAssetSuitableFor(
  asset: VisualAssetKey,
  level: string,
  mechanic?: string,
): boolean {
  const entry = visualAssetLibrary[asset];
  const ageEligible = entry.ageBands.includes(visualAgeBandForLevel(level));
  const mechanicEligible =
    !mechanic || !visualMechanics.includes(mechanic as WorksheetMechanicId) || entry.supportedMechanics.includes(mechanic as WorksheetMechanicId);
  return entry.printSafe && ageEligible && mechanicEligible;
}

export function localAssetsForTopic(
  topicId: string,
  options: { level: string; mechanic?: string; excludeAssets?: readonly VisualAssetKey[] },
): VisualAssetKey[] {
  const excluded = new Set(options.excludeAssets ?? []);
  return visualAssetKeys.filter(
    (asset) =>
      visualAssetLibrary[asset].topicIds.includes(topicId) &&
      !excluded.has(asset) &&
      isAssetSuitableFor(asset, options.level, options.mechanic),
  );
}

/**
 * A smaller, safe pool for non-counted accents such as a maze's start/finish
 * labels. These remain outside the learning surface and never alter quantities
 * or the child-facing answer.
 */
export function localDecorationAssetsForTopic(
  topicId: string,
  options: { level: string; mechanic?: string; excludeAssets?: readonly VisualAssetKey[] },
): VisualAssetKey[] {
  return localAssetsForTopic(topicId, options).filter((asset) => visualAssetLibrary[asset].decorationSafe);
}

function hash(value: string): number {
  let result = 2166136261;
  for (let index = 0; index < value.length; index++) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function rotate<T>(items: readonly T[], offset: number): T[] {
  if (items.length < 2) return [...items];
  const start = Math.abs(offset) % items.length;
  return [...items.slice(start), ...items.slice(0, start)];
}

/**
 * Builds one deterministic, local-only allocation contract before individual
 * page builders choose rows, groups, or visual roles. Explicit teacher-named
 * assets are never age-filtered away; age filtering only narrows open theme
 * pools. No provider lookup is possible on this path.
 */
export function createWorksheetAssetPlan(
  spec: WorksheetSpec,
  mechanic?: WorksheetMechanicId | string,
  options: WorksheetAssetPlanOptions = {},
): WorksheetAssetPlan {
  const subject = resolveSubject(spec);
  const requestedAssets = uniqueAssets([...(options.requiredAssets ?? []), ...(subject.locked ? subject.assets : [])]);
  const baseAssets = uniqueAssets(options.requiredAssets?.length ? options.requiredAssets : subject.assets);
  const excluded = new Set(options.excludedAssets ?? []);
  const explicit = requestedAssets.length > 0;
  const eligible = baseAssets.filter(
    (asset) => explicit || isAssetSuitableFor(asset, spec.level, mechanic),
  );
  const unexcluded = eligible.filter((asset) => !excluded.has(asset));
  const candidates = unexcluded.length ? unexcluded : eligible.length ? eligible : baseAssets;
  const fallbackAsset = visualAssetKeys.find((asset) => visualAssetLibrary[asset].printSafe) ?? "circle";
  const safeCandidates = candidates.length ? candidates : [fallbackAsset];
  const seed = options.seed ?? hash(
    [spec.prompt, spec.theme, spec.level, spec.activityType, mechanic ?? ""].join("|").toLocaleLowerCase(),
  );
  const selectedAssets = explicit ? [...safeCandidates] : rotate(safeCandidates, seed);

  return {
    version: VISUAL_ASSET_LIBRARY_VERSION,
    mechanic: mechanic ?? spec.activityMechanic ?? spec.mechanicId ?? spec.activityType ?? "worksheet",
    ageBand: visualAgeBandForLevel(spec.level),
    requestedAssets,
    candidateAssets: safeCandidates,
    selectedAssets,
    fallbackUsed: eligible.length === 0,
  };
}

/**
 * A render-time guard for malformed persisted data. It never creates, fetches,
 * or substitutes remote imagery; unknown values reduce to a simple local shape.
 */
export function safeVisualAssetFallback(value: unknown): VisualAssetKey {
  return isVisualAssetKey(value) ? visualAssetLibrary[value].fallbackAsset : "circle";
}

export function visualAssetPrintIssues(asset: VisualAssetKey, sizePx: number): string[] {
  const entry = visualAssetLibrary[asset];
  if (!entry.printSafe) return [`${asset} is not approved for print.`];
  if (sizePx < entry.minPrintPx) {
    return [`${asset} is smaller than its ${entry.minPrintPx}px minimum print size.`];
  }
  return [];
}

/** Central pre-render contract for every local illustration placement. */
export function visualAssetPlacementIssues(
  asset: VisualAssetKey,
  options: { sizePx: number; mechanic?: string; decoration?: boolean },
): string[] {
  const entry = visualAssetLibrary[asset];
  const issues = visualAssetPrintIssues(asset, options.sizePx);
  if (
    options.mechanic &&
    visualMechanics.includes(options.mechanic as WorksheetMechanicId) &&
    !entry.supportedMechanics.includes(options.mechanic as WorksheetMechanicId)
  ) {
    issues.push(`${asset} is not approved for ${options.mechanic}.`);
  }
  if (options.decoration && !entry.decorationSafe) {
    issues.push(`${asset} is not approved as non-counted decoration.`);
  }
  return issues;
}

function directAliasMentions(text: string): ResolvedVisualAssetMention[] {
  const normalizedText = text.toLocaleLowerCase();
  return visualAssetKeys.flatMap((asset) =>
    visualAssetLibrary[asset].aliases.flatMap((alias) => {
      const normalizedAlias = alias.toLocaleLowerCase();
      const start = normalizedText.indexOf(normalizedAlias);
      if (start < 0 || !isWordBoundary(normalizedText, start - 1) || !isWordBoundary(normalizedText, start + normalizedAlias.length)) {
        return [];
      }
      return [
        {
          asset,
          matchedText: text.slice(start, start + alias.length),
          start,
          end: start + alias.length,
          confidence: "exact" as const,
        },
      ];
    }),
  );
}

function regexAliasMentions(text: string): ResolvedVisualAssetMention[] {
  return visualAssetKeys.flatMap((asset) => {
    const match = visualObjects[asset].alias.exec(text);
    if (match?.index === undefined || !match[0]) return [];
    return [
      {
        asset,
        matchedText: match[0],
        start: match.index,
        end: match.index + match[0].length,
        confidence: "alias" as const,
      },
    ];
  });
}

/**
 * Finds local assets in teacher wording. Longest overlapping phrases win, so
 * "fish bowl" resolves to one fishBowl asset rather than fish plus a second
 * generic object. Unknown words remain unresolved instead of silently changing
 * the teacher's content.
 */
export function resolveVisualAssetMentions(text: string): ResolvedVisualAssetMention[] {
  const candidates = [...directAliasMentions(text), ...regexAliasMentions(text)].sort(
    (a, b) => a.start - b.start || b.end - b.start - (a.end - a.start),
  );
  const seen = new Set<string>();
  return candidates.filter((candidate, index) => {
    const identity = `${candidate.asset}:${candidate.start}:${candidate.end}`;
    if (seen.has(identity)) return false;
    seen.add(identity);
    return !candidates
      .slice(0, index)
      .some(
        (accepted) =>
          accepted.start < candidate.end &&
          candidate.start < accepted.end &&
          accepted.end - accepted.start >= candidate.end - candidate.start,
      );
  });
}

export function visualAssetLabel(
  mention: Pick<ResolvedVisualAssetMention, "asset" | "matchedText">,
): string {
  if (mention.asset === "ball" && /\byarn\s+ball\b/i.test(mention.matchedText)) {
    return "yarn ball";
  }
  return visualAssetLibrary[mention.asset].canonicalLabel;
}
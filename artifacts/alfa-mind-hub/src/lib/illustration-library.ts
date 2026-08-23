import type { WorksheetSpec } from "./creator-options";
import { resolveSubject } from "./worksheet-subjects";
import type { VisualAssetKey, WorksheetMechanicId } from "./worksheet-model";
import {
  createWorksheetAssetPlan,
  localDecorationAssetsForTopic,
  localAssetsForTopic,
  visualAssetLibrary,
  type WorksheetAssetPlan,
  VISUAL_ASSET_LIBRARY_VERSION,
} from "./visual-asset-library";

/**
 * Local-first illustration selection.
 *
 * Every asset in this catalogue is Alfa-authored, palette-aware line art. The
 * registry deliberately stores semantic groups rather than remote URLs so a
 * worksheet remains printable offline and never depends on a third-party
 * asset at render or export time.
 */
type IllustrationCollection = {
  id: string;
  topicId: string;
  terms: RegExp;
  excludeAssets?: VisualAssetKey[];
  searchTerms: string[];
};

const collections: IllustrationCollection[] = [
  {
    id: "sea-animals",
    topicId: "ocean",
    terms: /\b(?:sea|ocean|marine|underwater|beach)\b|sea creatures?/i,
    excludeAssets: ["boat"],
    searchTerms: ["friendly sea animals", "ocean animal illustration"],
  },
  {
    id: "farm-animals",
    topicId: "farm",
    terms: /\bfarm\s+animals?\b|barnyard/i,
    excludeAssets: ["tractor", "carrot", "apple", "egg"],
    searchTerms: ["friendly farm animals", "barnyard animal illustration"],
  },
  {
    id: "space",
    topicId: "space",
    terms: /\b(?:space|galaxy|solar system|astronomy|outer space)\b/i,
    searchTerms: ["friendly space objects", "children space illustration"],
  },
  {
    id: "dinosaurs",
    topicId: "dinosaurs",
    terms: /\bdinosaurs?|prehistoric|fossils?\b/i,
    searchTerms: ["friendly dinosaur", "children dinosaur illustration"],
  },
  {
    id: "school",
    topicId: "school",
    terms: /\b(?:school|classroom|back to school|stationery)\b/i,
    excludeAssets: ["leaf"],
    searchTerms: ["school supplies", "classroom object illustration"],
  },
  {
    id: "fruit",
    topicId: "food",
    terms: /\b(?:fruits?|berries|healthy snack)\b/i,
    excludeAssets: ["carrot", "egg", "mushroom"],
    searchTerms: ["friendly fruit", "children fruit illustration"],
  },
  {
    id: "weather",
    topicId: "weather",
    terms: /\b(?:weather|rainy day|climate)\b/i,
    searchTerms: ["friendly weather icons", "children weather illustration"],
  },
  {
    id: "animals",
    topicId: "animals",
    terms: /\b(?:animals?|pets?|zoo|wildlife)\b/i,
    searchTerms: ["friendly animal pictures", "children animal illustration"],
  },
  {
    id: "nature",
    topicId: "nature",
    terms: /\b(?:nature|garden|forest|woodland|flowers?)\b/i,
    searchTerms: ["gentle nature pictures", "children garden illustration"],
  },
  {
    id: "vehicles",
    topicId: "transportation",
    terms: /\b(?:vehicles?|transport(?:ation)?|traffic|travel)\b/i,
    searchTerms: ["friendly vehicle pictures", "children transport illustration"],
  },
];

const maxSelectionCacheEntries = 64;
const maxPersistedSelectionEntries = 32;
const selectionCacheTtlMs = 7 * 24 * 60 * 60 * 1000;
const selectionCacheStorageKey = `alfa:local-illustration-selection:${VISUAL_ASSET_LIBRARY_VERSION}`;

function selectionCacheKey(
  spec: WorksheetSpec,
  mechanic: WorksheetMechanicId | string | undefined,
  subjectAssets: readonly VisualAssetKey[],
  seed?: number,
): string {
  return [
    VISUAL_ASSET_LIBRARY_VERSION,
    JSON.stringify({
      prompt: clean(spec.prompt),
      theme: clean(spec.theme),
      level: clean(spec.level),
      activityType: clean(spec.activityType),
      activityMechanic: clean(spec.activityMechanic),
      mechanicId: clean(spec.mechanicId),
      printing: clean(spec.printing),
      mechanic: clean(mechanic),
      subjectAssets,
      seed: seed ?? null,
    }),
  ].join(":");
}

export type IllustrationSearchIntent = {
  topic: string;
  level: string;
  mechanic: string;
  printStyle: string;
  terms: string[];
  cacheKey: string;
  /**
   * External results are only worth requesting when the local catalog cannot
   * express a specific teacher-named visual. This flag is advisory; it never
   * triggers a request on its own.
   */
  externalValueLikely: boolean;
};

export type LocalIllustrationSelection = {
  assets: VisualAssetKey[];
  assetPlan: WorksheetAssetPlan;
  intent: IllustrationSearchIntent;
  source: "alfa-local";
};

export type LocalIllustrationSelectionOptions = {
  /** Page-specific seed rotates only open theme pools; locked assets stay exact. */
  seed?: number;
};

const selectionCache = new Map<string, { savedAt: number; selection: LocalIllustrationSelection }>();
let selectionCacheHydrated = false;
let selectionCacheHits = 0;

function browserStorage(): Storage | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function persistSelectionCache() {
  const storage = browserStorage();
  if (!storage) return;
  try {
    const entries = [...selectionCache.entries()]
      .slice(-maxPersistedSelectionEntries)
      .map(([key, value]) => ({ key, ...value }));
    storage.setItem(selectionCacheStorageKey, JSON.stringify({ version: VISUAL_ASSET_LIBRARY_VERSION, entries }));
  } catch {
    // Storage is an optimisation only; selection remains fully local and valid.
  }
}

function hydrateSelectionCache() {
  if (selectionCacheHydrated) return;
  selectionCacheHydrated = true;
  const storage = browserStorage();
  if (!storage) return;
  try {
    const parsed = JSON.parse(storage.getItem(selectionCacheStorageKey) ?? "null") as {
      version?: string;
      entries?: Array<{ key?: string; savedAt?: number; selection?: LocalIllustrationSelection }>;
    } | null;
    if (parsed?.version !== VISUAL_ASSET_LIBRARY_VERSION || !Array.isArray(parsed.entries)) return;
    const now = Date.now();
    for (const entry of parsed.entries) {
      if (
        typeof entry.key !== "string" ||
        typeof entry.savedAt !== "number" ||
        now - entry.savedAt > selectionCacheTtlMs ||
        !entry.selection?.assets?.every((asset) => typeof asset === "string")
      ) {
        continue;
      }
      selectionCache.set(entry.key, { savedAt: entry.savedAt, selection: entry.selection });
    }
  } catch {
    // Ignore a malformed or stale browser cache rather than blocking a worksheet.
  }
}

function cacheSelection(key: string, selection: LocalIllustrationSelection): LocalIllustrationSelection {
  selectionCache.delete(key);
  selectionCache.set(key, { savedAt: Date.now(), selection });
  while (selectionCache.size > maxSelectionCacheEntries) {
    const oldest = selectionCache.keys().next().value;
    if (typeof oldest !== "string") break;
    selectionCache.delete(oldest);
  }
  persistSelectionCache();
  return selection;
}

export function clearLocalIllustrationCache(): void {
  selectionCache.clear();
  selectionCacheHits = 0;
  browserStorage()?.removeItem(selectionCacheStorageKey);
}

export function localIllustrationCacheStats(): { size: number; hits: number } {
  return { size: selectionCache.size, hits: selectionCacheHits };
}

function unique<T>(items: T[]) {
  return [...new Set(items)];
}

function clean(value: string | undefined) {
  return (value ?? "").trim().replace(/\s+/g, " ");
}

function normalize(value: string | undefined) {
  return clean(value).toLocaleLowerCase();
}

function collectionFor(text: string, topicId?: string) {
  return collections.find((collection) => collection.terms.test(text)) ??
    collections.find((collection) => collection.topicId === topicId);
}

function assetsForCollection(
  collection: IllustrationCollection | undefined,
  spec: WorksheetSpec,
  mechanic?: WorksheetMechanicId | string,
): VisualAssetKey[] {
  if (!collection) return [];
  return localAssetsForTopic(collection.topicId, {
    level: spec.level,
    mechanic,
    excludeAssets: collection.excludeAssets,
  });
}

/**
 * Forms a stable, provider-agnostic search request. The same teaching intent
 * therefore reuses cache entries rather than spending a remote lookup for
 * harmless text differences such as casing or extra whitespace.
 */
export function illustrationSearchIntent(
  spec: WorksheetSpec,
  mechanic?: WorksheetMechanicId | string,
): IllustrationSearchIntent {
  const subject = resolveSubject(spec);
  const text = clean(`${spec.prompt} ${spec.theme}`);
  const collection = collectionFor(text, subject.topicId);
  const topic = collection?.id ?? subject.topicId ?? normalize(subject.label) ?? "general";
  const activeMechanic = mechanic ?? spec.activityMechanic ?? spec.mechanicId ?? spec.activityType ?? "worksheet";
  const printStyle = spec.printing || "standard-print";
  const terms = unique([
    ...(collection?.searchTerms ?? []),
    subject.locked ? `${subject.singular} illustration` : "",
    `${topic} ${activeMechanic} illustration`,
  ].map(clean).filter(Boolean));
  const cacheKey = [VISUAL_ASSET_LIBRARY_VERSION, topic, normalize(spec.level), normalize(activeMechanic), normalize(printStyle)]
    .map((part) => part.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""))
    .join(":");

  return {
    topic,
    level: spec.level,
    mechanic: activeMechanic,
    printStyle,
    terms,
    cacheKey,
    externalValueLikely: subject.assets.length === 1 && !subject.topicId && !subject.locked,
  };
}

/**
 * Selects illustrations which are semantically compatible with the teaching
 * prompt. Explicitly named objects remain locked; theme prompts receive a
 * focused vocabulary (for example, sea animals never rotate through boats).
 */
export function selectLocalIllustrations(
  spec: WorksheetSpec,
  mechanic?: WorksheetMechanicId | string,
  options: LocalIllustrationSelectionOptions = {},
): LocalIllustrationSelection {
  hydrateSelectionCache();
  const subject = resolveSubject(spec);
  const intent = illustrationSearchIntent(spec, mechanic);
  const cacheKey = selectionCacheKey(spec, mechanic, subject.assets, options.seed);
  const cached = selectionCache.get(cacheKey);
  if (cached) {
    selectionCacheHits += 1;
    selectionCache.delete(cacheKey);
    selectionCache.set(cacheKey, cached);
    persistSelectionCache();
    return cached.selection;
  }
  const basePlan = createWorksheetAssetPlan(spec, mechanic, { seed: options.seed });
  let selection: LocalIllustrationSelection;
  if (subject.locked) {
    selection = {
      assets: basePlan.selectedAssets,
      assetPlan: basePlan,
      intent,
      source: "alfa-local",
    };
  } else {
    const collection = collectionFor(clean(`${spec.prompt} ${spec.theme}`), subject.topicId);
    const focused = assetsForCollection(collection, spec, mechanic).filter((asset) =>
      subject.assets.includes(asset),
    );
    const assets = basePlan.selectedAssets.filter((asset) => focused.includes(asset));
    const selectedAssets = assets.length ? assets : basePlan.selectedAssets;
    selection = {
      assets: selectedAssets,
      assetPlan: {
        ...basePlan,
        candidateAssets: focused.length ? focused : basePlan.candidateAssets,
        selectedAssets,
      },
      intent,
      source: "alfa-local",
    };
  }
  return cacheSelection(cacheKey, selection);
}

/** Convenience for existing deterministic worksheet builders. */
export function localIllustrationAssetsForSpec(
  spec: WorksheetSpec,
  mechanic?: WorksheetMechanicId | string,
  options?: LocalIllustrationSelectionOptions,
): VisualAssetKey[] {
  return selectLocalIllustrations(spec, mechanic, options).assets;
}

/** Theme-safe accents for non-counted maze labels, always local and print-safe. */
export function localMazeDecorationAssetsForSpec(
  spec: WorksheetSpec,
  mechanic: WorksheetMechanicId | string = "maze-route",
): VisualAssetKey[] {
  const subject = resolveSubject(spec);
  if (subject.locked) {
    return subject.assets.filter((asset) => visualAssetLibrary[asset]?.decorationSafe);
  }
  const collection = collectionFor(clean(`${spec.prompt} ${spec.theme}`), subject.topicId);
  return localDecorationAssetsForTopic(collection?.topicId ?? subject.topicId ?? "everyday", {
    level: spec.level,
    mechanic,
  }).filter((asset) => subject.assets.includes(asset));
}
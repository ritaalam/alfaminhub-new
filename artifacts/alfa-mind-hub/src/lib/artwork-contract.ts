import type { VisualAssetKey } from "./semantic-topics";
import type { PrintModeId } from "./visual-directions";

/**
 * These versions travel with every saved worksheet. Artwork is therefore
 * reproducible instead of silently changing when a renderer improves.
 */
export const ALFA_VECTOR_ENGINE_VERSION = "alfa-vector-engine-v1";
export const ALFA_ASSET_FAMILY_VERSION = "alfa-native-families-v1";

export type AlfaArtworkFamily =
  | "character"
  | "insect"
  | "animal"
  | "food"
  | "nature"
  | "vehicle"
  | "school"
  | "space"
  | "shape"
  | "everyday";

export type ArtworkFallbackCategory = "none" | "native-family" | "native-generic";

export type ArtworkCapabilities = {
  composable: true;
  localOnly: true;
  deterministic: true;
  printModes: readonly PrintModeId[];
  supportsInkSaving: true;
  supportsMonochrome: true;
};

export type CanonicalArtworkManifest = {
  itemId: string;
  asset: VisualAssetKey;
  family: AlfaArtworkFamily;
  variant: number;
  seed: number;
  paletteId: string;
  printMode: PrintModeId;
  engineVersion: typeof ALFA_VECTOR_ENGINE_VERSION;
  assetFamilyVersion: typeof ALFA_ASSET_FAMILY_VERSION;
  fallbackCategory: ArtworkFallbackCategory;
  capabilities: ArtworkCapabilities;
};

export type WorksheetArtworkManifest = {
  engineVersion: typeof ALFA_VECTOR_ENGINE_VERSION;
  assetFamilyVersion: typeof ALFA_ASSET_FAMILY_VERSION;
  items: Readonly<Record<string, CanonicalArtworkManifest>>;
};

export const alfaArtworkCapabilities: ArtworkCapabilities = Object.freeze({
  composable: true,
  localOnly: true,
  deterministic: true,
  printModes: ["premium", "soft", "ink", "bw"] as const,
  supportsInkSaving: true,
  supportsMonochrome: true,
});

const namedFamilies: Partial<Record<VisualAssetKey, AlfaArtworkFamily>> = {
  bee: "insect",
  butterfly: "insect",
  ladybug: "insect",
  ant: "insect",
  dragonfly: "insect",
  caterpillar: "insect",
  apple: "food",
  banana: "food",
  orange: "food",
  strawberry: "food",
  grapes: "food",
  carrot: "food",
  flower: "nature",
  tree: "nature",
  leaf: "nature",
  car: "vehicle",
  bicycle: "vehicle",
  boat: "vehicle",
  airplane: "vehicle",
  rocket: "space",
  astronaut: "space",
  star: "space",
  pencil: "school",
  book: "school",
  backpack: "school",
  circle: "shape",
  square: "shape",
  triangle: "shape",
  rectangle: "shape",
};

/**
 * Assets migrated to the composable renderer. Keep this deliberately narrow:
 * an asset stays on its proven local SVG until it has a family-specific recipe,
 * rather than being degraded into a generic substitute.
 */
const composedNativeAssets = new Set<VisualAssetKey>([
  "bee",
  "butterfly",
  "ladybug",
  "fish",
  "starfish",
  "seahorse",
  "jellyfish",
  "turtle",
  "flower",
  "tree",
  "car",
  "rocket",
  "apple",
  "star",
]);

function hash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function artworkFamilyFor(asset: VisualAssetKey, hasCharacter = false): AlfaArtworkFamily {
  if (hasCharacter) return "character";
  if (namedFamilies[asset]) return namedFamilies[asset]!;
  if (/(fish|whale|octopus|jellyfish|seahorse|turtle|frog|bird|cat|dog|dinosaur)/.test(asset)) {
    return "animal";
  }
  if (/(book|pen|pencil|bag|desk|chair|clock|school|bus)/.test(asset)) return "school";
  if (/(car|truck|train|boat|bike|airplane|tractor)/.test(asset)) return "vehicle";
  return "everyday";
}

export function isComposedNativeAsset(asset: VisualAssetKey): boolean {
  return composedNativeAssets.has(asset);
}

export type ArtworkRecipeInput = {
  itemId: string;
  asset: VisualAssetKey;
  paletteId: string;
  printMode: PrintModeId;
  projectSeed: string;
  /** Shared by two sides of an identical matching pair. */
  variantKey?: string;
  hasCharacter?: boolean;
};

const recipeCache = new Map<string, CanonicalArtworkManifest>();

/**
 * A pure local recipe resolver. The seed is derived only from stable worksheet
 * data, allowing preview, saved Studio projects, and PDF export to agree.
 */
export function resolveArtworkRecipe(input: ArtworkRecipeInput): CanonicalArtworkManifest {
  const cacheKey = [
    ALFA_VECTOR_ENGINE_VERSION,
    ALFA_ASSET_FAMILY_VERSION,
    input.projectSeed,
    input.itemId,
    input.variantKey ?? input.itemId,
    input.asset,
    input.paletteId,
    input.printMode,
    input.hasCharacter ? "character" : "object",
  ].join("|");
  const cached = recipeCache.get(cacheKey);
  if (cached) return cached;

  const seed = hash(
    [
      ALFA_VECTOR_ENGINE_VERSION,
      ALFA_ASSET_FAMILY_VERSION,
      input.projectSeed,
      input.variantKey ?? input.itemId,
      input.asset,
    ].join("|"),
  );
  const family = artworkFamilyFor(input.asset, input.hasCharacter);
  const manifest: CanonicalArtworkManifest = Object.freeze({
    itemId: input.itemId,
    asset: input.asset,
    family,
    variant: seed % 4,
    seed,
    paletteId: input.paletteId,
    printMode: input.printMode,
    engineVersion: ALFA_VECTOR_ENGINE_VERSION,
    assetFamilyVersion: ALFA_ASSET_FAMILY_VERSION,
    fallbackCategory: isComposedNativeAsset(input.asset) ? "none" : "native-family",
    capabilities: alfaArtworkCapabilities,
  });
  recipeCache.set(cacheKey, manifest);
  return manifest;
}

export function clearArtworkRecipeCache() {
  recipeCache.clear();
}
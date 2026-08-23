/**
 * The original Alfa Mind Hub character library.
 *
 * These are Alfa's own characters with a consistent visual identity: rounded
 * silhouettes, simple readable features and a calm, friendly expression. They
 * are deliberately generic-but-charming so they never resemble any identifiable
 * copyrighted character, and they are described as data so an AI service can
 * later generate new *original* assets against the same contract.
 */

export type AlfaCharacterKey =
  "lumi-butterfly" | "milo-fox" | "pip-ladybug" | "nola-bee" | "timo-turtle";

export type AlfaCharacter = {
  key: AlfaCharacterKey;
  name: string;
  species: string;
  role: string;
  personality: string;
  /** identity rules the renderer (and later, generation) must always honour */
  identity: {
    silhouette: string;
    signatureFeature: string;
    /** palette roles used for the character's main and secondary fill */
    primaryRole: "wing" | "wingAlt" | "accent" | "accentSoft" | "surface";
    secondaryRole: "wing" | "wingAlt" | "accent" | "accentSoft" | "surface";
    /** baseline expression before a direction's intensity is applied */
    baseExpression: number;
  };
  /** counting/matching assets this character can stand in for */
  standsInFor: string[];
};

export const alfaCharacters: Record<AlfaCharacterKey, AlfaCharacter> = {
  "lumi-butterfly": {
    key: "lumi-butterfly",
    name: "Lumi",
    species: "Butterfly",
    role: "Guide for gentle discovery pages",
    personality: "Curious, light-hearted, always noticing small things",
    identity: {
      silhouette: "Four soft petal wings, rounded body, two curled antennae",
      signatureFeature: "One small heart-shaped dot on each upper wing",
      primaryRole: "wing",
      secondaryRole: "accentSoft",
      baseExpression: 0.6,
    },
    standsInFor: ["butterfly"],
  },
  "milo-fox": {
    key: "milo-fox",
    name: "Milo",
    species: "Little Fox",
    role: "Adventure companion on covers and rewards",
    personality: "Brave, warm, a little cheeky",
    identity: {
      silhouette: "Round head, triangular soft ears, wide tail curled forward",
      signatureFeature: "Cream tail tip and cream cheek patches",
      primaryRole: "accent",
      secondaryRole: "surface",
      baseExpression: 0.8,
    },
    standsInFor: [],
  },
  "pip-ladybug": {
    key: "pip-ladybug",
    name: "Pip",
    species: "Ladybug",
    role: "Counting helper for the youngest learners",
    personality: "Tiny, cheerful, endlessly encouraging",
    identity: {
      silhouette: "Perfect dome shell with a centre seam and small round head",
      signatureFeature: "Exactly four evenly spaced shell dots",
      primaryRole: "accent",
      secondaryRole: "accentSoft",
      baseExpression: 0.75,
    },
    standsInFor: ["ladybug"],
  },
  "nola-bee": {
    key: "nola-bee",
    name: "Nola",
    species: "Bee",
    role: "Busy-work and practice pages",
    personality: "Focused, kind, loves finishing a task",
    identity: {
      silhouette: "Oval striped body with two rounded translucent wings",
      signatureFeature: "Three stripes, never more, and a soft rounded stinger",
      primaryRole: "wingAlt",
      secondaryRole: "surface",
      baseExpression: 0.7,
    },
    standsInFor: ["bee"],
  },
  "timo-turtle": {
    key: "timo-turtle",
    name: "Timo",
    species: "Turtle",
    role: "Calm pacing and 'take your time' moments",
    personality: "Slow, thoughtful, deeply patient",
    identity: {
      silhouette: "Low domed shell with hexagon plates and four stubby feet",
      signatureFeature: "Six shell plates and a gently tilted head",
      primaryRole: "wing",
      secondaryRole: "wingAlt",
      baseExpression: 0.5,
    },
    standsInFor: [],
  },
};

export const alfaCharacterList = Object.values(alfaCharacters);

/** Character that can replace a generic asset, if one exists. */
export function characterForAsset(asset: string): AlfaCharacterKey | undefined {
  const found = alfaCharacterList.find((c) => c.standsInFor.includes(asset));
  return found?.key;
}

export function isAlfaCharacter(value: string): value is AlfaCharacterKey {
  return value in alfaCharacters;
}

/**
 * Alfa Visual Directions.
 *
 * A visual direction is the *art direction layer* of a worksheet. It is kept
 * deliberately separate from educational content (worksheet-builder), from the
 * illustration assets (AlfaCharacterArt / InsectArt) and from page layout
 * (PrintablePage), so that a future AI service can generate content and assets
 * independently while the Alfa renderer keeps every printable on-brand.
 *
 * Everything here is original Alfa art direction. No preset references, imitates
 * or prompts for any studio, film, franchise, illustrator or protected artwork.
 */

export type PrintModeId = "premium" | "soft" | "ink" | "bw";

export const printModes: Array<{ id: PrintModeId; label: string; hint: string }> = [
  { id: "premium", label: "Premium Color", hint: "Full richness for showcase printing" },
  { id: "soft", label: "Soft Color", hint: "Lighter tints, everyday classroom printing" },
  { id: "ink", label: "Ink-Saving", hint: "Outlines with minimal fills" },
  { id: "bw", label: "Black & White", hint: "Grayscale, colouring-friendly" },
];

/** Palette roles shared by every direction and every print mode. */
export type DirectionPalette = {
  paper: string;
  ink: string;
  inkSoft: string;
  rule: string;
  accent: string;
  accentSoft: string;
  surface: string;
  /** primary illustration fill */
  wing: string;
  /** secondary illustration fill */
  wingAlt: string;
};

/** The structured "visual DNA" every Alfa direction must declare. */
export type VisualDNA = {
  /** 0–1 scales are renderer-normalised so any asset can consume them */
  lineQuality: {
    label: string;
    /** stroke width in SVG user units at a 100×100 artboard */
    weight: number;
    /** 0 = mechanical, 1 = hand-drawn wobble */
    organic: number;
    cap: "round" | "butt";
  };
  shapeLanguage: {
    label: string;
    /** 0 = angular, 1 = fully rounded */
    roundness: number;
    /** 0 = geometric, 1 = organic silhouettes */
    organic: number;
  };
  characterProportions: {
    label: string;
    /** head size relative to body, 1 = naturalistic, 2 = very large head */
    headRatio: number;
    /** 0 = slender, 1 = chubby */
    chunk: number;
  };
  /** 0 = neutral calm faces, 1 = big joyful expressions */
  expressionIntensity: number;
  texture: {
    label: string;
    /** 0 = flat vector, 1 = visible paint/grain */
    grain: number;
    /** soft watercolour bleed on fills */
    wash: number;
  };
  lighting: {
    label: string;
    /** 0 = flat, 1 = strong warm glow */
    warmth: number;
    glow: number;
  };
  /** 0 = isolated objects only, 1 = full illustrated scene */
  environmentalRichness: number;
  /** 0 = empty paper, 1 = complex painted background */
  backgroundComplexity: number;
  /** 0 = silhouette, 1 = fine detailed rendering */
  objectDetailLevel: number;
  printSuitability: {
    /** how well the direction survives grayscale, 0–1 */
    grayscaleSafety: number;
    /** relative ink usage in premium mode, 0–1 */
    inkLoad: number;
    notes: string;
  };
};

export type VisualDirection = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  palette: DirectionPalette;
  dna: VisualDNA;
  /** original Alfa characters that feel at home in this direction */
  signatureCharacters: string[];
};

const base = (p: Partial<DirectionPalette>): DirectionPalette => ({
  paper: "#FFFFFF",
  ink: "#33382F",
  inkSoft: "#7C8274",
  rule: "#DED8CB",
  accent: "#B5714F",
  accentSoft: "#F1E4DB",
  surface: "#FAF7F0",
  wing: "#9DAE92",
  wingAlt: "#D8C7A8",
  ...p,
});

export const visualDirections: VisualDirection[] = [
  {
    id: "magical-nature",
    name: "Magical Nature Adventure",
    tagline: "Lush plants, gentle wonder, warm natural light",
    description:
      "Hand-painted feeling with soft atmospheric depth and expressive original animals discovering a living green world.",
    palette: base({
      ink: "#2E3A2C",
      inkSoft: "#6E7C68",
      rule: "#D8E0CE",
      accent: "#C0764C",
      accentSoft: "#F3E6D9",
      surface: "#F7FAF2",
      wing: "#7FA86C",
      wingAlt: "#E4C888",
    }),
    dna: {
      lineQuality: { label: "Soft painted contour", weight: 1.7, organic: 0.7, cap: "round" },
      shapeLanguage: { label: "Leafy organic", roundness: 0.75, organic: 0.85 },
      characterProportions: { label: "Friendly, slightly large head", headRatio: 1.5, chunk: 0.6 },
      expressionIntensity: 0.65,
      texture: { label: "Hand-painted", grain: 0.55, wash: 0.5 },
      lighting: { label: "Warm dappled sunlight", warmth: 0.8, glow: 0.55 },
      environmentalRichness: 0.75,
      backgroundComplexity: 0.6,
      objectDetailLevel: 0.7,
      printSuitability: {
        grayscaleSafety: 0.8,
        inkLoad: 0.6,
        notes: "Keep foliage tints light for A4 laser.",
      },
    },
    signatureCharacters: ["milo-fox", "lumi-butterfly", "timo-turtle"],
  },
  {
    id: "cozy-european",
    name: "Cozy European Childhood",
    tagline: "Meadows, cottages and mountain air",
    description:
      "Countryside nostalgia rendered in storybook watercolour: flower meadows, wooden cottages and far blue mountains.",
    palette: base({
      ink: "#35343E",
      inkSoft: "#7E7C8C",
      rule: "#DDDCE6",
      accent: "#C06A63",
      accentSoft: "#F5E3E1",
      surface: "#FBF8F3",
      wing: "#8FA9C2",
      wingAlt: "#E3CBA4",
    }),
    dna: {
      lineQuality: { label: "Pencil-under-watercolour", weight: 1.4, organic: 0.8, cap: "round" },
      shapeLanguage: { label: "Gentle storybook", roundness: 0.65, organic: 0.75 },
      characterProportions: { label: "Child-like, cosy", headRatio: 1.6, chunk: 0.65 },
      expressionIntensity: 0.55,
      texture: { label: "Watercolour paper", grain: 0.6, wash: 0.75 },
      lighting: { label: "Late afternoon warmth", warmth: 0.7, glow: 0.4 },
      environmentalRichness: 0.8,
      backgroundComplexity: 0.7,
      objectDetailLevel: 0.65,
      printSuitability: {
        grayscaleSafety: 0.75,
        inkLoad: 0.55,
        notes: "Skies must stay pale to avoid banding.",
      },
    },
    signatureCharacters: ["nola-bee", "pip-ladybug"],
  },
  {
    id: "whimsical-friendship",
    name: "Whimsical Friendship Adventure",
    tagline: "Rounded characters, joyful movement",
    description:
      "Playful compositions built around original rounded characters with expressive faces and optimistic colour.",
    palette: base({
      ink: "#333140",
      inkSoft: "#7F7C90",
      rule: "#E2DFEA",
      accent: "#E08A5B",
      accentSoft: "#FBE7D8",
      surface: "#FDFAF6",
      wing: "#79B7A8",
      wingAlt: "#F0C46A",
    }),
    dna: {
      lineQuality: { label: "Confident round line", weight: 2.1, organic: 0.35, cap: "round" },
      shapeLanguage: { label: "Bouncy rounded", roundness: 0.95, organic: 0.6 },
      characterProportions: { label: "Big head, small body", headRatio: 1.9, chunk: 0.8 },
      expressionIntensity: 0.9,
      texture: { label: "Clean flat with soft shading", grain: 0.2, wash: 0.25 },
      lighting: { label: "Bright even daylight", warmth: 0.6, glow: 0.3 },
      environmentalRichness: 0.55,
      backgroundComplexity: 0.4,
      objectDetailLevel: 0.55,
      printSuitability: {
        grayscaleSafety: 0.9,
        inkLoad: 0.5,
        notes: "Strong outlines survive any printer.",
      },
    },
    signatureCharacters: ["milo-fox", "pip-ladybug", "timo-turtle"],
  },
  {
    id: "dreamy-watercolor",
    name: "Dreamy Watercolor World",
    tagline: "Soft skies and delicate botanicals",
    description:
      "Calm poetic atmosphere with translucent washes, botanical detail and deliberate small imperfections.",
    palette: base({
      ink: "#3B3A44",
      inkSoft: "#8A8895",
      rule: "#E3E1EA",
      accent: "#B98198",
      accentSoft: "#F6E9EE",
      surface: "#FCFAFB",
      wing: "#A6C3D4",
      wingAlt: "#DDD0E2",
    }),
    dna: {
      lineQuality: { label: "Barely-there brush edge", weight: 1.1, organic: 0.9, cap: "round" },
      shapeLanguage: { label: "Fluid botanical", roundness: 0.7, organic: 0.95 },
      characterProportions: { label: "Delicate, natural", headRatio: 1.3, chunk: 0.4 },
      expressionIntensity: 0.35,
      texture: { label: "Wet-on-wet wash", grain: 0.7, wash: 0.95 },
      lighting: { label: "Diffused morning light", warmth: 0.45, glow: 0.5 },
      environmentalRichness: 0.6,
      backgroundComplexity: 0.55,
      objectDetailLevel: 0.6,
      printSuitability: {
        grayscaleSafety: 0.6,
        inkLoad: 0.45,
        notes: "Boost outline weight in grayscale exports.",
      },
    },
    signatureCharacters: ["lumi-butterfly", "nola-bee"],
  },
  {
    id: "tiny-forest",
    name: "Tiny Forest Friends",
    tagline: "Mushrooms, acorns and miniature discoveries",
    description:
      "A close-to-the-ground world of small original woodland creatures, leaves, berries and tiny finds.",
    palette: base({
      ink: "#33322A",
      inkSoft: "#7A7767",
      rule: "#DFD9C9",
      accent: "#A85C3E",
      accentSoft: "#F2E1D5",
      surface: "#FAF7EF",
      wing: "#8B9E6B",
      wingAlt: "#D9A96C",
    }),
    dna: {
      lineQuality: { label: "Ink nib with texture", weight: 1.6, organic: 0.6, cap: "round" },
      shapeLanguage: { label: "Compact and rounded", roundness: 0.8, organic: 0.7 },
      characterProportions: { label: "Small and stout", headRatio: 1.7, chunk: 0.85 },
      expressionIntensity: 0.7,
      texture: { label: "Dry brush speckle", grain: 0.5, wash: 0.35 },
      lighting: { label: "Forest floor glow", warmth: 0.65, glow: 0.45 },
      environmentalRichness: 0.7,
      backgroundComplexity: 0.45,
      objectDetailLevel: 0.75,
      printSuitability: {
        grayscaleSafety: 0.85,
        inkLoad: 0.55,
        notes: "Great for small-format A5 booklets.",
      },
    },
    signatureCharacters: ["pip-ladybug", "milo-fox"],
  },
  {
    id: "gentle-fantasy-garden",
    name: "Gentle Fantasy Garden",
    tagline: "Butterflies, flowers and glowing light",
    description:
      "Imaginative but grounded garden fantasy: tiny magical environmental details and softly glowing natural light.",
    palette: base({
      ink: "#37364A",
      inkSoft: "#82809A",
      rule: "#E1DEEC",
      accent: "#C08AB2",
      accentSoft: "#F5E8F2",
      surface: "#FCFAFE",
      wing: "#9FC6A9",
      wingAlt: "#EFD08A",
    }),
    dna: {
      lineQuality: { label: "Fine glowing contour", weight: 1.3, organic: 0.55, cap: "round" },
      shapeLanguage: { label: "Petal and wing curves", roundness: 0.85, organic: 0.9 },
      characterProportions: { label: "Light and airy", headRatio: 1.4, chunk: 0.45 },
      expressionIntensity: 0.6,
      texture: { label: "Soft bloom", grain: 0.3, wash: 0.6 },
      lighting: { label: "Golden hour sparkle", warmth: 0.75, glow: 0.85 },
      environmentalRichness: 0.65,
      backgroundComplexity: 0.5,
      objectDetailLevel: 0.65,
      printSuitability: {
        grayscaleSafety: 0.7,
        inkLoad: 0.5,
        notes: "Glow reads as light gray — keep shapes distinct.",
      },
    },
    signatureCharacters: ["lumi-butterfly", "nola-bee", "pip-ladybug"],
  },
  {
    id: "sunny-seaside",
    name: "Sunny Seaside Adventure",
    tagline: "Shells, boats and fresh blue air",
    description:
      "Mediterranean coastal brightness with sea creatures, harbours and clean cream-and-blue contrast.",
    palette: base({
      ink: "#2C3A45",
      inkSoft: "#71838F",
      rule: "#D5E1E6",
      accent: "#D98452",
      accentSoft: "#FBE8D8",
      surface: "#F7FBFC",
      wing: "#6FA8BF",
      wingAlt: "#F0DDB4",
    }),
    dna: {
      lineQuality: { label: "Crisp sunlit line", weight: 1.8, organic: 0.4, cap: "round" },
      shapeLanguage: { label: "Wave and shell curves", roundness: 0.8, organic: 0.75 },
      characterProportions: { label: "Buoyant", headRatio: 1.6, chunk: 0.7 },
      expressionIntensity: 0.75,
      texture: { label: "Salt-paper speckle", grain: 0.35, wash: 0.4 },
      lighting: { label: "High midday sun", warmth: 0.7, glow: 0.6 },
      environmentalRichness: 0.6,
      backgroundComplexity: 0.45,
      objectDetailLevel: 0.6,
      printSuitability: {
        grayscaleSafety: 0.85,
        inkLoad: 0.5,
        notes: "Blues convert to clean mid grays.",
      },
    },
    signatureCharacters: ["timo-turtle", "milo-fox"],
  },
  {
    id: "cozy-farm",
    name: "Cozy Farm Story",
    tagline: "Orchards, gardens and friendly animals",
    description:
      "Warm countryside atmosphere with original farm animals, vegetable beds, wooden fences and fruit trees.",
    palette: base({
      ink: "#3A3228",
      inkSoft: "#83786A",
      rule: "#E2D9C9",
      accent: "#B3603C",
      accentSoft: "#F4E3D6",
      surface: "#FBF7F0",
      wing: "#94A96F",
      wingAlt: "#E0B473",
    }),
    dna: {
      lineQuality: { label: "Warm rounded ink", weight: 1.9, organic: 0.5, cap: "round" },
      shapeLanguage: { label: "Plump and sturdy", roundness: 0.85, organic: 0.65 },
      characterProportions: { label: "Rounded and huggable", headRatio: 1.7, chunk: 0.9 },
      expressionIntensity: 0.8,
      texture: { label: "Gouache flatness", grain: 0.35, wash: 0.3 },
      lighting: { label: "Harvest warmth", warmth: 0.85, glow: 0.4 },
      environmentalRichness: 0.7,
      backgroundComplexity: 0.5,
      objectDetailLevel: 0.6,
      printSuitability: {
        grayscaleSafety: 0.85,
        inkLoad: 0.6,
        notes: "Earth tones separate well in grayscale.",
      },
    },
    signatureCharacters: ["milo-fox", "nola-bee", "timo-turtle"],
  },
  {
    id: "scandinavian-learning",
    name: "Scandinavian Learning World",
    tagline: "Minimal shapes, natural materials",
    description:
      "Sophisticated child-friendly simplicity: muted colour, clean composition and calm geometric clarity.",
    palette: base({
      ink: "#33352F",
      inkSoft: "#7D8078",
      rule: "#DEDDD6",
      accent: "#A8785E",
      accentSoft: "#EFE6DE",
      surface: "#FAFAF7",
      wing: "#9BAFA4",
      wingAlt: "#DCCFBE",
    }),
    dna: {
      lineQuality: { label: "Even minimal stroke", weight: 1.5, organic: 0.15, cap: "round" },
      shapeLanguage: { label: "Reduced geometric", roundness: 0.6, organic: 0.25 },
      characterProportions: { label: "Simplified, balanced", headRatio: 1.3, chunk: 0.5 },
      expressionIntensity: 0.3,
      texture: { label: "Matte paper", grain: 0.15, wash: 0.1 },
      lighting: { label: "Flat northern light", warmth: 0.35, glow: 0.15 },
      environmentalRichness: 0.3,
      backgroundComplexity: 0.15,
      objectDetailLevel: 0.4,
      printSuitability: {
        grayscaleSafety: 0.95,
        inkLoad: 0.3,
        notes: "Lowest ink load — ideal for daily worksheets.",
      },
    },
    signatureCharacters: ["timo-turtle", "pip-ladybug"],
  },
  {
    id: "classic-illustrated",
    name: "Classic Illustrated Childhood",
    tagline: "Timeless children's-book atmosphere",
    description:
      "Elegant composition, hand-rendered texture and gentle expressions — fully original, quietly traditional.",
    palette: base({
      ink: "#332F2A",
      inkSoft: "#7A736A",
      rule: "#DFD8CE",
      accent: "#9C6242",
      accentSoft: "#F0E4DA",
      surface: "#FBF8F3",
      wing: "#A2AE93",
      wingAlt: "#D9C4A2",
    }),
    dna: {
      lineQuality: { label: "Etched pen line", weight: 1.4, organic: 0.65, cap: "round" },
      shapeLanguage: { label: "Naturalistic classic", roundness: 0.55, organic: 0.8 },
      characterProportions: { label: "Traditional storybook", headRatio: 1.45, chunk: 0.55 },
      expressionIntensity: 0.45,
      texture: { label: "Cross-hatch and grain", grain: 0.65, wash: 0.35 },
      lighting: { label: "Soft lamp warmth", warmth: 0.6, glow: 0.3 },
      environmentalRichness: 0.65,
      backgroundComplexity: 0.55,
      objectDetailLevel: 0.8,
      printSuitability: {
        grayscaleSafety: 0.95,
        inkLoad: 0.55,
        notes: "Designed to look intentional in pure B&W.",
      },
    },
    signatureCharacters: ["lumi-butterfly", "milo-fox", "timo-turtle"],
  },
];

export const visualDirectionMap: Record<string, VisualDirection> = Object.fromEntries(
  visualDirections.map((d) => [d.id, d]),
);

export const defaultVisualDirectionId = "magical-nature";

export function resolveVisualDirection(id?: string): VisualDirection {
  return visualDirectionMap[id ?? ""] ?? visualDirectionMap[defaultVisualDirectionId]!;
}

/** Maps a worksheet theme onto the direction that suits it best. */
export function directionForTheme(theme: string, inspiration?: string): string {
  const key = `${theme} ${inspiration ?? ""}`.toLowerCase();
  if (/sea|ocean|beach|boat/.test(key)) return "sunny-seaside";
  if (/farm|garden vegetable|harvest/.test(key)) return "cozy-farm";
  if (/forest|wood|mushroom/.test(key)) return "tiny-forest";
  if (/watercolou?r|dream|calm|poetic/.test(key)) return "dreamy-watercolor";
  if (/scandi|minimal|montessori/.test(key)) return "scandinavian-learning";
  if (/classic|vintage|timeless/.test(key)) return "classic-illustrated";
  if (/friend|adventure|playful/.test(key)) return "whimsical-friendship";
  if (/alpine|cottage|meadow|countryside/.test(key)) return "cozy-european";
  if (/insect|butterfl|flower|garden/.test(key)) return "gentle-fantasy-garden";
  return defaultVisualDirectionId;
}

/* ------------------------------------------------------------------ *
 * Print modes
 * ------------------------------------------------------------------ */

function hexToRgb(hex: string) {
  const v = hex.replace("#", "");
  return [
    parseInt(v.slice(0, 2), 16),
    parseInt(v.slice(2, 4), 16),
    parseInt(v.slice(4, 6), 16),
  ] as const;
}

function rgbToHex(r: number, g: number, b: number) {
  const c = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Mixes a colour towards white — used by Soft Color and Ink-Saving. */
function lighten(hex: string, amount: number) {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount);
}

/** Perceptual grayscale so every direction stays readable in B&W. */
function grayscale(hex: string, contrast = 1) {
  const [r, g, b] = hexToRgb(hex);
  const y = 0.299 * r + 0.587 * g + 0.114 * b;
  const adjusted = 128 + (y - 128) * contrast;
  return rgbToHex(adjusted, adjusted, adjusted);
}

/**
 * Applies a print mode to a direction palette. Colour information is never
 * thrown away — it is transformed — so a grayscale print keeps the same
 * value separation as the premium version.
 */
export function applyPrintMode(palette: DirectionPalette, mode: PrintModeId): DirectionPalette {
  if (mode === "premium") return palette;

  if (mode === "soft") {
    return {
      ...palette,
      accentSoft: lighten(palette.accentSoft, 0.45),
      surface: lighten(palette.surface, 0.5),
      wing: lighten(palette.wing, 0.42),
      wingAlt: lighten(palette.wingAlt, 0.42),
      rule: lighten(palette.rule, 0.25),
    };
  }

  if (mode === "ink") {
    return {
      ...palette,
      ink: "#1F1F1F",
      inkSoft: "#6B6B6B",
      rule: "#CFCFCF",
      accent: "#1F1F1F",
      accentSoft: "#FFFFFF",
      surface: "#FFFFFF",
      wing: "#FFFFFF",
      wingAlt: "#FFFFFF",
    };
  }

  return {
    paper: "#FFFFFF",
    ink: grayscale(palette.ink, 1.35),
    inkSoft: grayscale(palette.inkSoft, 1.1),
    rule: grayscale(palette.rule),
    accent: grayscale(palette.accent, 1.25),
    accentSoft: grayscale(palette.accentSoft),
    surface: grayscale(palette.surface),
    wing: grayscale(palette.wing, 1.15),
    wingAlt: grayscale(palette.wingAlt, 0.85),
  };
}

/* ------------------------------------------------------------------ *
 * Illustration style — how much artwork a given page may carry
 * ------------------------------------------------------------------ */

export type IllustrationPurpose =
  | "cover"
  | "reward"
  | "mini-book"
  | "creative"
  | "counting"
  | "phonics"
  | "matching"
  | "tracing"
  | "sequencing"
  | "math";

/** Purposes where artwork tells a story rather than serving as a countable unit. */
export const storytellingPurposes: IllustrationPurpose[] = [
  "cover",
  "reward",
  "mini-book",
  "creative",
];

export type IllustrationComplexity = "rich" | "standard" | "simple" | "minimal";

export type IllustrationStyle = {
  directionId: string;
  purpose: IllustrationPurpose;
  complexity: IllustrationComplexity;
  /** 0–1, drives how much interior detail an asset draws */
  detailLevel: number;
  expressionIntensity: number;
  strokeWeight: number;
  /** whether the page may draw scenery behind the exercise */
  allowBackground: boolean;
  /** whether decorative (non-countable) elements are allowed */
  allowDecoration: boolean;
};

export type IllustrationContext = {
  direction: VisualDirection;
  purpose: IllustrationPurpose;
  /** age token id, e.g. "preschool-4-5" */
  ageId: string;
};

const ageComplexityCeiling: Record<string, IllustrationComplexity> = {
  "toddler-2-3": "minimal",
  "nursery-3-4": "simple",
  "preschool-4-5": "simple",
  kindergarten: "standard",
  school: "standard",
};

const complexityRank: Record<IllustrationComplexity, number> = {
  minimal: 0,
  simple: 1,
  standard: 2,
  rich: 3,
};

const rankComplexity: IllustrationComplexity[] = ["minimal", "simple", "standard", "rich"];

/**
 * Illustrations must support learning, never compete with it. Storytelling
 * pages may go rich; focus activities stay isolated and quiet, and younger
 * ages always pull complexity further down.
 */
export function resolveIllustrationStyle({
  direction,
  purpose,
  ageId,
}: IllustrationContext): IllustrationStyle {
  const storytelling = storytellingPurposes.includes(purpose);
  const wanted: IllustrationComplexity = storytelling ? "rich" : "simple";
  const ceiling = ageComplexityCeiling[ageId] ?? "simple";
  // storytelling pages are allowed one step above the focus ceiling
  const ceilingRank = complexityRank[ceiling] + (storytelling ? 2 : 0);
  const complexity = rankComplexity[Math.min(complexityRank[wanted], ceilingRank, 3)]!;

  const focusDamping = storytelling ? 1 : 0.55;
  const youngDamping = complexityRank[ceiling] <= 1 ? 0.8 : 1;

  return {
    directionId: direction.id,
    purpose,
    complexity,
    detailLevel: Math.min(1, direction.dna.objectDetailLevel * focusDamping * youngDamping),
    expressionIntensity: Math.min(1, direction.dna.expressionIntensity * (storytelling ? 1 : 0.7)),
    strokeWeight: direction.dna.lineQuality.weight * (complexityRank[ceiling] <= 1 ? 1.15 : 1),
    allowBackground: storytelling && direction.dna.backgroundComplexity > 0.35,
    allowDecoration: storytelling || direction.dna.environmentalRichness > 0.7,
  };
}

/**
 * Cut & Create — craft / fine-motor printables.
 *
 * A Cut & Create request ("build your own aquarium", "design your own pizza",
 * "cut and glue a rocket") is an ACTIVITY MECHANIC, not an academic domain.
 * The teacher asked for scissors work, so the pack must render a large build
 * area plus clearly separated cut-out pieces — never a phonics or counting
 * sheet inferred from the object names inside the theme.
 */

import { resolveAgeTokens } from "./age-tokens";
import { characterForAsset } from "./alfa-characters";
import type { WorksheetSpec } from "./creator-options";
import { visualObjects } from "./semantic-topics";
import { resolveSubject } from "./worksheet-subjects";
import type {
  CutCreatePiece,
  VisualAssetKey,
  WorksheetMechanicId,
  WorksheetPageModel,
} from "./worksheet-model";
import type { IllustrationPurpose } from "./visual-directions";

export type CraftTheme = {
  id: string;
  /** child-facing name of the thing being built */
  label: string;
  /** the base area drawn on page 1 */
  base: "aquarium" | "plate" | "scene" | "open";
  baseCaption: string;
  test: RegExp;
  /** every cut-out piece the theme can offer, in teaching order */
  pieces: VisualAssetKey[];
};

export const craftThemes: CraftTheme[] = [
  {
    id: "aquarium",
    label: "Aquarium",
    base: "aquarium",
    baseCaption: "Glue your sea friends inside the tank.",
    test: /aquarium|fish ?tank|under ?water|\bocean\b|\bsea\b|coral reef/i,
    pieces: ["fish", "octopus", "starfish", "shell", "crab", "turtle", "whale", "boat"],
  },
  {
    id: "pizza",
    label: "Pizza",
    base: "plate",
    baseCaption: "Glue your toppings onto the pizza base.",
    test: /pizza/i,
    pieces: ["apple", "carrot", "mushroom", "leaf", "egg", "heart", "star", "flower"],
  },
  {
    id: "cupcake",
    label: "Cupcake",
    base: "plate",
    baseCaption: "Decorate the top of your cupcake.",
    test: /cup ?cake|\bcake\b|\bdonut\b|ice ?cream/i,
    pieces: ["heart", "star", "flower", "apple", "balloon", "leaf", "butterfly", "shell"],
  },
  {
    id: "monster",
    label: "Monster",
    base: "open",
    baseCaption: "Glue eyes, arms and horns onto your monster body.",
    test: /monster|creature you invent|silly face/i,
    pieces: ["star", "heart", "leaf", "flower", "balloon", "shell", "acorn", "mushroom"],
  },
  {
    id: "rocket",
    label: "Rocket",
    base: "open",
    baseCaption: "Glue the rocket pieces together and add stars.",
    test: /rocket|space ?ship|\bspace\b/i,
    pieces: ["rocket", "star", "planet", "moon", "comet", "astronaut", "cloud", "balloon"],
  },
  {
    id: "garden",
    label: "Garden",
    base: "scene",
    baseCaption: "Glue your flowers and little visitors into the garden.",
    test: /garden|flower ?bed|meadow/i,
    pieces: ["flower", "butterfly", "bee", "ladybug", "tree", "leaf", "snail", "mushroom"],
  },
];

export function craftThemeFor(text: string): CraftTheme {
  return craftThemes.find((theme) => theme.test.test(text)) ?? craftThemes[craftThemes.length - 1]!;
}

/** Pieces the pack may print: what the teacher named first, then theme extras. */
export function craftPiecesFor(spec: WorksheetSpec): {
  theme: CraftTheme;
  pieces: VisualAssetKey[];
} {
  const text = `${spec.prompt ?? ""} ${spec.theme ?? ""}`;
  const theme = craftThemeFor(text);
  const subject = resolveSubject(spec);
  const named = subject.locked ? subject.assets : [];
  // The theme's own pieces lead (they are ordered for teaching and always
  // fit the scene); anything extra the teacher named follows.
  const merged = [...new Set([...theme.pieces, ...named])];
  // "starfish" in the prompt must not also drag a generic "star" into an
  // aquarium. Only prefixes are dropped, so "fish" survives next to
  // "starfish" — they are genuinely different sea creatures.
  const pieces = merged.filter(
    (asset) => !merged.some((other) => other !== asset && other.startsWith(asset)),
  );
  return { theme, pieces };
}

function piece(id: string, asset: VisualAssetKey): CutCreatePiece {
  const character = characterForAsset(asset);
  return {
    id,
    asset,
    label: visualObjects[asset].singular,
    ...(character ? { character } : {}),
  };
}

type CraftContext = {
  spec: WorksheetSpec;
  seed: number;
  styleFor: (
    spec: WorksheetSpec,
    purpose: IllustrationPurpose,
  ) => WorksheetPageModel["illustrationStyle"];
};

function baseShell(
  ctx: CraftContext,
  title: string,
  instruction: string,
  activityType: string,
): Omit<WorksheetPageModel, "activity" | "answerKey"> {
  return {
    id: "page-1",
    title,
    instruction,
    activityType,
    layout: "stacked-rows",
    purpose: "creative",
    illustrationStyle: ctx.styleFor(ctx.spec, "creative"),
  };
}

/** How many cut-outs one page may print, by age (bigger pieces for younger). */
function pieceBudget(level: string) {
  const id = resolveAgeTokens(level).id;
  if (id === "toddler-2-3") return 4;
  if (id === "nursery-3-4") return 5;
  return 6;
}

/** PAGE 1 — the big empty build area plus the first set of cut-outs. */
export function buildCutCreateBuildPage(ctx: CraftContext): WorksheetPageModel {
  const { theme, pieces } = craftPiecesFor(ctx.spec);
  const budget = pieceBudget(ctx.spec.level);
  const selected = pieces.slice(0, budget);
  return {
    ...baseShell(
      ctx,
      `Build Your Own ${theme.label}`,
      `Cut out the pieces along the dotted lines. Glue them inside the big ${theme.label.toLowerCase()}.`,
      "Cut & Create",
    ),
    activity: {
      kind: "cut-create",
      mechanic: "cut-create-build",
      base: {
        id: "craft-base-1",
        label: `My ${theme.label}`,
        caption: theme.baseCaption,
        shape: theme.base,
      },
      pieces: selected.map((asset, i) => piece(`p1-piece-${i + 1}-${asset}`, asset)),
      challenge: `Tell a grown-up about the ${theme.label.toLowerCase()} you made.`,
    },
    answerKey: [],
    footerNote: "Cut slowly along the dotted lines. Open and close the scissors gently.",
  };
}

/** PAGE 2 — a scene-building strip with a DIFFERENT selection of cut-outs. */
export function buildCutCreateScenePage(ctx: CraftContext): WorksheetPageModel {
  const { theme, pieces } = craftPiecesFor(ctx.spec);
  const budget = pieceBudget(ctx.spec.level);
  // deliberately a different selection from page 1 (wrapping when short)
  const rotated = [...pieces.slice(budget), ...pieces.slice(0, budget)];
  const selected = rotated.slice(0, budget);
  return {
    ...baseShell(
      ctx,
      `${theme.label} Scene`,
      `Cut out the new pieces. Build your own ${theme.label.toLowerCase()} scene and glue it down.`,
      "Cut & Create",
    ),
    activity: {
      kind: "cut-create",
      mechanic: "cut-create-scene",
      base: {
        id: "craft-base-2",
        label: `My ${theme.label} Scene`,
        caption: "Arrange the pieces first, then glue them where you like.",
        shape: theme.base === "plate" ? "open" : "scene",
      },
      pieces: selected.map((asset, i) => piece(`p2-piece-${i + 1}-${asset}`, asset)),
      challenge: "Which piece did you glue first? Why?",
    },
    answerKey: [],
    footerNote: "Arrange every piece before reaching for the glue.",
  };
}

/** PAGE 3 — a counting challenge that still uses the Cut & Create mechanic. */
export function buildCutCreateCountPage(ctx: CraftContext): WorksheetPageModel {
  const { theme, pieces } = craftPiecesFor(ctx.spec);
  const tokens = resolveAgeTokens(ctx.spec.level);
  const targetAssets = pieces.slice(0, Math.min(3, pieces.length));
  const quantities = [2, 3, 4].map((q) => Math.min(q, Math.max(2, tokens.maxQuantity)));

  const targets = targetAssets.map((asset, i) => ({
    id: `p3-target-${i + 1}-${asset}`,
    asset,
    label: visualObjects[asset].plural,
    quantity: quantities[i] ?? 2,
  }));

  const cutPieces: CutCreatePiece[] = targets.flatMap((target) =>
    Array.from({ length: target.quantity }, (_, k) =>
      piece(`${target.id}-cut-${k + 1}`, target.asset),
    ),
  );

  return {
    ...baseShell(
      ctx,
      `${theme.label} Counting Challenge`,
      `Read each card. Cut out exactly that many pieces and glue them into your ${theme.label.toLowerCase()}.`,
      "Cut & Create",
    ),
    activity: {
      kind: "cut-create",
      mechanic: "cut-create-count",
      base: {
        id: "craft-base-3",
        label: `My Busy ${theme.label}`,
        caption: "Glue the right number of pieces inside.",
        shape: theme.base === "plate" ? "plate" : theme.base === "open" ? "open" : theme.base,
      },
      pieces: cutPieces,
      targets,
      challenge: "Count everything you glued. How many pieces altogether?",
    },
    answerKey: targets.map((target) => ({
      groupId: target.id,
      answer: target.quantity,
      answerText: `${target.quantity} ${target.label}`,
    })),
    footerNote: "Count out loud as you cut each piece.",
  };
}

export const cutCreateBuilders: Record<string, (ctx: CraftContext) => WorksheetPageModel> = {
  "cut-create-build": buildCutCreateBuildPage,
  "cut-create-scene": buildCutCreateScenePage,
  "cut-create-count": buildCutCreateCountPage,
};

export function cutCreateBuilderFor(mechanic: WorksheetMechanicId) {
  return cutCreateBuilders[mechanic];
}

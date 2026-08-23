/**
 * PACK LEARNING-OBJECTIVE FIDELITY
 * --------------------------------
 * A pack has TWO independent dimensions:
 *
 *   LEARNING OBJECTIVE — what the child must learn ("letter S / the /s/ sound",
 *                        "counting to 10", "shapes"). It is the same on every
 *                        page of the pack.
 *   THEME              — what the pictures show ("space"). Decoration only.
 *
 * The page-plan contract already guarantees the MECHANIC of every page. This
 * module guarantees the OBJECTIVE of every page: after a page has been built
 * by its mechanic builder, its content is checked against the pack objective
 * and, when it drifts, REPAIRED IN PLACE — the mechanic, layout, answer keys
 * and page order are never touched, only the vocabulary the activity is made
 * of and the wording that names the objective.
 *
 * Repair works for any mechanic because it is a structural remap: every
 * distinct illustration on the page is mapped one-to-one onto objective
 * vocabulary, so a pattern stays the same pattern, a matching pair stays a
 * pair, and a "different" card stays different — it just now practises the
 * objective.
 */

import type { WorksheetSpec } from "./creator-options";
import { domainForSpec, letterForSpec } from "./learning-domains";
import { hasPictures, wordsForLetter } from "./phonics-vocabulary";
import { visualObjects } from "./semantic-topics";
import { resolveThemeScope, themeWordFor } from "./theme-scope";
import type { VisualAssetKey, WorksheetPageModel } from "./worksheet-model";

export type PackObjective = {
  id: string;
  kind: "phonics-letter" | "open";
  /** teacher-facing name of the objective */
  label: string;
  letter?: string;
  /** illustrations that genuinely practise the objective (empty = any) */
  vocabulary: VisualAssetKey[];
  /** what each illustration is CALLED for this pack ("rocket" -> "spaceship") */
  words: Partial<Record<VisualAssetKey, string>>;
  /** sentence appended to a page whose wording never names the objective */
  reinforcement: string;
  /** true when the objective constrains page content at all */
  constrainsContent: boolean;
};

const openObjective: PackObjective = {
  id: "open",
  kind: "open",
  label: "Open objective",
  vocabulary: [],
  words: {},
  reinforcement: "",
  constrainsContent: false,
};

/**
 * The objective of the whole pack.
 *
 * Today Alfa can constrain content for letter/phonics objectives; every other
 * objective (counting, shapes, science…) is already carried by its mechanic,
 * so it resolves to an open objective and content is left to the theme.
 */
export function resolveLearningObjective(spec: WorksheetSpec): PackObjective {
  const letter = letterForSpec(spec);
  const literacy = domainForSpec(spec) === "literacy";
  // the objective must be NAMED by the teacher: a literacy pack that never
  // states a letter has no letter objective to preserve.
  // A PACK objective is stated at pack level. A letter named only inside one
  // page instruction ("Page 1: find the letter S") is that page's business —
  // it must not turn a space counting pack into a phonics pack.
  const packLevelPrompt = (spec.prompt ?? "")
    .split(/\n/)
    .filter((line) => !/^\s*page\s*\d+\s*[:.\-–—]/i.test(line))
    .join(" ");
  // theme/skill are prompt-derived echoes, so they only count when the prompt
  // itself is not a per-page plan.
  const perPagePlan = packLevelPrompt.length < (spec.prompt ?? "").length;
  const stated = perPagePlan
    ? packLevelPrompt
    : `${packLevelPrompt} ${spec.theme ?? ""} ${spec.skill ?? ""}`;
  const named =
    new RegExp(`\\bletters?\\s+${letter}\\b`, "i").test(stated) ||
    new RegExp(`/${letter}/`, "i").test(stated) ||
    new RegExp(`\\b${letter}\\s*/\\s*${letter}\\b`, "i").test(stated);
  if (literacy && named && letter && hasPictures(letter)) {
    const scope = resolveThemeScope(spec);
    const words: Partial<Record<VisualAssetKey, string>> = {};
    // THEME + OBJECTIVE. A space pack about letter S must teach with space
    // pictures whose names begin with /s/ (star, sun, spaceship) — never with
    // a sheep or a snail. Off-theme objective words are only used when the
    // theme itself cannot carry the objective.
    const themed = scope.constrains
      ? scope.assets.filter(
          (asset) => themeWordFor(scope, asset).charAt(0).toLowerCase() === letter,
        )
      : [];
    for (const asset of themed) words[asset] = themeWordFor(scope, asset);
    const generic = wordsForLetter(letter)
      .filter((word) => !themed.includes(word.asset))
      .map((word) => word.asset);
    const vocabulary = themed.length >= 2 ? themed : [...themed, ...generic];
    const upper = letter.toUpperCase();
    return {
      id: `phonics-letter-${letter}`,
      kind: "phonics-letter",
      label: `Letter ${upper} / the /${letter}/ sound`,
      letter,
      vocabulary: [...new Set(vocabulary)],
      words,
      reinforcement: `Say each picture name out loud and listen for the /${letter}/ sound at the beginning.`,
      constrainsContent: true,
    };
  }
  return openObjective;
}

/** The word a picture is read as inside this pack. */
export function objectiveWordFor(objective: PackObjective, asset: VisualAssetKey) {
  return objective.words[asset] ?? visualObjects[asset]?.singular ?? asset;
}

/** True when one illustration practises the objective. */
export function assetPractisesObjective(objective: PackObjective, asset: VisualAssetKey) {
  if (!objective.constrainsContent) return true;
  if (objective.kind === "phonics-letter") {
    return objectiveWordFor(objective, asset).charAt(0).toLowerCase() === objective.letter;
  }
  return true;
}

/**
 * Mechanics whose content model IS the objective already (letter hunts, sound
 * discrimination, letter tracing…). They legitimately include non-target
 * pictures as distractors and must never be remapped.
 */
const objectiveNativeKinds = new Set([
  "letter-search",
  "letter-trace",
  "sound-hunt",
  "picture-letter-match",
  "word-complete",
]);

/** Activity subtypes produced by the pedagogical repair pass — phonics by design. */
const objectiveNativeSubtypes = new Set(["sound-to-picture", "sound-choice", "sound-path"]);

export function isObjectiveNative(page: WorksheetPageModel) {
  if (objectiveNativeKinds.has(page.activity.kind)) return true;
  const subtype = (page.activity as { subtype?: string }).subtype;
  if (subtype && objectiveNativeSubtypes.has(subtype)) return true;
  const mechanic = (page.activity as { mechanic?: string }).mechanic;
  return mechanic === "beginning-sound" || mechanic === "letter-sort";
}

/* ------------------------------------------------------------------ remap */

const assetFields = new Set(["asset", "targetAsset", "startsWith"]);
/** fields holding a LIST of asset keys (a pattern unit, a bin's members…) */
const assetListFields = new Set(["patternUnit", "assets", "memberAssets"]);

function isAssetList(key: string, value: unknown): value is string[] {
  return (
    assetListFields.has(key) &&
    Array.isArray(value) &&
    value.every((item) => typeof item === "string" && item in visualObjects)
  );
}

function collectAssets(node: unknown, found: VisualAssetKey[] = []): VisualAssetKey[] {
  if (Array.isArray(node)) {
    for (const item of node) collectAssets(item, found);
    return found;
  }
  if (node && typeof node === "object") {
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      if (assetFields.has(key) && typeof value === "string" && value in visualObjects) {
        if (!found.includes(value as VisualAssetKey)) found.push(value as VisualAssetKey);
      } else if (isAssetList(key, value)) {
        for (const item of value) {
          if (!found.includes(item as VisualAssetKey)) found.push(item as VisualAssetKey);
        }
      } else {
        collectAssets(value, found);
      }
    }
  }
  return found;
}

export function rewriteText(text: string, map: Map<VisualAssetKey, VisualAssetKey>) {
  let out = text;
  for (const [from, to] of map) {
    const a = visualObjects[from];
    const b = visualObjects[to];
    if (!a || !b) continue;
    out = out
      .replace(new RegExp(`\\b${a.plural}\\b`, "gi"), b.plural)
      .replace(new RegExp(`\\b${a.singular}\\b`, "gi"), b.singular)
      .replace(new RegExp(`\\b${a.label}\\b`, "g"), b.label);
  }
  return out;
}

export function remap<T>(node: T, map: Map<VisualAssetKey, VisualAssetKey>): T {
  if (Array.isArray(node)) return node.map((item) => remap(item, map)) as unknown as T;
  if (node && typeof node === "object") {
    const source = node as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    // the asset on THIS object decides how its own label/word read
    const own = Object.entries(source).find(
      ([key, value]) =>
        assetFields.has(key) && typeof value === "string" && map.has(value as VisualAssetKey),
    );
    const from = own ? (own[1] as VisualAssetKey) : undefined;
    const to = from ? map.get(from) : undefined;
    for (const [key, value] of Object.entries(source)) {
      if (assetFields.has(key) && typeof value === "string" && map.has(value as VisualAssetKey)) {
        out[key] = map.get(value as VisualAssetKey);
      } else if (isAssetList(key, value)) {
        out[key] = value.map((item) => map.get(item as VisualAssetKey) ?? item);
      } else if (
        to &&
        from &&
        (key === "label" || key === "word" || key === "caption" || key === "answerText") &&
        typeof value === "string"
      ) {
        out[key] = rewriteText(value, new Map([[from, to]]));
      } else if (typeof value === "string" && (key === "label" || key === "answerText")) {
        out[key] = rewriteText(value, map);
      } else {
        out[key] = remap(value, map);
      }
    }
    return out as unknown as T;
  }
  return node;
}

/** Content illustrations the page shows (objective-native pages excluded). */
export function pageContentAssets(page: WorksheetPageModel): VisualAssetKey[] {
  return collectAssets(page.activity);
}

/**
 * The illustrations a child is expected to mark/join as CORRECT answers on a
 * contrast page (find-target, sound-hunt, picture→letter matching).
 */
export function targetAssets(page: WorksheetPageModel): VisualAssetKey[] {
  const activity = page.activity as {
    items?: Array<{ asset?: string; isTarget?: boolean }>;
    pictures?: Array<{ asset?: string; isTarget?: boolean }>;
  };
  const rows = activity.items ?? activity.pictures;
  if (!Array.isArray(rows)) return [];
  const flagged = rows.filter((row) => row?.isTarget === true);
  if (!flagged.length || flagged.length === rows.length) return [];
  return [
    ...new Set(
      flagged
        .map((row) => row.asset)
        .filter((asset): asset is VisualAssetKey => Boolean(asset && asset in visualObjects)),
    ),
  ];
}

export type ObjectiveIssue = { code: string; page: number; message: string };

/**
 * OBJECTIVE FIDELITY CHECK — a page passes when it practises the pack
 * objective with its own content and names it in its wording.
 */
export function pageObjectiveIssues(
  objective: PackObjective,
  page: WorksheetPageModel,
  pageNumber: number,
): ObjectiveIssue[] {
  if (!objective.constrainsContent) return [];
  if (isObjectiveNative(page)) return [];
  const assets = pageContentAssets(page);
  if (!assets.length) return [];
  const practising = assets.filter((asset) => assetPractisesObjective(objective, asset));
  const issues: ObjectiveIssue[] = [];
  // CONTRAST TASKS ("circle every picture that begins with /s/", "find the
  // stars") need non-objective pictures to be a real discrimination task. They
  // are judged on their TARGETS, not on the share of objective pictures.
  const targets = targetAssets(page);
  if (targets.length) {
    const offTarget = targets.filter((asset) => !assetPractisesObjective(objective, asset));
    if (offTarget.length) {
      issues.push({
        code: "objective-content-drift",
        page: pageNumber,
        message: `Page ${pageNumber} does not practise the pack objective (${objective.label}): its correct answers are ${targets.join(", ")}.`,
      });
    }
  } else if (practising.length < Math.max(2, Math.ceil(assets.length / 2))) {
    issues.push({
      code: "objective-content-drift",
      page: pageNumber,
      message: `Page ${pageNumber} does not practise the pack objective (${objective.label}): it shows ${assets
        .filter((asset) => !assetPractisesObjective(objective, asset))
        .join(", ")}.`,
    });
  }
  if (objective.kind === "phonics-letter" && !objectiveNamed(objective, page)) {
    issues.push({
      code: "objective-wording",
      page: pageNumber,
      message: `Page ${pageNumber} never names the pack objective (${objective.label}) in its title or instruction.`,
    });
  }
  return issues;
}

function objectiveNamed(objective: PackObjective, page: WorksheetPageModel) {
  if (objective.kind !== "phonics-letter") return true;
  const letter = objective.letter!;
  const text = `${page.title} ${page.instruction} ${page.footerNote ?? ""}`;
  return new RegExp(`(\\b${letter}\\b|/${letter}/)`, "i").test(text);
}

/**
 * OBJECTIVE REPAIR — rebuilds only the CONTENT of a drifting page so it
 * practises the pack objective. The mechanic, structure, answer keys and page
 * position are preserved exactly; nothing is added to a page that already
 * teaches the objective.
 */
export function enforceObjectiveFidelity(
  objective: PackObjective,
  page: WorksheetPageModel,
): WorksheetPageModel {
  if (!objective.constrainsContent || isObjectiveNative(page)) return page;
  const assets = pageContentAssets(page);
  const drifting = assets.filter((asset) => !assetPractisesObjective(objective, asset));
  let repaired = page;

  if (drifting.length) {
    const used = new Set(assets.filter((asset) => assetPractisesObjective(objective, asset)));
    const spare = objective.vocabulary.filter((asset) => !used.has(asset));
    const map = new Map<VisualAssetKey, VisualAssetKey>();
    drifting.forEach((asset, index) => {
      const replacement = spare[index];
      if (replacement) map.set(asset, replacement);
    });
    if (map.size) {
      repaired = {
        ...remap(page, map),
        title: rewriteText(page.title, map),
        instruction: rewriteText(page.instruction, map),
        ...(page.footerNote ? { footerNote: rewriteText(page.footerNote, map) } : {}),
      };
    }
  }

  if (!objectiveNamed(objective, repaired)) {
    const upper = objective.letter!.toUpperCase();
    repaired = {
      ...repaired,
      title: `${repaired.title} — Letter ${upper}`,
      instruction: `${repaired.instruction} ${objective.reinforcement}`,
    };
  }
  return repaired;
}

/** Every objective breach in a finished pack, in page order. */
export function objectiveFidelityIssues(
  spec: WorksheetSpec,
  project: { pages: WorksheetPageModel[] },
): ObjectiveIssue[] {
  const objective = resolveLearningObjective(spec);
  if (!objective.constrainsContent) return [];
  return project.pages.flatMap((page, index) => pageObjectiveIssues(objective, page, index + 1));
}

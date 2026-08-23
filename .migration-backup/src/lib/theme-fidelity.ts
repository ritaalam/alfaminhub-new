/**
 * THEME FIDELITY + PEDAGOGICAL RELEVANCE
 * --------------------------------------
 * Four constraints must hold together on every page: the requested MECHANIC
 * (page-plan contract), the pack LEARNING OBJECTIVE (learning-objective.ts),
 * the requested THEME, and AGE appropriateness. This module owns the last
 * three-and-a-half:
 *
 *   THEME FIDELITY  — a space pack draws space pictures. Off-theme artwork is
 *                     remapped onto theme artwork one-to-one, so the mechanic,
 *                     structure and answer keys are untouched.
 *   PEDAGOGY        — the child's ACTION must practise the objective, not just
 *                     sit next to objective vocabulary: matching becomes
 *                     picture→initial-letter, same/different becomes
 *                     beginning-sound discrimination, a traced path runs from
 *                     the letter to a picture that begins with it.
 *   AGE             — page item counts stay inside the age band.
 *
 * Repairs NEVER change the requested mechanic: a match page stays match-pairs,
 * a pick-one page stays pick-one, a trace page stays trace-draw.
 */

import type { WorksheetSpec } from "./creator-options";
import { resolveAgeTokens } from "./age-tokens";
import {
  assetPractisesObjective,
  isObjectiveNative,
  objectiveWordFor,
  pageContentAssets,
  remap,
  resolveLearningObjective,
  rewriteText,
  type PackObjective,
} from "./learning-objective";
import { visualObjects } from "./semantic-topics";
import { inTheme, resolveThemeScope, themeWordFor, type ThemeScope } from "./theme-scope";
import { sortBinAccepts, type VisualAssetKey, type WorksheetPageModel } from "./worksheet-model";

export type QualityIssue = { code: string; page: number; message: string };

/* -------------------------------------------------------------- theme fit */

export function themeFidelityIssues(
  scope: ThemeScope,
  page: WorksheetPageModel,
  pageNumber: number,
): QualityIssue[] {
  if (!scope.constrains) return [];
  // the page's pictures are its specification (object→shape, sorting,
  // composed pages) — off-theme artwork there is required, not drift
  if (page.contentLocked) return [];
  const off = [...new Set(pageContentAssets(page).filter((asset) => !inTheme(scope, asset)))];
  if (!off.length) return [];
  return [
    {
      code: "theme-drift",
      page: pageNumber,
      message: `Page ${pageNumber} breaks the ${scope.label} theme: it shows ${off.join(", ")}.`,
    },
  ];
}

/** Rewrites picture names so themed artwork reads with its themed word. */
function applyPackWords<T>(node: T, objective: PackObjective): T {
  if (Array.isArray(node))
    return node.map((item) => applyPackWords(item, objective)) as unknown as T;
  if (node && typeof node === "object") {
    const source = node as Record<string, unknown>;
    const asset =
      typeof source["asset"] === "string" ? (source["asset"] as VisualAssetKey) : undefined;
    const themedWord = asset ? objective.words[asset] : undefined;
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(source)) {
      if (themedWord && (key === "label" || key === "word") && typeof value === "string") {
        out[key] = themedWord;
      } else {
        out[key] = applyPackWords(value, objective);
      }
    }
    return out as unknown as T;
  }
  return node;
}

/** Recomputes derived phonics fields after artwork has been remapped. */
function refreshSoundHunt(page: WorksheetPageModel, objective: PackObjective): WorksheetPageModel {
  if (page.activity.kind !== "sound-hunt") return page;
  const items = page.activity.items.map((item) => {
    const word = objectiveWordFor(objective, item.asset);
    return {
      ...item,
      word,
      initialPhoneme: `/${word.charAt(0).toLowerCase()}/`,
      isTarget: word.charAt(0).toLowerCase() === objective.letter,
    };
  });
  return { ...page, activity: { ...page.activity, items } };
}

/**
 * THEME REPAIR — every off-theme illustration is swapped for a theme one.
 * Pictures that practise the objective are replaced by theme pictures that
 * also practise it; distractors are replaced by theme distractors, so a
 * phonics contrast stays a contrast.
 */
export function enforceThemeFidelity(
  scope: ThemeScope,
  objective: PackObjective,
  page: WorksheetPageModel,
): WorksheetPageModel {
  if (!scope.constrains || page.contentLocked) return page;
  const assets = pageContentAssets(page);
  const off = assets.filter((asset) => !inTheme(scope, asset));
  if (!off.length) return applyPackWords(page, objective);

  const used = new Set(assets.filter((asset) => inTheme(scope, asset)));
  const objectiveThemeAssets = scope.assets.filter(
    (asset) => assetPractisesObjective(objective, asset) && objective.constrainsContent,
  );
  const otherThemeAssets = scope.assets.filter((asset) => !objectiveThemeAssets.includes(asset));
  const take = (pool: VisualAssetKey[]) => {
    const next = pool.find((asset) => !used.has(asset));
    if (next) used.add(next);
    return next;
  };

  const map = new Map<VisualAssetKey, VisualAssetKey>();
  for (const asset of off) {
    const wantsObjective = objective.constrainsContent && assetPractisesObjective(objective, asset);
    const replacement = wantsObjective
      ? (take(objectiveThemeAssets) ?? take(otherThemeAssets))
      : (take(otherThemeAssets) ?? take(objectiveThemeAssets));
    if (replacement) map.set(asset, replacement);
  }
  if (!map.size) return dropOffThemeItems(scope, applyPackWords(page, objective));

  const repaired: WorksheetPageModel = {
    ...remap(page, map),
    title: rewriteText(page.title, map),
    instruction: rewriteText(page.instruction, map),
    ...(page.footerNote ? { footerNote: rewriteText(page.footerNote, map) } : {}),
  };
  return refreshSoundHunt(dropOffThemeItems(scope, applyPackWords(repaired, objective)), objective);
}

/**
 * When the theme has no unused picture left to swap in, an off-theme item is
 * REMOVED rather than kept: a space page never shows an apple. Only applies to
 * list-shaped activities, where dropping one row is harmless.
 */
function dropOffThemeItems(scope: ThemeScope, page: WorksheetPageModel): WorksheetPageModel {
  if (!scope.constrains || page.contentLocked) return page;
  const activity = page.activity as unknown as {
    items?: Array<{ id: string; asset?: VisualAssetKey }>;
  };
  if (!Array.isArray(activity.items) || activity.items.length < 5) return page;
  const kept = activity.items.filter((item) => !item.asset || inTheme(scope, item.asset));
  if (kept.length === activity.items.length || kept.length < 4) return page;
  const dropped = new Set(
    activity.items.filter((item) => !kept.includes(item)).map((item) => item.id),
  );
  const next = {
    ...page,
    activity: { ...page.activity, items: kept } as WorksheetPageModel["activity"],
    // only entries belonging to a REMOVED item disappear; sorting pages key
    // their answers by BIN, so those entries must survive and be recounted
    answerKey: page.answerKey.filter((entry) => !dropped.has(entry.groupId)),
  };
  if (next.activity.kind === "sort-groups") {
    const sorting = next.activity;
    return {
      ...next,
      answerKey: sorting.bins.map((bin) => ({
        groupId: bin.id,
        answer: sorting.items.filter((item) => sortBinAccepts(bin, item)).length,
        ...(bin.label ? { answerText: bin.label } : {}),
      })),
    };
  }
  return next;
}

/* --------------------------------------------------------------- pedagogy */

/** Pages whose child-action must be checked against a phonics objective. */
function pedagogicalKind(page: WorksheetPageModel) {
  return (
    page.activity.kind === "match-pairs" ||
    page.activity.kind === "pick-one" ||
    page.activity.kind === "trace-draw"
  );
}

export function pedagogicalIssues(
  objective: PackObjective,
  page: WorksheetPageModel,
  pageNumber: number,
): QualityIssue[] {
  if (objective.kind !== "phonics-letter" || !pedagogicalKind(page)) return [];
  const subtype = (page.activity as { subtype?: string }).subtype;
  if (page.activity.kind === "match-pairs" && subtype === "identical-pairs") {
    return [
      {
        code: "pedagogy-shallow-match",
        page: pageNumber,
        message: `Page ${pageNumber} only matches identical pictures and never practises ${objective.label}.`,
      },
    ];
  }
  return [];
}

const letterOf = (objective: PackObjective, asset: VisualAssetKey) =>
  objectiveWordFor(objective, asset).charAt(0).toUpperCase();

/** Pictures with DISTINCT initial letters, objective picture first. */
function discriminationSet(
  objective: PackObjective,
  scope: ThemeScope,
  page: WorksheetPageModel,
  size: number,
): VisualAssetKey[] {
  const pool = [
    ...objective.vocabulary,
    ...pageContentAssets(page),
    ...(scope.constrains ? scope.assets : []),
  ];
  const picked: VisualAssetKey[] = [];
  const letters = new Set<string>();
  for (const asset of pool) {
    if (!visualObjects[asset]) continue;
    if (scope.constrains && !inTheme(scope, asset)) continue;
    const letter = letterOf(objective, asset);
    if (letters.has(letter)) continue;
    letters.add(letter);
    picked.push(asset);
    if (picked.length >= size) break;
  }
  return picked;
}

/**
 * PEDAGOGICAL REPAIR — keeps the requested mechanic and rebuilds only the
 * task inside it so the child's action practises the objective.
 */
export function enforcePedagogicalRelevance(
  objective: PackObjective,
  scope: ThemeScope,
  page: WorksheetPageModel,
): WorksheetPageModel {
  if (objective.kind !== "phonics-letter") return page;
  const upper = objective.letter!.toUpperCase();

  /* MATCHING — picture to the letter its name begins with. */
  if (page.activity.kind === "match-pairs" && page.activity.subtype !== "baby-parent") {
    const pictures = discriminationSet(
      objective,
      scope,
      page,
      Math.max(3, page.activity.left.length),
    );
    if (pictures.length < 3) return page;
    const left = pictures.map((asset, index) => ({
      id: `${page.id}-pic-${index}`,
      pairId: `${page.id}-pair-${index}`,
      asset,
      label: objectiveWordFor(objective, asset),
    }));
    const right = [...pictures]
      .map((asset, index) => ({ asset, index }))
      .reverse()
      .map(({ asset, index }) => ({
        id: `${page.id}-letter-${index}`,
        pairId: `${page.id}-pair-${index}`,
        asset,
        letter: letterOf(objective, asset),
      }));
    return {
      ...page,
      title: page.title.includes(upper) ? page.title : `${page.title} — Letter ${upper}`,
      instruction: `Sound matching — say each picture name out loud and draw a line to match it with the letter its name begins with. Listen for the /${objective.letter}/ sound.`,
      activity: { ...page.activity, subtype: "sound-to-picture", left, right },
      answerKey: left.map((item, index) => ({ groupId: item.id, answer: index + 1 })),
    };
  }

  /* SAME / DIFFERENT — discriminate by beginning sound, not by looks. */
  if (page.activity.kind === "pick-one" && !page.activity.rows.some((row) => row.patternRule)) {
    const targets = objective.vocabulary.filter((asset) =>
      assetPractisesObjective(objective, asset),
    );
    const others = discriminationSet(objective, scope, page, 8).filter(
      (asset) => !assetPractisesObjective(objective, asset),
    );
    if (targets.length && others.length >= 2) {
      const rows = page.activity.rows.map((row, rowIndex) => {
        const target = targets[rowIndex % targets.length]!;
        const distractors = [
          others[rowIndex % others.length]!,
          others[(rowIndex + 1) % others.length]!,
        ];
        const assets =
          rowIndex % 2 ? [distractors[0]!, target, distractors[1]!] : [target, ...distractors];
        const options = assets.map((asset, index) => ({
          id: `${row.id}-opt-${index}`,
          renderedObjects: [
            {
              id: `${row.id}-obj-${index}`,
              asset,
              label: objectiveWordFor(objective, asset),
            },
          ],
          label: objectiveWordFor(objective, asset),
        }));
        const answer = options.find((option) =>
          assetPractisesObjective(objective, option.renderedObjects[0]!.asset),
        )!;
        return {
          ...row,
          promptLabel: `/${objective.letter}/`,
          promptObjects: [],
          options,
          answerOptionId: answer.id,
        };
      });
      return {
        ...page,
        title: page.title.includes(upper) ? page.title : `${page.title} — Letter ${upper}`,
        instruction: `Say each picture name out loud. Circle the picture in every row that begins with the /${objective.letter}/ sound.`,
        activity: { ...page.activity, subtype: "sound-choice", rows },
        answerKey: rows.map((row) => ({
          groupId: row.id,
          answer: row.options.findIndex((option) => option.id === row.answerOptionId) + 1,
        })),
      } as WorksheetPageModel;
    }
  }

  /* TRACE PATH — from the letter to a picture that begins with it. */
  if (page.activity.kind === "trace-draw" && page.activity.paths?.length) {
    const specific = page.activity.paths.some((path) =>
      /food|parent|baby|home|nest/i.test(path.relationship ?? ""),
    );
    const targets = objective.vocabulary.filter((asset) =>
      assetPractisesObjective(objective, asset),
    );
    if (!specific && targets.length) {
      const paths = page.activity.paths.map((path, index) => {
        const asset = targets[index % targets.length]!;
        // the "from" card prints the LETTER, so its artwork is never drawn —
        // it only has to stay distinct from the picture it leads to
        const fromAsset =
          (scope.constrains ? scope.assets : objective.vocabulary).find((item) => item !== asset) ??
          path.from.asset;
        return {
          ...path,
          from: { ...path.from, asset: fromAsset, letter: upper, label: upper },
          to: { ...path.to, asset, label: objectiveWordFor(objective, asset) },
          relationship: "letter-to-sound-picture",
        };
      });
      return {
        ...page,
        title: page.title.includes(upper) ? page.title : `${page.title} — Letter ${upper}`,
        instruction: `Trace each path from the letter ${upper} to the picture whose name begins with the /${objective.letter}/ sound.`,
        activity: { ...page.activity, subtype: "path-tracing", paths },
      };
    }
  }
  return page;
}

/* -------------------------------------------------------------------- age */

export function ageAppropriatenessIssues(
  level: string,
  page: WorksheetPageModel,
  pageNumber: number,
): QualityIssue[] {
  const tokens = resolveAgeTokens(level);
  // A multiple-choice page prints one picture per printed option, so its own
  // structure — not the age default — sets the floor for how many distinct
  // pictures may appear.
  const structural =
    page.activity.kind === "pick-one"
      ? page.activity.rows.reduce((total, row) => total + row.options.length, 0)
      : 0;
  const explicitlyRequested = page.semanticRequirements?.requiredItemCount ?? 0;
  // An exact teacher-authored quantity is the page contract. It may be denser
  // than the age preset, but must not be rejected merely for exceeding a
  // template default after the layout engine has already accepted it.
  const max = Math.max(8, (tokens.itemsPerPage ?? 8) * 2, structural, explicitlyRequested);
  const assets = pageContentAssets(page);
  if (assets.length > max) {
    return [
      {
        code: "age-overload",
        page: pageNumber,
        message: `Page ${pageNumber} shows ${assets.length} different pictures, too many for ${level}.`,
      },
    ];
  }
  return [];
}

/* --------------------------------------------------------------- pipeline */

/** Theme + pedagogy repair, run after learning-objective repair. */
export function enforceThemeAndPedagogy(
  spec: WorksheetSpec,
  page: WorksheetPageModel,
): WorksheetPageModel {
  const objective = resolveLearningObjective(spec);
  const scope = resolveThemeScope(spec);
  const pedagogic = isObjectiveNative(page)
    ? page
    : enforcePedagogicalRelevance(objective, scope, page);
  return enforceThemeFidelity(scope, objective, pedagogic);
}

/** Every theme / pedagogy / age breach in a finished pack, in page order. */
export function packQualityIssues(
  spec: WorksheetSpec,
  project: { pages: WorksheetPageModel[]; meta?: { level?: string } },
): QualityIssue[] {
  const objective = resolveLearningObjective(spec);
  const scope = resolveThemeScope(spec);
  const level = project.meta?.level ?? spec.level ?? "";
  return project.pages.flatMap((page, index) => [
    ...themeFidelityIssues(scope, page, index + 1),
    ...pedagogicalIssues(objective, page, index + 1),
    ...ageAppropriatenessIssues(level, page, index + 1),
  ]);
}

export { themeWordFor, resolveThemeScope };

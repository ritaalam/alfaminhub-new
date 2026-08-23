/**
 * Objective-specific page builders.
 *
 * Each builder produces a printable whose MECHANIC matches the learning
 * objective it was asked for: a "more & fewer" objective renders two groups to
 * compare, never a generic counting page. Every builder stamps the mechanic id
 * onto the activity so validation can prove the objective survived generation.
 */

import { resolveAgeTokens } from "./age-tokens";
import { characterForAsset } from "./alfa-characters";
import {
  directionForTheme,
  resolveIllustrationStyle,
  resolveVisualDirection,
  type IllustrationPurpose,
} from "./visual-directions";
import { visualObjects } from "./semantic-topics";
import { basicShapes, shapePairs } from "./object-semantics";
import { resolveSubject } from "./worksheet-subjects";
import { compositionAssets, supportingAssets } from "./worksheet-vocabulary";
import { buildPatternRow, validatePatternRow } from "./worksheet-patterns";
import { buildMemoryPairsPage } from "./worksheet-memory";
import { buildNumberWritePage } from "./worksheet-numerals";
import type { WorksheetSpec } from "./creator-options";
import type { ObjectiveProfile } from "./worksheet-objectives";
import type {
  OrderItem,
  PatternRuleId,
  PickOption,
  PickRow,
  RenderedCountObject,
  PageSemanticRequirements,
  VisualAssetKey,
  WorksheetPageModel,
} from "./worksheet-model";

/** Mandatory + flexible content nouns, mandatory first. */
function contentEntities(
  requirements:
    | { requiredEntities: readonly VisualAssetKey[]; preferredEntities?: readonly VisualAssetKey[] }
    | undefined,
): VisualAssetKey[] {
  if (!requirements) return [];
  return [
    ...new Set([...requirements.requiredEntities, ...(requirements.preferredEntities ?? [])]),
  ];
}

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

function shuffle<T>(items: T[], next: () => number) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

function styleFor(spec: WorksheetSpec, purpose: IllustrationPurpose) {
  return resolveIllustrationStyle({
    direction: resolveVisualDirection(directionForTheme(spec.theme, spec.inspiration)),
    purpose,
    ageId: resolveAgeTokens(spec.level).id,
  });
}

function objectsOf(id: string, count: number, asset: VisualAssetKey): RenderedCountObject[] {
  const character = characterForAsset(asset);
  return Array.from({ length: count }, (_, i) => ({
    id: `${id}-object-${i + 1}`,
    asset,
    ...(character ? { character } : {}),
  }));
}

type BuildContext = {
  spec: WorksheetSpec;
  profile: ObjectiveProfile;
  seed: number;
  range: [number, number];
  semanticRequirements?: PageSemanticRequirements;
  /** canonical picture words already used by earlier explicitly distinct pages */
  excludedWords?: string[];
};

function base(ctx: BuildContext, extra: Pick<WorksheetPageModel, "title" | "instruction">) {
  const subject = resolveSubject(ctx.spec);
  return {
    id: "page-1",
    activityType: ctx.profile.activityLabel,
    purpose: "counting" as IllustrationPurpose,
    illustrationStyle: styleFor(ctx.spec, "counting"),
    mascot: characterForAsset(subject.assets[0]!),
    ...extra,
  };
}

export function buildFindTargetPage(ctx: BuildContext): WorksheetPageModel {
  const next = rng(ctx.seed + 5011);
  const subject = resolveSubject(ctx.spec);
  const target = contentEntities(ctx.semanticRequirements)[0] ?? subject.assets[0]!;
  const distractors = subject.assets.filter(
    (asset) => asset !== target && !["tractor", "carrot", "apple", "egg"].includes(asset),
  );
  const assets = shuffle(
    [target, target, target, ...distractors, ...distractors].slice(0, 8),
    next,
  );
  const items = assets.map((asset, index) => ({
    id: `find-${index + 1}`,
    asset,
    isTarget: asset === target,
  }));
  return {
    ...base(ctx, {
      title: `Find the ${visualObjects[target].label}`,
      instruction: `Find and circle every ${visualObjects[target].singular}.`,
    }),
    activityType: "Find",
    layout: "stacked-rows",
    activity: { kind: "find-target", mechanic: "find-target", targetAsset: target, items },
    answerKey: items
      .filter((item) => item.isTarget)
      .map((item, index) => ({ groupId: item.id, answer: index + 1 })),
  } as WorksheetPageModel;
}

export function buildMatchPairsPage(ctx: BuildContext): WorksheetPageModel {
  const next = rng(ctx.seed + 5021);
  const subject = resolveSubject(ctx.spec);
  // OBJECT → SHAPE: the child relates a real thing to the geometric shape it
  // looks like. This is a different question from "find the identical picture"
  // and may never be answered with a look-alike match.
  if (ctx.semanticRequirements?.activitySubtype === "object-to-shape") {
    const pairs = shapePairs(4);
    const left = pairs.map((pair, index) => ({
      id: `shape-left-${index + 1}`,
      pairId: `shape-pair-${index + 1}`,
      asset: pair.object,
      label: visualObjects[pair.object].singular,
    }));
    const right = shuffle(
      pairs.map((pair, index) => ({
        id: `shape-right-${index + 1}`,
        pairId: `shape-pair-${index + 1}`,
        asset: pair.shape as VisualAssetKey,
        label: visualObjects[pair.shape as VisualAssetKey].singular,
      })),
      next,
    );
    return {
      ...base(ctx, {
        title: "Which Shape Is It Like?",
        instruction: "Draw a line from each object to the shape it looks like.",
      }),
      activityType: "Match Objects to Shapes",
      layout: "two-column-match",
      activity: {
        kind: "match-pairs",
        mechanic: "match-pairs",
        subtype: "object-to-shape",
        relationship: "object-to-shape",
        left,
        right,
      },
      answerKey: left.map((item) => {
        const partner = right.find((card) => card.pairId === item.pairId);
        return {
          groupId: item.id,
          answer: partner ? right.indexOf(partner) + 1 : 0,
          answerText: partner?.asset ?? "",
        };
      }),
      // The pairing IS the specification: an everyday object on the left and
      // the geometric shape it resembles on the right. Theme repair may not
      // swap either side, or the pair stops being educationally correct.
      contentLocked: true,
      footerNote: "Say the shape name out loud before you draw the line.",
    } as WorksheetPageModel;
  }
  const babyParent = ctx.semanticRequirements?.activitySubtype === "baby-parent";
  const pairs: Array<{
    baby: VisualAssetKey;
    parent: VisualAssetKey;
    babyLabel: string;
    parentLabel: string;
  }> = babyParent
    ? [
        { baby: "calf", parent: "cow", babyLabel: "Calf", parentLabel: "Cow" },
        { baby: "lamb", parent: "sheep", babyLabel: "Lamb", parentLabel: "Sheep" },
        { baby: "chick", parent: "chicken", babyLabel: "Chick", parentLabel: "Chicken" },
        { baby: "piglet", parent: "pig", babyLabel: "Piglet", parentLabel: "Pig" },
      ]
    : subject.assets.slice(0, 4).map((asset) => ({
        baby: asset,
        parent: asset,
        babyLabel: visualObjects[asset].singular,
        parentLabel: visualObjects[asset].singular,
      }));
  const left = pairs.map((pair, index) => ({
    id: `match-left-${index + 1}`,
    pairId: `pair-${index + 1}`,
    asset: pair.baby,
    label: pair.babyLabel,
  }));
  const right = shuffle(
    pairs.map((pair, index) => ({
      id: `match-right-${index + 1}`,
      pairId: `pair-${index + 1}`,
      asset: pair.parent,
      label: pair.parentLabel,
    })),
    next,
  );
  return {
    ...base(
      ctx,
      babyParent
        ? {
            title: "Baby Animals & Parents",
            instruction: "Draw a line from each baby animal to its parent.",
          }
        : {
            title: `Match the ${subject.label}`,
            instruction: "Draw a line between each matching pair.",
          },
    ),
    activityType: "Match",
    layout: "two-column-match",
    activity: {
      kind: "match-pairs",
      mechanic: "match-pairs",
      subtype: babyParent ? "baby-parent" : "identical-pairs",
      ...(babyParent ? { relationship: "baby-to-parent" } : {}),
      left,
      right,
    },
    answerKey: left.map((item, index) => ({
      groupId: item.id,
      answer: index + 1,
      answerText: item.pairId,
    })),
  } as WorksheetPageModel;
}

export function buildTraceDrawPage(ctx: BuildContext): WorksheetPageModel {
  const subject = resolveSubject(ctx.spec);
  if (ctx.semanticRequirements?.activitySubtype?.includes("path")) {
    const animalFood = ctx.semanticRequirements.requiredRelationships.includes("animal-to-food");
    const themed = contentEntities(ctx.semanticRequirements).filter(
      (asset) => asset in visualObjects,
    );
    const pool = themed.length >= 2 ? themed : subject.assets;
    const routes: Array<{
      animal: VisualAssetKey;
      food: VisualAssetKey;
      animalLabel: string;
      foodLabel: string;
    }> = animalFood
      ? [
          { animal: "cow", food: "flower", animalLabel: "Cow", foodLabel: "Grass" },
          { animal: "chicken", food: "seed", animalLabel: "Chicken", foodLabel: "Seeds" },
          { animal: "pig", food: "apple", animalLabel: "Pig", foodLabel: "Apple" },
          { animal: "sheep", food: "leaf", animalLabel: "Sheep", foodLabel: "Leaves" },
        ]
      : Array.from({ length: 4 }, (_unused, index) => {
          const from = pool[index % pool.length]!;
          const to = pool[(index + 1) % pool.length]!;
          return {
            animal: from,
            food: to,
            animalLabel: visualObjects[from].singular,
            foodLabel: visualObjects[to].singular,
          };
        });
    const paths = routes.map((route, index) => ({
      id: `food-path-${index + 1}`,
      from: { id: `path-animal-${index + 1}`, asset: route.animal, label: route.animalLabel },
      to: { id: `path-food-${index + 1}`, asset: route.food, label: route.foodLabel },
      relationship: animalFood ? "animal-to-food" : "start-to-finish",
    }));
    return {
      ...base(
        ctx,
        animalFood
          ? {
              title: "Help the Farm Animals",
              instruction: "Trace each path to help the farm animal reach its food.",
            }
          : {
              title: "Trace the Path",
              instruction: "Trace each path from the start picture to the finish picture.",
            },
      ),
      activityType: "Trace Paths",
      layout: "stacked-rows",
      activity: {
        kind: "trace-draw",
        mechanic: "trace-draw",
        subtype: "path-tracing",
        shapes: [],
        paths,
      },
      answerKey: paths.map((path, index) => ({
        groupId: path.id,
        answer: index + 1,
        answerText: path.relationship,
      })),
    } as WorksheetPageModel;
  }
  // the shapes the teacher named come first; the theme only fills gaps
  const requested = contentEntities(ctx.semanticRequirements);
  const namedShapes = requested.filter((asset) => (basicShapes as string[]).includes(asset));
  const traced = (
    namedShapes.length ? namedShapes : requested.length ? requested : subject.assets
  ).slice(0, 4);
  const shapes = traced.map((asset, index) => ({
    id: `trace-shape-${index + 1}`,
    asset,
    label: visualObjects[asset].singular,
  }));
  return {
    ...base(ctx, {
      title: "Trace & Draw Shapes",
      instruction: "Trace each dotted shape. Then draw it by yourself.",
    }),
    activityType: "Trace & Draw",
    layout: "stacked-rows",
    activity: { kind: "trace-draw", mechanic: "trace-draw", shapes },
    answerKey: shapes.map((shape, index) => ({
      groupId: shape.id,
      answer: index + 1,
      answerText: shape.label,
    })),
  } as WorksheetPageModel;
}

/** builds a pick-one page from prepared rows */
function pickPage(
  ctx: BuildContext,
  rows: PickRow[],
  copy: { title: string; instruction: string; challenge?: string; footerNote?: string },
): WorksheetPageModel {
  return {
    ...base(ctx, { title: copy.title, instruction: copy.instruction }),
    layout: "stacked-rows",
    activity: {
      kind: "pick-one",
      mechanic: ctx.profile.mechanic,
      rows,
      ...(copy.challenge ? { challenge: copy.challenge } : {}),
    },
    answerKey: rows.map((row) => ({
      groupId: row.id,
      answer: row.options.findIndex((o) => o.id === row.answerOptionId) + 1,
      answerText: row.answerOptionId,
    })),
    ...(copy.footerNote ? { footerNote: copy.footerNote } : {}),
  } as WorksheetPageModel;
}

/* ---------------------------------------------------------------- more / fewer */

export function buildComparePage(ctx: BuildContext): WorksheetPageModel {
  const next = rng(ctx.seed + 311);
  const tokens = resolveAgeTokens(ctx.spec.level);
  const subject = resolveSubject(ctx.spec);
  const assets = subject.locked ? subject.assets : shuffle(subject.assets, next);
  const [min, max] = ctx.range;
  const rowCount = Math.max(3, Math.min(4, tokens.itemsPerPage - 1));
  const fixedVariant = ctx.profile.variant === "fewer" ? "fewer" : "more";
  const teachBoth = ctx.spec.objectiveId === "compare-quantity";

  const rows: PickRow[] = Array.from({ length: rowCount }, (_, i) => {
    const id = `p1-cmp${i + 1}`;
    const asset = assets[i % assets.length]!;
    // two clearly different quantities so "more" is unambiguous
    const small = Math.max(min, 1 + Math.floor(next() * Math.max(1, Math.floor((max - min) / 2))));
    const big = Math.min(max, small + 1 + Math.floor(next() * 2) + 1);
    const low = Math.min(small, big - 1);
    const high = Math.max(big, low + 2);
    const optionA: PickOption = {
      id: `${id}-a`,
      renderedObjects: objectsOf(`${id}-a`, low, asset),
    };
    const optionB: PickOption = {
      id: `${id}-b`,
      renderedObjects: objectsOf(`${id}-b`, high, asset),
    };
    const options = next() > 0.5 ? [optionA, optionB] : [optionB, optionA];
    const rowVariant = teachBoth ? (i % 2 === 0 ? "more" : "fewer") : fixedVariant;
    return {
      id,
      promptLabel: rowVariant.toUpperCase(),
      options,
      answerOptionId: rowVariant === "more" ? optionB.id : optionA.id,
    };
  });

  return pickPage(ctx, rows, {
    title: teachBoth
      ? "Which Group Has More or Fewer?"
      : fixedVariant === "more"
        ? "Which Group Has More?"
        : "Which Group Has Fewer?",
    instruction: teachBoth
      ? `Look at both groups of ${subject.plural}. Circle the group named MORE or FEWER in each row.`
      : `Look at both groups of ${subject.plural}. Circle the group with ${fixedVariant.toUpperCase()}.`,
    challenge: `Can you say how many ${subject.plural} are in each group?`,
    footerNote: "Compare first, then count to check.",
  });
}

/* ---------------------------------------------------------------- big / small */

export function buildSizePage(ctx: BuildContext): WorksheetPageModel {
  const next = rng(ctx.seed + 733);
  const tokens = resolveAgeTokens(ctx.spec.level);
  const subject = resolveSubject(ctx.spec);
  const assets = subject.locked ? subject.assets : shuffle(subject.assets, next);
  const rowCount = Math.max(3, Math.min(4, tokens.itemsPerPage - 1));
  const wantBig = ctx.profile.variant !== "smaller";

  const rows: PickRow[] = Array.from({ length: rowCount }, (_, i) => {
    const id = `p1-size${i + 1}`;
    const asset = assets[i % assets.length]!;
    const bigOption: PickOption = {
      id: `${id}-big`,
      renderedObjects: objectsOf(`${id}-big`, 1, asset),
      scale: 1,
    };
    const smallOption: PickOption = {
      id: `${id}-small`,
      renderedObjects: objectsOf(`${id}-small`, 1, asset),
      scale: 0.5,
    };
    const options = next() > 0.5 ? [bigOption, smallOption] : [smallOption, bigOption];
    return { id, options, answerOptionId: wantBig ? bigOption.id : smallOption.id };
  });

  return pickPage(ctx, rows, {
    title: wantBig ? "Circle the Big One" : "Circle the Small One",
    instruction: `In each row, circle the ${wantBig ? "BIGGER" : "SMALLER"} picture.`,
    footerNote: "Point and say: big or small?",
  });
}

/* ---------------------------------------------------------------- same / different */

export function buildSameDifferentPage(ctx: BuildContext): WorksheetPageModel {
  const next = rng(ctx.seed + 1201);
  const tokens = resolveAgeTokens(ctx.spec.level);
  const subject = resolveSubject(ctx.spec);
  // when the subject is a single locked object we introduce the odd card from
  // the theme's supporting vocabulary rather than shrinking the same drawing:
  // size is never used as decoration, only where size is the concept taught.
  const assets =
    subject.assets.length > 1
      ? subject.assets
      : [subject.assets[0]!, ...supportingAssets(subject, 2)];
  const rowCount = Math.max(3, Math.min(4, tokens.itemsPerPage - 1));
  const wantDifferent = ctx.profile.variant === "different";

  const rows: PickRow[] = Array.from({ length: rowCount }, (_, i) => {
    const id = `p1-sd${i + 1}`;
    const asset = subject.assets[i % subject.assets.length]!;
    const odd = assets.find((candidate) => candidate !== asset) ?? asset;
    const oddIndex = Math.floor(next() * 3);
    const options: PickOption[] = Array.from({ length: 3 }, (_, k) => ({
      id: `${id}-o${k + 1}`,
      renderedObjects: objectsOf(`${id}-o${k + 1}`, 1, k === oddIndex ? odd : asset),
    }));
    // when we ask for "the same", the answer is any matching card — we use the
    // first card that is NOT the odd one so there is exactly one keyed answer.
    const sameId = options.find((_, k) => k !== oddIndex)!.id;
    return {
      id,
      promptObjects: objectsOf(`${id}-prompt`, 1, asset),
      options,
      answerOptionId: wantDifferent ? options[oddIndex]!.id : sameId,
    };
  });

  return pickPage(ctx, rows, {
    title: wantDifferent ? "Which One Is Different?" : "Which One Is the Same?",
    instruction: wantDifferent
      ? "Look at each row. Circle the picture that is DIFFERENT."
      : "Look at the first picture. Circle the one that is the SAME.",
    footerNote: "Look closely before you choose.",
  });
}

/* ---------------------------------------------------------------- beginning sounds */

export function buildBeginningSoundPage(ctx: BuildContext): WorksheetPageModel {
  const next = rng(ctx.seed + 1607);
  const tokens = resolveAgeTokens(ctx.spec.level);
  const subject = resolveSubject(ctx.spec);
  const pool = shuffle([...subject.assets], next);
  const rowCount = Math.max(3, Math.min(4, tokens.itemsPerPage - 1));

  const rows: PickRow[] = Array.from({ length: rowCount }, (_, i) => {
    const id = `p1-snd${i + 1}`;
    const target = pool[i % pool.length]!;
    const targetWord = visualObjects[target].singular;
    const letter = targetWord.charAt(0).toUpperCase();
    // distractors must start with a DIFFERENT letter, otherwise two answers work
    const others = pool.filter(
      (a) =>
        visualObjects[a].singular.charAt(0).toLowerCase() !== targetWord.charAt(0).toLowerCase(),
    );
    const distractors = (others.length ? others : pool.filter((a) => a !== target)).slice(0, 2);
    const cards: VisualAssetKey[] = [target, ...distractors];
    while (cards.length < 3) cards.push(target);
    const options: PickOption[] = shuffle(cards.slice(0, 3), next).map((asset, k) => ({
      id: `${id}-o${k + 1}-${asset}`,
      renderedObjects: objectsOf(`${id}-o${k + 1}`, 1, asset),
      label: visualObjects[asset].singular,
    }));
    const answer = options.find((o) => o.label === targetWord)!;
    return { id, promptLabel: letter, options, answerOptionId: answer.id };
  });

  return pickPage(ctx, rows, {
    title: "Beginning Sounds",
    instruction: "Say the letter sound. Circle the picture that starts with that sound.",
    footerNote: "Say each word out loud before choosing.",
  });
}

/* ---------------------------------------------------------------- patterns */

/**
 * Real repeating patterns.
 *
 * Each row declares an explicit rule (AB, AAB, ABB, ABC), expands it into a
 * sequence, and derives the missing item FROM THE RULE — so there is exactly
 * one logically correct answer. Objects differ by identity, never by size, and
 * the row is verified programmatically before it can be returned.
 */

/**

 * Exact number of pattern rows the teacher asked for, e.g. "exactly 6 AB
 * patterns" or "6 rows". Structured requirements win; plain text is the
 * fallback so a written quantity is never lost.
 */
function requestedPatternCount(
  requirements: BuildContext["semanticRequirements"],
): number | undefined {
  if (!requirements) return undefined;
  if (requirements.requiredItemCount && requirements.requiredItemCount > 0) {
    return Math.min(requirements.requiredItemCount, 8);
  }
  const words: Record<string, number> = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
  };
  const match =
    /(\d{1,2}|one|two|three|four|five|six|seven|eight)\s+(?:[a-z]{2,4}\s+)?(patterns?|rows?|sequences?)\b/i.exec(
      requirements.pageIntent,
    );
  if (!match?.[1]) return undefined;
  const raw = match[1].toLowerCase();
  const value = /^\d+$/.test(raw) ? Number(raw) : words[raw];
  return value && value >= 1 && value <= 8 ? value : undefined;
}

/** Real repeating patterns, one explicit rule per row. */

export function buildPatternPage(ctx: BuildContext): WorksheetPageModel {
  const next = rng(ctx.seed + 2113);
  const tokens = resolveAgeTokens(ctx.spec.level);
  const subject = resolveSubject(ctx.spec);
  const contractVocabulary = ctx.semanticRequirements
    ? ctx.semanticRequirements.requiredCategories.includes("farm") ||
      /\bfarm[- ]animals?\b/i.test(ctx.semanticRequirements.pageIntent)
      ? (["cow", "sheep", "chicken", "pig"] as VisualAssetKey[])
      : ctx.semanticRequirements.requiredCategories.length
        ? subject.assets
        : contentEntities(ctx.semanticRequirements)
    : [];
  const vocabulary =
    contractVocabulary.length >= 2 ? contractVocabulary.slice(0, 4) : compositionAssets(subject, 3);
  const requestedRules = ctx.semanticRequirements?.patternRules ?? [];
  // EXACT PATTERN COUNT — "show exactly 6 AB patterns" is a hard quantity, so a
  // teacher-authored row count always beats the age default.
  const requestedRowCount = requestedPatternCount(ctx.semanticRequirements);
  const rowCount = requestedRowCount ?? Math.max(3, Math.min(4, tokens.itemsPerPage - 1));
  const simple = tokens.id === "toddler-2-3" || tokens.id === "nursery-3-4";
  const ruleCycle: PatternRuleId[] = requestedRules.length
    ? requestedRules
    : simple
      ? ["AB", "AB", "AAB"]
      : ["AB", "AAB", "ABC", "ABB"];

  const rows: PickRow[] = [];
  for (let i = 0; i < rowCount; i++) {
    const id = `p1-pat${i + 1}`;
    const rule = ruleCycle[i % ruleCycle.length]!;
    // rotate the vocabulary so consecutive rows do not read identically
    const rotated = [
      ...vocabulary.slice(i % vocabulary.length),
      ...vocabulary.slice(0, i % vocabulary.length),
    ];
    const built =
      buildPatternRow(rule, rotated, vocabulary) ?? buildPatternRow("AB", rotated, vocabulary);
    if (!built) continue;

    const promptObjects = built.sequence.map((asset, k) => ({ id: `${id}-p${k + 1}`, asset }));
    const correct: PickOption = {
      id: `${id}-correct`,
      renderedObjects: objectsOf(`${id}-correct`, 1, built.answer),
    };
    const distractorOptions: PickOption[] = built.distractors.slice(0, 2).map((asset, k) => ({
      id: `${id}-d${k + 1}`,
      renderedObjects: objectsOf(`${id}-d${k + 1}`, 1, asset),
    }));
    const options = shuffle([correct, ...distractorOptions], next);

    // programmatic gate: a row that does not obey its own rule is dropped
    const problems = validatePatternRow({
      rule: built.rule,
      unit: built.unit,
      sequence: built.sequence,
      answer: built.answer,
      choices: options.map((option) => option.renderedObjects[0]!.asset),
    });
    if (problems.length) continue;

    rows.push({
      id,
      promptObjects,
      promptGap: true,
      patternRule: built.rule,
      patternUnit: built.unit,
      options,
      answerOptionId: correct.id,
    });
  }

  return pickPage(ctx, rows, {
    title: "What Comes Next?",
    instruction: "Read the pattern out loud. Circle the picture that comes next.",
    footerNote: "Say the pattern: this one, that one, this one…",
  });
}

/* ---------------------------------------------------------------- find & count */

/**
 * "Find & Count" — one simple garden scene.
 *
 * The target quantity is decided FIRST (targetCount), the scene then draws
 * exactly that many targets plus a little scenery, and the answer is read back
 * from the drawn target set, so the picture and the answer cannot diverge.
 */
export function buildFindCountPage(ctx: BuildContext): WorksheetPageModel {
  const next = rng(ctx.seed + 3181);
  const tokens = resolveAgeTokens(ctx.spec.level);
  const subject = resolveSubject(ctx.spec);
  const requestedTarget = contentEntities(ctx.semanticRequirements)[0];
  const targetAsset = requestedTarget ?? subject.assets[0]!;
  const scenery = ctx.semanticRequirements?.requiredCategories.length
    ? subject.assets.filter((asset) => asset !== targetAsset).slice(0, 3)
    : supportingAssets(subject, 3);
  const [min, max] = ctx.range;

  // 1. structured quantity first
  const ceiling = Math.min(max, tokens.maxQuantity, 9);
  const targetCount = Math.max(
    min,
    Math.min(ceiling, min + Math.floor(next() * (ceiling - min + 1))),
  );

  // 2. render exactly that many target objects
  const group = {
    id: "p1-find",
    renderedObjects: objectsOf("p1-find", targetCount, targetAsset),
    correctAnswer: targetCount,
  };

  // 3. lay the scene out on a calm grid so nothing overlaps or clips
  const decorCount = Math.min(scenery.length ? 5 : 0, 5);
  const slots = targetCount + decorCount;
  const columns = Math.min(5, Math.max(3, Math.ceil(Math.sqrt(slots))));
  const rowsInScene = Math.ceil(slots / columns);
  const order = shuffle(
    [
      ...group.renderedObjects.map((object) => ({ object, decorative: false })),
      ...Array.from({ length: decorCount }, (_, i) => ({
        object: {
          id: `p1-find-decor-${i + 1}`,
          asset: scenery[i % Math.max(1, scenery.length)] ?? targetAsset,
        },
        decorative: true,
      })),
    ],
    next,
  );

  const sceneObjects = order.map((entry, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    return {
      ...entry.object,
      ...(entry.decorative ? { decorative: true } : {}),
      xPct: ((column + 0.5) / columns) * 100,
      yPct: ((row + 0.5) / Math.max(1, rowsInScene)) * 100,
    };
  });

  // 4. answer options derived from the same targetCount
  const choices = new Set<number>([targetCount]);
  for (let distance = 1; choices.size < tokens.answerChoices && distance <= 9; distance++) {
    if (targetCount - distance >= Math.max(1, min)) choices.add(targetCount - distance);
    if (
      choices.size < tokens.answerChoices &&
      targetCount + distance <= Math.max(max, tokens.maxQuantity)
    )
      choices.add(targetCount + distance);
  }

  return {
    ...base(ctx, {
      title: `Find the ${subject.label}`,
      instruction: `Find every ${subject.assets.length === 1 ? visualObjects[targetAsset].singular : subject.plural} in the garden. Count them and circle the number.`,
    }),
    layout: "stacked-rows",
    activity: {
      kind: "find-count",
      mechanic: "find-and-count",
      targetAsset,
      sceneObjects,
      group,
      choices: [...choices].sort((a, b) => a - b),
    },
    answerKey: [{ groupId: group.id, answer: targetCount }],
    footerNote: "Touch each one as you count.",
  } as WorksheetPageModel;
}

/* ---------------------------------------------------------------- sorting */

/**
 * "Sorting" — two clearly labelled sorting areas and one mixed strip of items.
 * Every item belongs to exactly one bin, so the sort has one correct outcome.
 */
export function buildSortPage(ctx: BuildContext): WorksheetPageModel {
  const next = rng(ctx.seed + 4093);
  const tokens = resolveAgeTokens(ctx.spec.level);
  const subject = resolveSubject(ctx.spec);
  if (ctx.semanticRequirements?.sortAttribute?.attribute === "leg-count") {
    const twoLegged: VisualAssetKey[] = ["chicken", "chick"];
    const fourLegged: VisualAssetKey[] = ["cow", "sheep", "pig", "calf", "lamb", "piglet"];
    const items = shuffle(
      [...twoLegged, ...fourLegged.slice(0, 4)].map((asset, index) => ({
        id: `leg-sort-${index + 1}`,
        asset,
      })),
      next,
    );
    const bins = [
      {
        id: "p1-bin-2",
        label: "2 legs",
        asset: "chicken" as VisualAssetKey,
        criterion: { attribute: "leg-count", value: 2 },
      },
      {
        id: "p1-bin-4",
        label: "4 legs",
        asset: "cow" as VisualAssetKey,
        criterion: { attribute: "leg-count", value: 4 },
      },
    ];
    return {
      ...base(ctx, {
        title: "Sort by Number of Legs",
        instruction: "Sort each farm animal into the 2 legs or 4 legs group.",
      }),
      layout: "stacked-rows",
      activity: { kind: "sort-groups", mechanic: "sort-attribute", bins, items },
      answerKey: bins.map((bin) => ({
        groupId: bin.id,
        answer: items.filter((item) =>
          (bin.criterion.value === 2 ? twoLegged : fourLegged).includes(item.asset),
        ).length,
        answerText: bin.label,
      })),
      // sorting by a physical attribute only works with these exact animals
      contentLocked: true,
    } as WorksheetPageModel;
  }
  // SEMANTIC CATEGORIES: "things we eat" vs "things we play with" is sorted by
  // MEANING. Sorting the same pictures by identity would be a substitution.
  const groups = ctx.semanticRequirements?.categoryGroups ?? [];
  if (groups.length >= 2) {
    const requestedTotal = ctx.semanticRequirements?.requiredItemCount;
    const defaultPerGroup = Math.max(3, Math.min(4, Math.floor(tokens.itemsPerPage)));
    // EXACT QUANTITY: the teacher's requested counts win; a category only
    // renders fewer pictures when the picture set physically cannot supply
    // that many distinct, unambiguous members.
    const bins = groups.slice(0, 2).map((group, index) => {
      const requested =
        group.count ??
        (requestedTotal ? Math.ceil(requestedTotal / Math.min(2, groups.length)) : defaultPerGroup);
      // one canonical, duplicate-free member list per box
      const members = [...new Set(group.members)]
        .filter(
          (member) =>
            !groups.some((other) => other.label !== group.label && other.members.includes(member)),
        )
        .slice(0, requested);
      return {
        id: `p1-cat-${index + 1}`,
        label: group.label,
        asset: members[0] ?? group.members[0]!,
        members,
        criterion: { attribute: "category", value: group.label },
      };
    });
    const items = shuffle(
      bins.flatMap((bin) =>
        bin.members.map((asset, index) => ({
          id: `${bin.id}-item-${index + 1}`,
          asset,
          label: visualObjects[asset].singular,
        })),
      ),
      next,
    );
    return {
      ...base(ctx, {
        title: "Sort by What It Is",
        // Ages 3–5 sort by drawing a line, never by writing words.
        instruction: `Look at each picture. Draw a line from it to the ${bins[0]!.label} box or the ${bins[1]!.label} box.`,
      }),
      layout: "stacked-rows",
      activity: { kind: "sort-groups", mechanic: "sort-attribute", bins, items },
      answerKey: bins.map((bin) => ({
        groupId: bin.id,
        answer: items.filter((item) => bin.members.includes(item.asset)).length,
        answerText: bin.label,
      })),
      footerNote:
        "Say what each picture is used for, then draw your line. You may also cut the pictures out and paste them in the boxes.",
      // The category members ARE the specification (food vs things we play
      // with). Theme repair may not swap them for themed pictures, or the
      // sorted items stop belonging to any labelled box.
      contentLocked: true,
    } as WorksheetPageModel;
  }
  const primary = subject.assets[0]!;
  const other = subject.assets[1] ?? supportingAssets(subject, 1)[0] ?? "flower";

  const perBin = Math.max(2, Math.min(4, Math.floor(tokens.itemsPerPage)));
  const binA = { id: "p1-bin-a", label: visualObjects[primary].label, asset: primary };
  const binB = { id: "p1-bin-b", label: visualObjects[other].label, asset: other };
  const countA = perBin;
  const countB = Math.max(2, perBin - 1);

  const items = shuffle(
    [...objectsOf("p1-sort-a", countA, primary), ...objectsOf("p1-sort-b", countB, other)],
    next,
  );

  return {
    ...base(ctx, {
      title: "Sort the Pictures",
      instruction: `Look at each picture. Draw it in the ${binA.label} box or the ${binB.label} box.`,
    }),
    layout: "stacked-rows",
    activity: {
      kind: "sort-groups",
      mechanic: "sort-attribute",
      bins: [binA, binB],
      items,
    },
    answerKey: [
      { groupId: binA.id, answer: countA, answerText: binA.label },
      { groupId: binB.id, answer: countB, answerText: binB.label },
    ],
    footerNote: "Say the name of each picture before you sort it.",
  } as WorksheetPageModel;
}

/* ---------------------------------------------------------------- sequencing */

export function buildSequencePage(ctx: BuildContext): WorksheetPageModel {
  const next = rng(ctx.seed + 2609);
  const tokens = resolveAgeTokens(ctx.spec.level);
  const subject = resolveSubject(ctx.spec);
  const assets = subject.locked ? subject.assets : shuffle([...subject.assets], next);
  const [min, max] = ctx.range;
  const rowCount = Math.max(2, Math.min(3, tokens.itemsPerPage - 2));

  const rows = Array.from({ length: rowCount }, (_, i) => {
    const id = `p1-seq${i + 1}`;
    const asset = assets[i % assets.length]!;
    const first = Math.max(1, min);
    const step = Math.max(1, Math.floor((max - first) / 3) || 1);
    const quantities = [first, first + step, first + step * 2].map((q) => Math.min(max, q));
    const ordered: OrderItem[] = quantities.map((q, k) => ({
      id: `${id}-i${k + 1}`,
      renderedObjects: objectsOf(`${id}-i${k + 1}`, q, asset),
      rank: k + 1,
    }));
    return { id, items: shuffle(ordered, next) };
  });

  return {
    ...base(ctx, {
      title: "Put Them in Order",
      instruction: `Write 1, 2, 3 to put the ${subject.plural} in order from fewest to most.`,
    }),
    layout: "stacked-rows",
    activity: {
      kind: "order-sequence",
      mechanic: "sequence-order",
      rows,
      challenge: "Say the order out loud: first, next, last.",
    },
    answerKey: rows.flatMap((row) =>
      row.items.map((item) => ({ groupId: item.id, answer: item.rank })),
    ),
    footerNote: "First, next, last.",
  } as WorksheetPageModel;
}

/* ---------------------------------------------------------------- count & draw */

/**
 * "Count the pictures, then DRAW that many in the box."
 *
 * Same counting objective as Count & Circle, different response mode: the
 * child produces the answer instead of selecting it, so no number cards are
 * printed and every row carries an empty drawing box.
 */
export function buildCountDrawPage(ctx: BuildContext): WorksheetPageModel {
  const next = rng(ctx.seed + 6151);
  const tokens = resolveAgeTokens(ctx.spec.level);
  const subject = resolveSubject(ctx.spec);
  const requested = contentEntities(ctx.semanticRequirements);
  const pool = requested.length ? requested : subject.assets;
  const [min, max] = ctx.range;
  const rowCount = Math.max(3, Math.min(4, tokens.itemsPerPage - 1));
  const quantities: number[] = [];
  for (let value = Math.max(1, min); value <= max && quantities.length < rowCount; value++)
    quantities.push(value);
  const counts = shuffle(quantities, next).slice(0, rowCount);

  const rows = counts.map((count, index) => {
    const id = `p1-draw${index + 1}`;
    const asset = pool[index % pool.length]!;
    const renderedObjects = objectsOf(id, count, asset);
    return { id, renderedObjects, correctAnswer: renderedObjects.length, choices: [] as number[] };
  });

  return {
    ...base(ctx, {
      title: "Count and Draw",
      instruction: "Count the pictures in each row. Draw the same number of circles in the box.",
    }),
    activityType: "Count & Draw",
    layout: "stacked-rows",
    activity: {
      kind: "count-circle",
      rows,
      responseMode: "draw",
      drawPrompt: "circles",
    },
    answerKey: rows.map((row) => ({ groupId: row.id, answer: row.correctAnswer })),
    footerNote: "Draw one circle for each picture you counted.",
  } as WorksheetPageModel;
}

export function builderForMechanic(profile: ObjectiveProfile) {
  switch (profile.mechanic) {
    case "find-target":
      return buildFindTargetPage;
    case "match-pairs":
      return buildMatchPairsPage;
    case "trace-draw":
      return buildTraceDrawPage;
    case "number-write":
      return buildNumberWritePage;
    case "compare-quantity":
      return buildComparePage;
    case "compare-size":
      return buildSizePage;
    case "same-different":
      return buildSameDifferentPage;
    case "beginning-sound":
      return buildBeginningSoundPage;
    case "pattern-complete":
      return buildPatternPage;
    case "sequence-order":
      return buildSequencePage;
    case "find-and-count":
      return buildFindCountPage;
    case "sort-attribute":
      return buildSortPage;
    case "memory-pairs":
      return (ctx: { spec: WorksheetSpec; profile: ObjectiveProfile; seed: number }) =>
        buildMemoryPairsPage({ spec: ctx.spec, profile: ctx.profile, seed: ctx.seed, styleFor });

    default:
      return undefined;
  }
}

export type { BuildContext };

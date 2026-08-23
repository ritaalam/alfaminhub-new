/**
 * DYNAMIC PAGE COMPOSER
 * ---------------------
 * The last step of the generation pipeline:
 *
 *   user request → pack plan → page specification → COMPONENT SELECTION →
 *   layout → content validation → rendering → final validation
 *
 * Templates are still used whenever one matches a Page Specification exactly.
 * When none does — or when a template page cannot satisfy the specification —
 * the page is composed here out of reusable educational components instead of
 * being replaced by a different, more convenient activity.
 */

import { characterForAsset } from "./alfa-characters";
import { resolveAgeTokens } from "./age-tokens";
import type { WorksheetSpec } from "./creator-options";
import { basicShapes, everydayCategories, shapeOfObject, shapePairs } from "./object-semantics";
import { pictureWord } from "./picture-lexicon";
import { visualObjects } from "./semantic-topics";
import { resolveSubject } from "./worksheet-subjects";
import { styleForPage } from "./worksheet-builder";
import type {
  AnswerKeyEntry,
  ComposedActivity,
  MatchColumnEntry,
  PageSemanticRequirements,
  RenderedCountObject,
  SortBin,
  VisualAssetKey,
  WorksheetComponent,
  WorksheetMechanicId,
  WorksheetPageModel,
} from "./worksheet-model";
import { skillFamilyOfMechanic } from "./skill-fidelity";

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

function object(id: string, asset: VisualAssetKey): RenderedCountObject {
  const character = characterForAsset(asset);
  const label = pictureWord(asset);
  return {
    id,
    asset,
    ...(label ? { label } : {}),
    ...(character ? { character } : {}),
  };
}

function objects(prefix: string, asset: VisualAssetKey, count: number): RenderedCountObject[] {
  return Array.from({ length: count }, (_, i) => object(`${prefix}-${i + 1}`, asset));
}

const renderable = (asset: VisualAssetKey) => asset in visualObjects;

export type ComposeContext = {
  spec: WorksheetSpec;
  mechanic: WorksheetMechanicId;
  requirements: PageSemanticRequirements;
  /** page number, 1-based */
  page: number;
  seed: number;
  range: [number, number];
  /** the exact sentence the teacher wrote for this page, when there was one */
  requiredContent?: string;
};

type Composition = {
  title: string;
  instruction: string;
  activityType: string;
  components: WorksheetComponent[];
  answerKey: AnswerKeyEntry[];
  challenge?: string;
};

/** Content pool honoured by every composition: required first, then theme. */
function contentPool(ctx: ComposeContext): VisualAssetKey[] {
  const required = ctx.requirements.requiredEntities.filter(renderable);
  const preferred = (ctx.requirements.preferredEntities ?? []).filter(renderable);
  const subject = resolveSubject(ctx.spec).assets.filter(renderable);
  return [...new Set([...required, ...preferred, ...subject])];
}

/* ------------------------------------------------------------ compositions */

function composeObjectToShape(ctx: ComposeContext): Composition {
  const next = rng(ctx.seed + 11);
  const pairs = shapePairs(4).filter((pair) => renderable(pair.object));
  const left: MatchColumnEntry[] = pairs.map((pair, index) => ({
    id: `p${ctx.page}-obj-${index + 1}`,
    object: object(`p${ctx.page}-obj-${index + 1}-art`, pair.object),
  }));
  const rightOrder = shuffle(pairs, next);
  const right: MatchColumnEntry[] = rightOrder.map((pair, index) => ({
    id: `p${ctx.page}-shape-${index + 1}`,
    object: object(`p${ctx.page}-shape-${index + 1}-art`, pair.shape as VisualAssetKey),
  }));
  // establish the pairing only AFTER the answer column has been shuffled
  left.forEach((entry, index) => {
    const shape = shapeOfObject[pairs[index]!.object]!;
    const target = right.find((candidate) => candidate.object?.asset === (shape as VisualAssetKey));
    if (target) entry.targetId = target.id;
  });
  return {
    title: "Match the Object to Its Shape",
    instruction: "Look at each object. Draw a line to the shape it looks like.",
    activityType: "Object & Shape Match",
    components: [
      {
        type: "match-columns",
        id: `p${ctx.page}-match`,
        left,
        right,
      },
    ],
    answerKey: left.map((entry, index) => ({
      groupId: entry.id,
      answer: right.findIndex((candidate) => candidate.id === entry.targetId) + 1,
      answerText: shapeOfObject[pairs[index]!.object] ?? "",
    })),
  };
}

function composeCategorySort(ctx: ComposeContext): Composition {
  const next = rng(ctx.seed + 23);
  const groups = (
    ctx.requirements.categoryGroups?.length
      ? ctx.requirements.categoryGroups
      : everydayCategories
          .slice(0, 2)
          .map((category) => ({ label: category.label, members: category.members }))
  ).slice(0, 2);
  const bins: SortBin[] = groups.map((group, index) => {
    const members = group.members.filter(renderable);
    return {
      id: `p${ctx.page}-bin-${index + 1}`,
      label: group.label,
      asset: members[0]!,
      members,
      criterion: { attribute: "category", value: group.label },
    };
  });
  const perBin = 4;
  const items = shuffle(
    bins.flatMap((bin) =>
      (bin.members ?? [])
        .slice(0, perBin)
        .map((asset, index) => object(`${bin.id}-item-${index + 1}`, asset)),
    ),
    next,
  );
  return {
    title: "Sort the Pictures",
    instruction: `Look at each picture. Put it in the ${bins.map((bin) => bin.label).join(" box or the ")} box.`,
    activityType: "Sorting",
    components: [
      {
        type: "cut-out-strip",
        id: `p${ctx.page}-strip`,
        items,
        note: "Cut out or draw each picture in the right box.",
      },
      { type: "sort-bins", id: `p${ctx.page}-bins`, bins, items },
    ],
    answerKey: bins.map((bin) => ({
      groupId: bin.id,
      answer: items.filter((item) => (bin.members ?? []).includes(item.asset)).length,
      answerText: bin.label,
    })),
  };
}

function composeCountAndDraw(ctx: ComposeContext): Composition {
  const next = rng(ctx.seed + 37);
  const pool = contentPool(ctx);
  const [min, max] = ctx.range;
  const rows = Math.max(3, Math.min(4, resolveAgeTokens(ctx.spec.level).itemsPerPage - 1));
  const used = new Set<number>();
  const components: WorksheetComponent[] = [];
  const answerKey: AnswerKeyEntry[] = [];
  for (let i = 0; i < rows; i++) {
    let count = Math.max(min, Math.min(max, 1 + Math.floor(next() * max)));
    let guard = 0;
    while (used.has(count) && guard++ < 20)
      count = Math.max(min, Math.min(max, 1 + Math.floor(next() * max)));
    used.add(count);
    const asset = pool[i % pool.length]!;
    const groupId = `p${ctx.page}-count-${i + 1}`;
    components.push({
      type: "row",
      id: `${groupId}-row`,
      align: "between",
      children: [
        {
          type: "counting-group",
          id: groupId,
          items: objects(`${groupId}-obj`, asset, count),
          answer: count,
        },
        { type: "drawing-area", id: `${groupId}-draw`, label: "Draw here", heightMm: 22 },
      ],
    });
    answerKey.push({ groupId, answer: count });
  }
  return {
    title: "Count and Draw",
    instruction: "Count the pictures in each row. Draw the same number of circles in the box.",
    activityType: "Count & Draw",
    components,
    answerKey,
  };
}

function composePattern(ctx: ComposeContext): Composition {
  const next = rng(ctx.seed + 53);
  const pool = contentPool(ctx);
  const rules = ctx.requirements.patternRules.length
    ? ctx.requirements.patternRules
    : ["AB", "AAB"];
  const components: WorksheetComponent[] = [];
  const answerKey: AnswerKeyEntry[] = [];
  rules.slice(0, 3).forEach((rule, index) => {
    const letters = [...new Set(rule.split(""))];
    const assets = shuffle(pool, next).slice(0, Math.max(2, letters.length));
    const unit = rule.split("").map((letter) => assets[letters.indexOf(letter) % assets.length]!);
    const rowId = `p${ctx.page}-pattern-${index + 1}`;
    const shown: RenderedCountObject[] = [];
    for (let i = 0; i < unit.length * 2; i++)
      shown.push(object(`${rowId}-shown-${i + 1}`, unit[i % unit.length]!));
    const answerAsset = unit[shown.length % unit.length]!;
    const distractors = assets.filter((asset) => asset !== answerAsset).slice(0, 2);
    const choices = shuffle(
      [answerAsset, ...distractors].map((asset, i) => ({
        id: `${rowId}-choice-${i + 1}-${asset}`,
        object: object(`${rowId}-choice-art-${i + 1}`, asset),
      })),
      next,
    );
    const answer = choices.find((choice) => choice.object.asset === answerAsset)!;
    components.push({
      type: "stack",
      id: `${rowId}-stack`,
      children: [
        { type: "pattern-sequence", id: rowId, shown, rule },
        { type: "answer-choices", id: `${rowId}-choices`, choices, answerId: answer.id },
      ],
    });
    answerKey.push({
      groupId: rowId,
      answer: choices.findIndex((choice) => choice.id === answer.id) + 1,
      answerText: rule,
    });
  });
  return {
    title: "Finish the Pattern",
    instruction: "Look at each pattern. Circle the picture that comes next.",
    activityType: "Patterns",
    components,
    answerKey,
  };
}

function composeTracing(ctx: ComposeContext): Composition {
  const shapes = ctx.requirements.requiredEntities.filter((entity) =>
    (basicShapes as string[]).includes(entity),
  );
  const glyphs = shapes.length ? shapes : basicShapes;
  const components: WorksheetComponent[] = glyphs.slice(0, 4).map((shape, index) => ({
    type: "tracing-row",
    id: `p${ctx.page}-trace-${index + 1}`,
    shape: shape as VisualAssetKey,
    label: shape,
    traceSlots: 3,
    blankSlots: 2,
  }));
  return {
    title: "Trace the Shapes",
    instruction: "Trace each dotted shape. Then draw it yourself in the empty space.",
    activityType: "Tracing",
    components,
    answerKey: components.map((component) => ({ groupId: component.id, answer: 1 })),
  };
}

function composeWriting(ctx: ComposeContext): Composition {
  const glyph = ctx.requirements.requiredEntities[0] ?? "";
  return {
    title: "Write It Yourself",
    instruction: "Write on the lines. Take your time and start at the top.",
    activityType: "Handwriting",
    components: [
      ...(glyph
        ? [
            {
              type: "glyph-card",
              id: `p${ctx.page}-model`,
              glyph: String(glyph),
              variant: "letter",
            } as WorksheetComponent,
          ]
        : []),
      { type: "handwriting-line", id: `p${ctx.page}-line-1`, slots: 4 },
      { type: "handwriting-line", id: `p${ctx.page}-line-2`, slots: 4 },
      { type: "handwriting-line", id: `p${ctx.page}-line-3`, slots: 4 },
    ],
    answerKey: [{ groupId: `p${ctx.page}-line-1`, answer: 1 }],
  };
}

function composeCountAndCircle(ctx: ComposeContext): Composition {
  const next = rng(ctx.seed + 71);
  const pool = contentPool(ctx);
  const [min, max] = ctx.range;
  const components: WorksheetComponent[] = [];
  const answerKey: AnswerKeyEntry[] = [];
  const used = new Set<number>();
  for (let i = 0; i < 3; i++) {
    let count = Math.max(min, Math.min(max, 1 + Math.floor(next() * max)));
    let guard = 0;
    while (used.has(count) && guard++ < 20)
      count = Math.max(min, Math.min(max, 1 + Math.floor(next() * max)));
    used.add(count);
    const groupId = `p${ctx.page}-row-${i + 1}`;
    const options = [...new Set([count, Math.max(1, count - 1), count + 1])].slice(0, 3);
    const choices = shuffle(options, next).map((value) => ({
      id: `${groupId}-choice-${value}`,
      text: String(value),
    }));
    components.push({
      type: "row",
      id: `${groupId}-row`,
      align: "between",
      children: [
        {
          type: "counting-group",
          id: groupId,
          items: objects(`${groupId}-obj`, pool[i % pool.length]!, count),
          answer: count,
        },
        {
          type: "answer-choices",
          id: `${groupId}-choices`,
          choices,
          answerId: `${groupId}-choice-${count}`,
        },
      ],
    });
    answerKey.push({ groupId, answer: count });
  }
  return {
    title: "Count and Circle",
    instruction: "Count the pictures in each row. Circle the correct number.",
    activityType: "Count & Circle",
    components,
    answerKey,
  };
}

function composeGenericMatch(ctx: ComposeContext): Composition {
  const next = rng(ctx.seed + 89);
  const pool = contentPool(ctx).slice(0, 4);
  const left: MatchColumnEntry[] = pool.map((asset, index) => ({
    id: `p${ctx.page}-left-${index + 1}`,
    object: object(`p${ctx.page}-left-art-${index + 1}`, asset),
  }));
  const right: MatchColumnEntry[] = shuffle(pool, next).map((asset, index) => ({
    id: `p${ctx.page}-right-${index + 1}`,
    text: (pictureWord(asset) ?? asset).charAt(0).toUpperCase(),
    object: object(`p${ctx.page}-right-art-${index + 1}`, asset),
  }));
  left.forEach((entry) => {
    const target = right.find((candidate) => candidate.object?.asset === entry.object?.asset);
    if (target) entry.targetId = target.id;
  });
  return {
    title: "Draw the Lines",
    instruction: "Draw a line from each picture on the left to the one it belongs with.",
    activityType: "Matching",
    components: [{ type: "match-columns", id: `p${ctx.page}-match`, left, right }],
    answerKey: left.map((entry) => ({
      groupId: entry.id,
      answer: right.findIndex((candidate) => candidate.id === entry.targetId) + 1,
    })),
  };
}

/** Chooses the composition that satisfies the page specification. */
function compositionFor(ctx: ComposeContext): Composition {
  const requirements = ctx.requirements;
  if (requirements.activitySubtype === "object-to-shape") return composeObjectToShape(ctx);
  if (requirements.categoryGroups?.length || ctx.mechanic === "sort-attribute")
    return composeCategorySort(ctx);
  if (ctx.mechanic === "pattern-complete") return composePattern(ctx);
  if (requirements.responseMode === "draw") return composeCountAndDraw(ctx);
  if (ctx.mechanic === "trace-draw" || requirements.studentAction === "trace")
    return composeTracing(ctx);
  if (
    ctx.mechanic === "letter-write" ||
    ctx.mechanic === "number-write" ||
    requirements.studentAction === "write"
  ) {
    return composeWriting(ctx);
  }
  if (
    skillFamilyOfMechanic(ctx.mechanic) === "quantity" ||
    requirements.studentAction === "count"
  ) {
    return composeCountAndCircle(ctx);
  }
  return composeGenericMatch(ctx);
}

/**
 * Builds a page from reusable components for a Page Specification that no
 * template satisfies. The requested mechanic is preserved exactly, so the
 * page-plan contract still holds.
 */
export function composePage(ctx: ComposeContext): WorksheetPageModel {
  const composition = compositionFor(ctx);
  const activity: ComposedActivity = {
    kind: "composed",
    mechanic: ctx.mechanic,
    specification: {
      ...(ctx.requirements.studentAction ? { studentAction: ctx.requirements.studentAction } : {}),
      ...(ctx.requirements.responseMode ? { responseMode: ctx.requirements.responseMode } : {}),
      ...(ctx.requirements.contentDomain ? { contentDomain: ctx.requirements.contentDomain } : {}),
      ...(ctx.requirements.activitySubtype ? { subtype: ctx.requirements.activitySubtype } : {}),
    },
    components: composition.components,
    ...(composition.challenge ? { challenge: composition.challenge } : {}),
  };
  return {
    id: `page-${ctx.page}`,
    title: composition.title,
    instruction: composition.instruction,
    activityType: composition.activityType,
    layout: "stacked-rows",
    purpose: "counting",
    illustrationStyle: styleForPage(ctx.spec, "counting"),
    activity,
    answerKey: composition.answerKey,
    // a composed page is built directly from its specification: its pictures
    // ARE the requirement, so later theme repair must leave them alone
    contentLocked: true,
  };
}

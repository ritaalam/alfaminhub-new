/**
 * SEQUENCING CONTENT MODEL — ordered stages of a real process.
 *
 * Sequencing is not counting: the educational data is an ORDERED SET OF
 * DISTINCT STAGES, each appearing exactly once. The mechanic-specific content
 * planner below produces that data, and the sequence-stages renderer draws it
 * as numbered slots plus shuffled cut-out cards.
 */

import { resolveAgeTokens } from "./age-tokens";
import type { WorksheetSpec } from "./creator-options";
import type { SequenceStageCard, VisualAssetKey, WorksheetPageModel } from "./worksheet-model";

export type ProcessStage = {
  /** stable stage identity used by validation */
  id: string;
  label: string;
  asset: VisualAssetKey;
};

export type OrderedProcess = {
  id: string;
  /** title-case name, e.g. "Butterfly Life Cycle" */
  label: string;
  /** short child-facing noun used inside instructions */
  noun: string;
  /** stages in their scientifically / logically correct order */
  stages: ProcessStage[];
  alias: RegExp;
  /** stages that must be present for this process to be scientifically valid */
  required: string[];
};

/**
 * Known ordered processes. Adding a process is data, never a code path: the
 * generic sequencing planner and renderer handle every entry identically.
 */
export const orderedProcesses: OrderedProcess[] = [
  {
    id: "butterfly-life-cycle",
    label: "Butterfly Life Cycle",
    noun: "butterfly life cycle",
    alias: /butterfl(y|ies)|caterpillar|chrysalis|metamorphosis/i,
    stages: [
      { id: "egg", label: "Egg", asset: "egg" },
      { id: "caterpillar", label: "Caterpillar", asset: "caterpillar" },
      { id: "chrysalis", label: "Chrysalis", asset: "chrysalis" },
      { id: "butterfly", label: "Butterfly", asset: "butterfly" },
    ],
    required: ["egg", "caterpillar", "chrysalis", "butterfly"],
  },
  {
    id: "frog-life-cycle",
    label: "Frog Life Cycle",
    noun: "frog life cycle",
    alias: /frogs?|tadpoles?|amphibian/i,
    stages: [
      { id: "egg", label: "Egg", asset: "egg" },
      { id: "tadpole", label: "Tadpole", asset: "tadpole" },
      { id: "frog", label: "Frog", asset: "frog" },
    ],
    required: ["egg", "tadpole", "frog"],
  },
  {
    id: "chicken-life-cycle",
    label: "Chicken Life Cycle",
    noun: "chicken life cycle",
    alias: /chickens?|hens?|chicks?|poussins?/i,
    stages: [
      { id: "egg", label: "Egg", asset: "egg" },
      { id: "chick", label: "Chick", asset: "chick" },
      { id: "chicken", label: "Chicken", asset: "chicken" },
    ],
    required: ["egg", "chick", "chicken"],
  },
  {
    id: "plant-life-cycle",
    label: "Plant Life Cycle",
    noun: "plant life cycle",
    alias: /plants?|seeds?|sprouts?|seedlings?|flowers? grow|growing|germination/i,
    stages: [
      { id: "seed", label: "Seed", asset: "seed" },
      { id: "sprout", label: "Sprout", asset: "sprout" },
      { id: "flower", label: "Flower", asset: "flower" },
    ],
    required: ["seed", "sprout", "flower"],
  },
  {
    id: "tree-life-cycle",
    label: "Tree Life Cycle",
    noun: "tree life cycle",
    alias: /\btrees?\b|acorns?|oak/i,
    stages: [
      { id: "seed", label: "Seed", asset: "acorn" },
      { id: "sprout", label: "Sprout", asset: "sprout" },
      { id: "tree", label: "Tree", asset: "tree" },
      { id: "apple", label: "Fruit", asset: "apple" },
    ],
    required: ["seed", "sprout", "tree"],
  },
];

/**
 * The process a sequencing request is about.
 *
 * Theme text is only used to LOOK UP content here — it never decides the
 * mechanic. When no known process matches, the caller falls back to a generic
 * ordering task rather than to counting.
 */
export function processForSpec(spec: WorksheetSpec): OrderedProcess | undefined {
  const text = `${spec.prompt ?? ""} ${spec.theme ?? ""} ${spec.objective ?? ""} ${spec.skill ?? ""}`;
  // an explicit life-cycle request always resolves to the process its subject
  // names; otherwise a themed object still resolves when it owns a process
  return orderedProcesses.find((process) => process.alias.test(text));
}

/** True when this spec can be generated as a real staged sequence. */
export function hasOrderedProcess(spec: WorksheetSpec) {
  return Boolean(processForSpec(spec));
}

function shuffleDeterministic<T>(items: T[], seed: number): T[] {
  let s = seed >>> 0 || 7;
  const next = () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  // a shuffle that leaves the answer already in order defeats the task
  if (copy.every((item, i) => item === items[i]) && copy.length > 1) {
    return [...copy.slice(1), copy[0]!];
  }
  return copy;
}

export type StageSequenceContent = {
  contentType: "orderedSequence";
  process: OrderedProcess;
  cards: SequenceStageCard[];
};

/**
 * MECHANIC-SPECIFIC CONTENT PLANNER.
 *
 * Produces ordered stages — never themed objects that a renderer then has to
 * reinterpret. Each stage appears exactly once.
 */
export function planStageSequence(process: OrderedProcess, seed: number): StageSequenceContent {
  const ordered: SequenceStageCard[] = process.stages.map((stage, i) => ({
    id: `stage-${stage.id}`,
    stageId: stage.id,
    order: i + 1,
    label: stage.label,
    asset: stage.asset,
  }));
  return {
    contentType: "orderedSequence",
    process,
    cards: shuffleDeterministic(ordered, seed),
  };
}

export type StageSequenceBuildContext = {
  spec: WorksheetSpec;
  seed: number;
  process: OrderedProcess;
  illustrationStyle: WorksheetPageModel["illustrationStyle"];
};

export function buildStageSequencePage(ctx: StageSequenceBuildContext): WorksheetPageModel {
  const { process } = ctx;
  const tokens = resolveAgeTokens(ctx.spec.level);
  const content = planStageSequence(process, ctx.seed);
  const showLabels = tokens.id !== "toddler-2-3";

  return {
    id: "page-1",
    title: process.label,
    instruction: `Cut out the pictures. Put the stages of the ${process.noun} in the correct order.`,
    activityType: "Put in Order",
    layout: "stacked-rows",
    purpose: "sequencing",
    illustrationStyle: ctx.illustrationStyle,
    activity: {
      kind: "sequence-stages",
      mechanic: "sequence-order",
      processId: process.id,
      processLabel: process.label,
      slots: process.stages.map((_, i) => ({ id: `slot-${i + 1}`, position: i + 1 })),
      cards: content.cards,
      showLabels,
      challenge: `Tell the story of the ${process.noun}: first, next, then, last.`,
    },
    answerKey: content.cards.map((card) => ({
      groupId: card.id,
      answer: card.order,
      answerText: card.label,
    })),
    footerNote: "Say each stage out loud before you glue it down.",
  };
}

/**
 * SCIENTIFIC CONTENT VALIDATION.
 *
 * Checks the printed stage set against the real process: every required stage
 * present, each exactly once, order 1..n, and the answer key following the
 * correct biological order.
 */
export function validateStageSequence(page: WorksheetPageModel): string[] {
  if (page.activity.kind !== "sequence-stages") return [];
  const activity = page.activity;
  const errors: string[] = [];
  const process = orderedProcesses.find((p) => p.id === activity.processId);
  if (!process) {
    errors.push(`${page.id}: unknown process "${activity.processId}".`);
    return errors;
  }

  const stageIds = activity.cards.map((card) => card.stageId);
  for (const required of process.required) {
    const occurrences = stageIds.filter((id) => id === required).length;
    if (occurrences === 0) errors.push(`${page.id}: the "${required}" stage is missing.`);
    if (occurrences > 1)
      errors.push(`${page.id}: the "${required}" stage is printed ${occurrences} times.`);
  }
  if (new Set(stageIds).size !== stageIds.length) {
    errors.push(`${page.id}: a stage is duplicated — each stage must appear exactly once.`);
  }
  if (activity.slots.length !== activity.cards.length) {
    errors.push(`${page.id}: ${activity.slots.length} slots for ${activity.cards.length} cards.`);
  }

  const orders = [...activity.cards].map((card) => card.order).sort((a, b) => a - b);
  const expected = activity.cards.map((_, i) => i + 1);
  if (orders.join() !== expected.join()) {
    errors.push(`${page.id}: stage order must be 1..${activity.cards.length} exactly once.`);
  }

  // the answer key must follow the real order of the process
  const correctOrder = process.stages.map((stage) => stage.id);
  for (const card of activity.cards) {
    const scientific = correctOrder.indexOf(card.stageId) + 1;
    if (scientific === 0) {
      errors.push(`${page.id}: "${card.stageId}" is not part of the ${process.label}.`);
      continue;
    }
    if (card.order !== scientific) {
      errors.push(
        `${page.id}: "${card.stageId}" is numbered ${card.order} but comes ${scientific} in the ${process.label}.`,
      );
    }
    const keyed = page.answerKey.find((entry) => entry.groupId === card.id)?.answer;
    if (keyed !== scientific) {
      errors.push(
        `${page.id}: answer key for "${card.stageId}" is ${keyed ?? "missing"}, expected ${scientific}.`,
      );
    }
  }
  return errors;
}

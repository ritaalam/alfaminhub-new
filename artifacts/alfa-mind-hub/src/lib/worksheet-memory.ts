/**
 * Memory Pairs — printable vocabulary card decks.
 *
 * THEME decides the visual world (animals, ocean, insects…), the LEARNING
 * OBJECTIVE decides which words are taught and the MECHANIC decides what the
 * child does: turn cards over and find identical pairs. Nothing on this page
 * counts, so no counting mechanic may ever stand in for it.
 */

import { resolveAgeTokens } from "./age-tokens";
import { characterForAsset } from "./alfa-characters";
import type { WorksheetSpec } from "./creator-options";
import { visualObjects } from "./semantic-topics";
import { resolveSubject } from "./worksheet-subjects";
import { compositionAssets } from "./worksheet-vocabulary";
import type {
  MemoryCard,
  MemoryPairsActivity,
  VisualAssetKey,
  WorksheetPageModel,
} from "./worksheet-model";
import type { ObjectiveProfile } from "./worksheet-objectives";
import type { IllustrationPurpose } from "./visual-directions";

/** Pairs a child of this age can hold in one game. */
export function pairsForAge(level: string): number {
  switch (resolveAgeTokens(level).id) {
    case "toddler-2-3":
      return 3;
    case "nursery-3-4":
      return 4;
    case "kindergarten":
      return 6;
    case "school":
      return 8;
    default:
      return 6; // preschool 4–5 → 6 pairs / 12 cards
  }
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

function titleCase(word: string) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function memoryDeck(
  spec: WorksheetSpec,
  pairCount: number,
  seed: number,
  showLabels: boolean,
  challenge: string,
) {
  const next = rng(seed + 4211);
  const assets = vocabularyForSpec(spec, pairCount);
  const cards: MemoryCard[] = assets.flatMap((asset, i) => {
    const pairId = `pair-${i + 1}`;
    const label = titleCase(visualObjects[asset].singular);
    const character = characterForAsset(asset);
    return ["a", "b"].map((half) => ({
      id: `${pairId}-${half}`,
      pairId,
      asset,
      label,
      ...(character ? { character } : {}),
    })) as MemoryCard[];
  });

  return {
    assets,
    activity: {
      kind: "memory-pairs" as const,
      mechanic: "memory-pairs" as const,
      cards: shuffle(cards, next),
      showLabels,
      challenge,
    },
  };
}

/** The distinct vocabulary items a deck teaches, in a stable order. */
export function vocabularyForSpec(spec: WorksheetSpec, wanted: number): VisualAssetKey[] {
  const subject = resolveSubject(spec);
  const pool = [...new Set([...subject.assets, ...compositionAssets(subject, wanted + 4)])];
  return pool.slice(0, Math.max(3, Math.min(wanted, pool.length)));
}

export function buildMemoryPairsPage(ctx: {
  spec: WorksheetSpec;
  profile: ObjectiveProfile;
  seed: number;
  styleFor?: (
    spec: WorksheetSpec,
    purpose: IllustrationPurpose,
  ) => WorksheetPageModel["illustrationStyle"];
}): WorksheetPageModel {
  const { spec, seed } = ctx;
  const subject = resolveSubject(spec);
  const ageId = resolveAgeTokens(spec.level).id;
  const deck = memoryDeck(
    spec,
    pairsForAge(spec.level),
    seed,
    ageId !== "toddler-2-3",
    "Can you say the name of every picture as you turn it over?",
  );

  return {
    id: "page-1",
    title: `${subject.label} Memory Pairs`,
    instruction: `Cut out the cards. Turn them face down and find the two cards that show the same picture.`,
    activityType: "Memory Pairs",
    layout: "stacked-rows",
    purpose: "matching",
    illustrationStyle: ctx.styleFor
      ? ctx.styleFor(spec, "matching")
      : ({} as WorksheetPageModel["illustrationStyle"]),
    activity: deck.activity,
    answerKey: deck.assets.map((_asset, i) => ({
      groupId: `pair-${i + 1}`,
      answer: 2,
      answerText: titleCase(visualObjects[deck.assets[i]!].singular),
    })),
    footerNote: "Play in pairs: say the word out loud each time a card is turned over.",
  };
}

function seedForCards(cards: MemoryCard[]) {
  return cards.reduce((seed, card) => {
    const value = `${card.id}:${card.asset}:${card.label}`;
    for (let index = 0; index < value.length; index++) {
      seed ^= value.charCodeAt(index);
      seed = Math.imul(seed, 16777619);
    }
    return seed;
  }, 2166136261) >>> 0;
}

/**
 * Differentiates a printable memory game without changing its topic, level, or
 * matching mechanic. Harder adds vocabulary pairs and removes the word cue;
 * easier removes pairs and restores that cue.
 */
export function adjustMemoryPairsDifficulty(
  page: WorksheetPageModel,
  spec: WorksheetSpec,
  direction: "easier" | "harder",
): WorksheetPageModel {
  if (page.activity.kind !== "memory-pairs") return page;

  const currentPairs = new Set(page.activity.cards.map((card) => card.pairId)).size;
  const availablePairs = vocabularyForSpec(spec, 10).length;
  const pairCount =
    direction === "harder"
      ? Math.min(availablePairs, currentPairs + 2)
      : Math.max(3, currentPairs - 2);
  const harder = direction === "harder";
  const deck = memoryDeck(
    spec,
    pairCount,
    seedForCards(page.activity.cards) + (harder ? 97 : 53),
    !harder,
    harder
      ? "Find every pair without word labels. Say each new vocabulary word after you make a match."
      : "Use the picture and word labels together as you find each matching pair.",
  );

  return {
    ...page,
    instruction: harder
      ? "Cut out the cards. Turn them face down and find the matching picture pairs. Say each picture name when you make a match."
      : "Cut out the cards. Turn them face down and find the matching picture pairs. Use the word labels to help you.",
    activity: deck.activity,
    answerKey: deck.assets.map((asset, index) => ({
      groupId: `pair-${index + 1}`,
      answer: 2,
      answerText: titleCase(visualObjects[asset].singular),
    })),
    footerNote: harder
      ? "Challenge: name each picture from memory after you find its pair."
      : "Play in pairs: say the word out loud each time a card is turned over.",
  };
}

/** Pair integrity: every vocabulary item printed exactly twice, no orphans. */
export function validateMemoryPairs(page: WorksheetPageModel): string[] {
  if (page.activity.kind !== "memory-pairs") return [];
  const activity = page.activity;
  const errors: string[] = [];
  const cards = activity.cards;

  if (cards.length < 6) errors.push("a memory deck needs at least three pairs.");
  if (cards.length % 2 !== 0) errors.push("a memory deck must contain an even number of cards.");

  const ids = cards.map((card) => card.id);
  if (new Set(ids).size !== ids.length) errors.push("two memory cards share the same id.");

  const byPair = new Map<string, typeof cards>();
  for (const card of cards) {
    byPair.set(card.pairId, [...(byPair.get(card.pairId) ?? []), card]);
  }
  for (const [pairId, group] of byPair) {
    if (group.length !== 2) {
      errors.push(
        `${pairId}: printed ${group.length} times — every card must occur exactly twice.`,
      );
      continue;
    }
    if (group[0]!.asset !== group[1]!.asset)
      errors.push(`${pairId}: the two cards show different pictures.`);
    if (group[0]!.label !== group[1]!.label)
      errors.push(`${pairId}: the two cards carry different words.`);
    const expected = titleCase(visualObjects[group[0]!.asset].singular);
    if (group[0]!.label !== expected) {
      errors.push(`${pairId}: the label "${group[0]!.label}" does not name its illustration.`);
    }
    const keyed = page.answerKey.find((entry) => entry.groupId === pairId)?.answer;
    if (keyed !== 2) errors.push(`${pairId}: answer key must record two matching cards.`);
  }

  const assets = [...byPair.values()].map((group) => group[0]!.asset);
  if (new Set(assets).size !== assets.length) {
    errors.push("two different pairs show the same picture — the game would be ambiguous.");
  }
  return errors;
}

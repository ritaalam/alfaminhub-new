/**
 * Pattern engine.
 *
 * A pattern activity is only educational when it expresses an EXPLICIT
 * repeating rule. This module builds the rule first (AB, AAB, ABB, ABC),
 * expands it into a sequence, derives the single logically correct missing
 * item from the rule — never from a random pick — and can verify the whole row
 * programmatically before it is allowed to render.
 *
 * Size is deliberately NOT used to create pattern variety: patterns differ by
 * object identity, so every drawing on the row keeps the same size.
 */

import type { PatternRuleId, VisualAssetKey } from "./worksheet-model";

export const patternRules: PatternRuleId[] = ["AB", "AAB", "ABB", "ABC"];

/** letters of each rule, e.g. AAB -> [0,0,1] positions into the asset list */
const ruleLetters: Record<PatternRuleId, number[]> = {
  AB: [0, 1],
  AAB: [0, 0, 1],
  ABB: [0, 1, 1],
  ABC: [0, 1, 2],
};

/** How many distinct objects a rule needs. */
export function assetsNeeded(rule: PatternRuleId) {
  return new Set(ruleLetters[rule]).size;
}

export type PatternRow = {
  rule: PatternRuleId;
  /** the repeating unit, e.g. [butterfly, flower] */
  unit: VisualAssetKey[];
  /** the visible sequence, always ending one step BEFORE the missing item */
  sequence: VisualAssetKey[];
  /** the single logically correct missing item */
  answer: VisualAssetKey;
  /** wrong-but-plausible choices, all different from the answer */
  distractors: VisualAssetKey[];
};

/**
 * Builds one pattern row.
 *
 * The sequence always shows at least two complete repetitions so the rule is
 * readable, then stops at the position the child must complete.
 */
export function buildPatternRow(
  rule: PatternRuleId,
  assets: VisualAssetKey[],
  distractorPool: VisualAssetKey[],
  visibleSteps?: number,
): PatternRow | undefined {
  const letters = ruleLetters[rule];
  const needed = assetsNeeded(rule);
  const unique = [...new Set(assets)];
  if (unique.length < needed) return undefined;

  const unit = letters.map((letter) => unique[letter]!);
  const minVisible = unit.length * 2;
  const visible = Math.max(minVisible, Math.min(visibleSteps ?? minVisible + 1, unit.length * 3));
  const sequence = Array.from({ length: visible }, (_, i) => unit[i % unit.length]!);
  const answer = unit[visible % unit.length]!;

  const distractors: VisualAssetKey[] = [];
  for (const candidate of [...unit, ...distractorPool]) {
    if (candidate === answer || distractors.includes(candidate)) continue;
    distractors.push(candidate);
    if (distractors.length >= 2) break;
  }
  if (!distractors.length) return undefined;

  return { rule, unit, sequence, answer, distractors };
}

/**
 * Programmatic verification, run before a pattern row may be rendered.
 * Returns a list of human-readable problems; empty means the row is valid.
 */
export function validatePatternRow(row: {
  rule?: PatternRuleId | undefined;
  unit?: VisualAssetKey[] | undefined;
  sequence: VisualAssetKey[];
  answer: VisualAssetKey;
  choices: VisualAssetKey[];
}): string[] {
  const errors: string[] = [];
  if (!row.rule) errors.push("pattern row has no explicit repeating rule");
  if (!row.unit?.length) {
    errors.push("pattern row has no repeating unit");
    return errors;
  }
  const unit = row.unit;
  if (row.rule && unit.length !== ruleLetters[row.rule].length) {
    errors.push(`unit length ${unit.length} does not match rule ${row.rule}`);
  }
  if (row.sequence.length < unit.length * 2) {
    errors.push("pattern shows fewer than two full repetitions");
  }
  row.sequence.forEach((asset, index) => {
    if (asset !== unit[index % unit.length]) {
      errors.push(`position ${index + 1} breaks the ${row.rule ?? "?"} rule`);
    }
  });
  const expected = unit[row.sequence.length % unit.length];
  if (row.answer !== expected) {
    errors.push(`missing item should be ${expected}, not ${row.answer}`);
  }
  const correct = row.choices.filter((choice) => choice === row.answer).length;
  if (correct !== 1) {
    errors.push(`pattern offers ${correct} correct choices; exactly one is required`);
  }
  if (new Set(row.choices).size !== row.choices.length) {
    errors.push("pattern repeats an answer choice");
  }
  if (row.choices.length < 2 || row.choices.length > 3) {
    errors.push("pattern must offer 2–3 answer choices");
  }
  return errors;
}

/**
 * SEMANTIC QA — prompt ↔ instruction ↔ artwork
 * --------------------------------------------
 * A child must never have to guess what to count. If a page draws objects that
 * are NOT part of the counted set (scene distractors, background props), the
 * instruction has to say so explicitly: "Count only the insects."
 *
 * This layer inspects the finalized page data (the same arrays the renderer and
 * the answer key use) and either clarifies the instruction automatically or —
 * when it cannot — reports it as a validation error.
 */

import { visualObjects, matchCountableCategory } from "./semantic-topics";
import type { VisualAssetKey, WorksheetPageModel } from "./worksheet-model";

export type CountedSets = {
  /** assets belonging to the set the child must count */
  targets: VisualAssetKey[];
  /** assets drawn on the page that must NOT be counted */
  distractors: VisualAssetKey[];
};

/** Which drawn objects are counted, and which are decoration/distractors. */
export function countedSets(page: WorksheetPageModel): CountedSets | undefined {
  const a = page.activity;
  if (a.kind === "find-count") {
    const targets = new Set<VisualAssetKey>();
    const distractors = new Set<VisualAssetKey>();
    for (const object of a.sceneObjects) {
      (object.decorative ? distractors : targets).add(object.asset);
    }
    for (const asset of targets) distractors.delete(asset);
    return { targets: [...targets], distractors: [...distractors] };
  }
  if (a.kind === "count-match") {
    return {
      targets: [...new Set(a.groups.flatMap((g) => g.renderedObjects.map((o) => o.asset)))],
      distractors: [],
    };
  }
  if (a.kind === "count-circle") {
    return {
      targets: [...new Set(a.rows.flatMap((r) => r.renderedObjects.map((o) => o.asset)))],
      distractors: [],
    };
  }
  return undefined;
}

const COUNT_VERB = /\b(count|circle|colou?r|find)\b/i;

export function instructionIsExplicit(instruction: string) {
  return /\bonly\b/i.test(instruction);
}

/** Human name for the counted set: the category if there is one, else plurals. */
export function countedSubjectLabel(targets: VisualAssetKey[], instruction: string) {
  const match = instruction.match(
    /\b(?:count|circle|colou?r|find)\s+(?:all\s+)?(?:the\s+|each\s+)?([a-z][a-z' -]{2,20})/i,
  );
  const noun = match?.[1]?.trim().split(/[\s.]+/)[0];
  if (noun && matchCountableCategory(noun)) return noun.toLowerCase();
  const plurals = [...new Set(targets.map((asset) => visualObjects[asset].plural))];
  return plurals.length === 1 ? plurals[0]! : (noun ?? "pictures");
}

/**
 * Rewrites an ambiguous counting instruction so the counted set is explicit.
 * Returns the page unchanged when there is nothing to clarify.
 */
export function clarifyPageInstruction(page: WorksheetPageModel): WorksheetPageModel {
  const sets = countedSets(page);
  if (!sets || !sets.distractors.length) return page;
  const instruction = page.instruction ?? "";
  if (instructionIsExplicit(instruction) || !COUNT_VERB.test(instruction)) {
    if (instructionIsExplicit(instruction)) return page;
    const subject = countedSubjectLabel(sets.targets, instruction);
    return { ...page, instruction: `Count only the ${subject}.` };
  }
  const clarified = instruction.replace(
    /\b(count|circle|colou?r|find)\s+(?:all\s+)?(?:the\s+|each\s+)?/i,
    (_match, verb: string) => `${verb} only the `,
  );
  return { ...page, instruction: clarified };
}

/** Validation view of the same rule. */
export function semanticInstructionIssues(page: WorksheetPageModel): string[] {
  const sets = countedSets(page);
  if (!sets || !sets.distractors.length) return [];
  if (instructionIsExplicit(page.instruction ?? "")) return [];
  return [
    `The page draws ${sets.distractors.join(", ")} that must not be counted, but the instruction "${page.instruction}" does not say what to count. Say "Count only the …".`,
  ];
}

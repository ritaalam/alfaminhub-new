/**
 * INTERACTION VERBS — a HARD constraint.
 *
 * What the child physically DOES on the page (circle, match, sort, draw,
 * count, trace, write, complete a pattern, order) is part of the learning
 * objective. A convenient template that changes the interaction changes the
 * objective, so substitution is only ever allowed between mechanics that share
 * the same interaction verb.
 */

import type { WorksheetMechanicId } from "./worksheet-model";

export type InteractionVerb =
  | "circle"
  | "match"
  | "sort"
  | "draw"
  | "count"
  | "trace"
  | "write"
  | "pattern"
  | "order"
  | "compare"
  | "cut";

const INTERACTION_BY_MECHANIC: Record<WorksheetMechanicId, InteractionVerb> = {
  // counting + selecting a printed answer
  "count-circle": "circle",
  "find-target": "circle",
  "find-and-count": "count",
  "letter-recognition": "circle",
  "beginning-sound": "circle",
  "beginning-sound-discrimination": "circle",
  // connecting corresponding items with a line
  "count-match": "match",
  "match-pairs": "match",
  "picture-letter-match": "match",
  "memory-pairs": "match",
  // classifying into named categories
  "sort-attribute": "sort",
  "letter-sort": "sort",
  // drawing the answer
  "trace-draw": "draw",
  // comparison judgements
  "compare-quantity": "compare",
  "compare-size": "compare",
  "same-different": "compare",
  // patterns and sequencing
  "pattern-complete": "pattern",
  "sequence-order": "order",
  // formation
  "letter-trace": "trace",
  "letter-write": "write",
  "number-write": "write",
  "word-initial-complete": "write",
  // craft
  "cut-create-build": "cut",
  "cut-create-scene": "cut",
  "cut-create-count": "cut",
};

export function interactionOfMechanic(mechanic: WorksheetMechanicId): InteractionVerb {
  return INTERACTION_BY_MECHANIC[mechanic] ?? "count";
}

/** true when swapping `candidate` for `requested` keeps the child's action */
export function sameInteraction(
  requested: WorksheetMechanicId,
  candidate: WorksheetMechanicId,
): boolean {
  return interactionOfMechanic(requested) === interactionOfMechanic(candidate);
}

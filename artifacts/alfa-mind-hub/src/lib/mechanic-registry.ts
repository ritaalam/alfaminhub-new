/**
 * MECHANIC REGISTRY — the single place that answers "what does this activity
 * do, what educational data does it need, and how may it be drawn?".
 *
 * ARCHITECTURAL RULE (kept explicit in code):
 *
 *   THEME        = what children SEE      (butterflies, ocean, letter B)
 *   OBJECTIVE    = what children LEARN    (order the stages of a life cycle)
 *   MECHANIC     = what children DO       (sequencing)
 *   CONTENT MODEL= the educational data that mechanic requires (orderedSequence)
 *   RENDERER     = how it appears on paper (the sequence-stages page layout)
 *
 * A theme may NEVER select a mechanic, and a mechanic may never be swapped for
 * a "close enough" one at render time. Counting is a mechanic like any other —
 * it is never a fallback.
 */

import type { WorksheetActivity, WorksheetMechanicId } from "./worksheet-model";

/** The shape of the educational data a mechanic consumes. */
export type ContentType =
  | "quantityGroups"
  | "orderedSequence"
  | "pairSet"
  | "categorySet"
  | "choiceSet"
  | "sceneSet"
  | "letterSet"
  | "soundSet"
  | "craftSet"
  | "mazeSet";

export type ActivityKind = WorksheetActivity["kind"];

export type MechanicEntry = {
  mechanic: WorksheetMechanicId;
  /** teacher-facing name of the activity */
  label: string;
  /** the educational data structure this mechanic is generated from */
  contentType: ContentType;
  /**
   * Variants of one activity. A locked pack may rotate inside its family
   * (Count & Match → Count & Circle, Cut & Create build → scene → count) but
   * never outside it: patterns never become comparing.
   */
  family: string;
  /** page kinds (renderers) allowed to draw this mechanic */
  kinds: ActivityKind[];
  /** the skill line printed in metadata; never "Counting" unless it counts */
  skill: string;
  /** builds the printable title from the topic the theme resolved to */
  title: (topic: string) => string;
};

export const mechanicRegistry: Record<WorksheetMechanicId, MechanicEntry> = {
  "find-target": {
    mechanic: "find-target",
    family: "find",
    label: "Find",
    contentType: "choiceSet",
    kinds: ["find-target"],
    skill: "Visual Search",
    title: (topic) => `Find the ${topic}`,
  },
  "match-pairs": {
    mechanic: "match-pairs",
    family: "match",
    label: "Match",
    contentType: "pairSet",
    kinds: ["match-pairs"],
    skill: "Visual Matching",
    title: (topic) => `Match the ${topic}`,
  },
  "trace-draw": {
    mechanic: "trace-draw",
    family: "trace-draw",
    label: "Trace & Draw",
    contentType: "choiceSet",
    kinds: ["trace-draw"],
    skill: "Shape Formation",
    title: (topic) => `Trace & Draw ${topic}`,
  },
  "maze-route": {
    mechanic: "maze-route",
    family: "maze",
    label: "Maze",
    contentType: "mazeSet",
    kinds: ["maze"],
    skill: "Pathfinding",
    title: () => "Maze: Find the Finish",
  },
  "count-match": {
    mechanic: "count-match",
    family: "counting",
    label: "Count & Match",
    contentType: "quantityGroups",
    kinds: ["count-match"],
    skill: "Counting",
    title: (topic) => `Count the ${topic}`,
  },
  "count-circle": {
    mechanic: "count-circle",
    family: "counting",
    label: "Count & Circle",
    contentType: "quantityGroups",
    kinds: ["count-circle"],
    skill: "Counting",
    title: (topic) => `Count & Circle: ${topic}`,
  },
  "compare-quantity": {
    mechanic: "compare-quantity",
    family: "compare-quantity",
    label: "More & Fewer",
    contentType: "choiceSet",
    kinds: ["pick-one"],
    skill: "Comparing",
    title: (topic) => `More & Fewer: ${topic}`,
  },
  "compare-size": {
    mechanic: "compare-size",
    family: "compare-size",
    label: "Big & Small",
    contentType: "choiceSet",
    kinds: ["pick-one"],
    skill: "Comparing Size",
    title: (topic) => `Big & Small: ${topic}`,
  },
  "same-different": {
    mechanic: "same-different",
    family: "same-different",
    label: "Same & Different",
    contentType: "choiceSet",
    kinds: ["pick-one"],
    skill: "Visual Discrimination",
    title: (topic) => `Same & Different: ${topic}`,
  },
  "beginning-sound": {
    mechanic: "beginning-sound",
    family: "beginning-sound",
    label: "Beginning Sounds",
    contentType: "choiceSet",
    kinds: ["pick-one"],
    skill: "Beginning Sounds",
    title: (topic) => `Beginning Sounds: ${topic}`,
  },
  "beginning-sound-discrimination": {
    mechanic: "beginning-sound-discrimination",
    family: "beginning-sound-discrimination",
    label: "Beginning Sound Pictures",
    contentType: "soundSet",
    kinds: ["sound-hunt"],
    skill: "Beginning Sound Discrimination",
    title: (topic) => `Which Pictures Begin with ${topic}?`,
  },
  "pattern-complete": {
    mechanic: "pattern-complete",
    family: "pattern-complete",
    label: "Complete the Pattern",
    contentType: "choiceSet",
    kinds: ["pick-one"],
    skill: "Patterns",
    title: (topic) => `Patterns with ${topic}`,
  },
  "sequence-order": {
    mechanic: "sequence-order",
    family: "sequence-order",
    label: "Put in Order",
    contentType: "orderedSequence",
    kinds: ["sequence-stages", "order-sequence"],
    skill: "Sequencing",
    title: (topic) => `Put the ${topic} in Order`,
  },
  "find-and-count": {
    mechanic: "find-and-count",
    family: "find-and-count",
    label: "Find & Count",
    contentType: "sceneSet",
    kinds: ["find-count"],
    skill: "Find & Count",
    title: (topic) => `Find & Count: ${topic}`,
  },
  "sort-attribute": {
    mechanic: "sort-attribute",
    family: "sort-attribute",
    label: "Sort the Pictures",
    contentType: "categorySet",
    kinds: ["sort-groups"],
    skill: "Sorting",
    title: (topic) => `Sort the ${topic}`,
  },
  "letter-recognition": {
    mechanic: "letter-recognition",
    family: "letter-recognition",
    label: "Find the Letter",
    contentType: "letterSet",
    kinds: ["letter-search"],
    skill: "Letter Recognition",
    title: (topic) => `Find the ${topic}`,
  },
  "letter-trace": {
    mechanic: "letter-trace",
    family: "letter-trace",
    label: "Trace the Letter",
    contentType: "letterSet",
    kinds: ["letter-trace"],
    skill: "Letter Tracing",
    title: (topic) => `Trace the ${topic}`,
  },
  "letter-write": {
    mechanic: "letter-write",
    family: "letter-write",
    label: "Write the Letter",
    contentType: "letterSet",
    kinds: ["letter-trace"],
    skill: "Independent Writing",
    title: (topic) => `Write the ${topic}`,
  },
  "number-write": {
    mechanic: "number-write",
    family: "number-write",
    label: "Trace & Write Numbers",
    contentType: "letterSet",
    kinds: ["letter-trace"],
    skill: "Number Formation",
    title: (topic) => `Trace and Write ${topic}`,
  },
  "letter-sort": {
    mechanic: "letter-sort",
    family: "letter-sort",
    label: "Sort by First Sound",
    contentType: "categorySet",
    kinds: ["sort-groups"],
    skill: "Letter Sorting",
    title: (topic) => `Sort by First Sound: ${topic}`,
  },
  "picture-letter-match": {
    mechanic: "picture-letter-match",
    family: "picture-letter-match",
    label: "Match Pictures to the Letter",
    contentType: "soundSet",
    kinds: ["picture-letter-match"],
    skill: "Matching Sounds to Letters",
    title: (topic) => `Match the Pictures to ${topic}`,
  },
  "word-initial-complete": {
    mechanic: "word-initial-complete",
    family: "word-initial-complete",
    label: "Complete the Word",
    contentType: "soundSet",
    kinds: ["word-complete"],
    skill: "Completing Words",
    title: (topic) => `Complete the Words: ${topic}`,
  },
  "memory-pairs": {
    mechanic: "memory-pairs",
    family: "memory-pairs",
    label: "Memory Pairs",
    contentType: "pairSet",
    kinds: ["memory-pairs"],
    skill: "Vocabulary Memory",
    title: (topic) => `${topic} Memory Pairs`,
  },
  "cut-create-build": {
    mechanic: "cut-create-build",
    family: "cut-create",
    label: "Cut & Create",
    contentType: "craftSet",
    kinds: ["cut-create"],
    skill: "Cut & Create",
    title: (topic) => `Cut & Create: ${topic}`,
  },
  "cut-create-scene": {
    mechanic: "cut-create-scene",
    family: "cut-create",
    label: "Cut & Create",
    contentType: "craftSet",
    kinds: ["cut-create"],
    skill: "Cut & Create",
    title: (topic) => `Cut & Create: ${topic}`,
  },
  "cut-create-count": {
    mechanic: "cut-create-count",
    family: "cut-create",
    label: "Cut & Create",
    contentType: "craftSet",
    kinds: ["cut-create"],
    skill: "Cut & Create",
    title: (topic) => `Cut & Create: ${topic}`,
  },
};

/** The content model a mechanic must be generated from. */
/** Variants of the same activity, e.g. the two counting pages. */
export function familyOfMechanic(mechanic: WorksheetMechanicId): string {
  return mechanicRegistry[mechanic].family;
}

export function expectedContentTypeForMechanic(mechanic: WorksheetMechanicId): ContentType {
  return mechanicRegistry[mechanic].contentType;
}

const contentTypeByKind: Record<ActivityKind, ContentType> = {
  "find-target": "choiceSet",
  "match-pairs": "pairSet",
  "trace-draw": "choiceSet",
  maze: "mazeSet",
  "count-match": "quantityGroups",
  "count-circle": "quantityGroups",
  "pick-one": "choiceSet",
  "order-sequence": "orderedSequence",
  "sequence-stages": "orderedSequence",
  "find-count": "sceneSet",
  "sort-groups": "categorySet",
  "letter-search": "letterSet",
  "letter-trace": "letterSet",
  "sound-hunt": "soundSet",
  "memory-pairs": "pairSet",
  "cut-create": "craftSet",
  "picture-letter-match": "soundSet",
  "word-complete": "soundSet",
  // a dynamically composed page carries whatever content its mechanic needs
  composed: "choiceSet",
};

/** The content model a generated page actually contains. */
export function contentTypeOfActivity(activity: WorksheetActivity): ContentType {
  if (activity.kind === "composed") return expectedContentTypeForMechanic(activity.mechanic);
  return contentTypeByKind[activity.kind];
}

/** Renderers registered for a mechanic. Theme never influences this. */
export function kindsForMechanic(mechanic: WorksheetMechanicId): ActivityKind[] {
  return mechanicRegistry[mechanic].kinds;
}

export function rendererSupports(mechanic: WorksheetMechanicId, kind: ActivityKind) {
  // "composed" is the universal renderer: any mechanic may be expressed as a
  // composition of reusable components when no template fits its specification
  if (kind === "composed") return true;
  return mechanicRegistry[mechanic].kinds.includes(kind);
}

/**
 * HARD PRE-RENDER CONTRACT CHECK.
 *
 * Runs between the content generator and the renderer. A mismatch means the
 * pipeline produced a different educational activity from the one that was
 * planned — that must fail loudly, never print the wrong worksheet.
 */
export function assertActivityContract(
  planned: WorksheetMechanicId,
  activity: WorksheetActivity,
  context = "page",
): void {
  const actual =
    activity.kind === "count-match" || activity.kind === "count-circle"
      ? activity.kind
      : activity.mechanic;
  if (actual !== planned) {
    throw new Error(
      `${context}: planned mechanic "${planned}" but generated "${actual}". Mechanic drift is never allowed.`,
    );
  }
  if (!rendererSupports(planned, activity.kind)) {
    throw new Error(`${context}: no renderer for "${planned}" draws a "${activity.kind}" page.`);
  }
  const expected = expectedContentTypeForMechanic(planned);
  const generated = contentTypeOfActivity(activity);
  if (expected !== generated) {
    throw new Error(
      `${context}: "${planned}" requires ${expected} content but received ${generated}.`,
    );
  }
}

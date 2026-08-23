import type { WorksheetSpec } from "./creator-options";
import type { WorksheetMechanicId } from "./worksheet-model";

export type AdvancedActivityTypeSupport = {
  activityType: string;
  status: "supported" | "unsupported";
  /** The exact mechanic that a supported named activity renders. */
  mechanic?: WorksheetMechanicId;
  /** Why a named option cannot be generated honestly yet. */
  message?: string;
};

/**
 * Advanced Create offers named child interactions. A name is only supported
 * when the printable engine has a renderer for that same interaction — never
 * because there happens to be a visually similar page.
 */
const advancedActivityTypeSupport: readonly AdvancedActivityTypeSupport[] = [
  // Counting is a supported activity family. Its response model is selected
  // from the prompt's explicit layout/instructions (Count & Match or Count &
  // Circle), while the preview and frozen spec remain "Counting".
  { activityType: "Counting", status: "supported" },
  { activityType: "Tracing", status: "supported", mechanic: "trace-draw" },
  { activityType: "Matching", status: "supported", mechanic: "match-pairs" },
  {
    activityType: "Maze",
    status: "supported",
    mechanic: "maze-route",
  },
  { activityType: "Patterns", status: "supported", mechanic: "pattern-complete" },
  { activityType: "Cut & Paste", status: "supported", mechanic: "cut-create-build" },
  { activityType: "Sorting", status: "supported", mechanic: "sort-attribute" },
  { activityType: "I Spy", status: "supported", mechanic: "find-and-count" },
  {
    activityType: "Bingo",
    status: "unsupported",
    message: "Bingo is not available yet because Alfa does not have a bingo-card renderer.",
  },
  {
    activityType: "Flashcards",
    status: "unsupported",
    message: "Flashcards are not available yet because Alfa does not have a flashcard renderer.",
  },
  {
    activityType: "Coloring",
    status: "unsupported",
    message: "Coloring is not available yet because Alfa does not have a coloring-page renderer.",
  },
  { activityType: "Sequencing", status: "supported", mechanic: "sequence-order" },
  {
    activityType: "Puzzle",
    status: "unsupported",
    message: "Puzzles are not available yet because Alfa does not have a puzzle renderer.",
  },
  // Worksheet is intentionally a format, not a named child interaction. Its
  // selected skill determines the supported printable mechanic.
  { activityType: "Worksheet", status: "supported" },
  {
    activityType: "Mini Book",
    status: "unsupported",
    message: "Mini Books are not available yet because Alfa does not have a booklet renderer.",
  },
  {
    activityType: "Scissor Skills",
    status: "unsupported",
    message: "Scissor Skills are not available yet because Alfa does not have a scissor-practice renderer.",
  },
  {
    activityType: "Find the Difference",
    status: "supported",
    mechanic: "same-different",
  },
  {
    activityType: "Connect the Dots",
    status: "unsupported",
    message: "Connect the Dots is not available yet because Alfa does not have a dot-connection renderer.",
  },
] as const;

const supportByActivityType = new Map(
  advancedActivityTypeSupport.map((entry) => [entry.activityType.toLowerCase(), entry]),
);

export function advancedActivityTypeSupportFor(value: string): AdvancedActivityTypeSupport | undefined {
  return supportByActivityType.get(value.trim().toLowerCase());
}

/** A named interaction in the current Quick Create prompt is a renderer contract. */
export function promptActivityTypeFor(spec: WorksheetSpec): string | undefined {
  return spec.promptRequirements?.requestedActivity?.trim() || undefined;
}

export function promptActivityTypeSupportFor(spec: WorksheetSpec): AdvancedActivityTypeSupport | undefined {
  const activityType = promptActivityTypeFor(spec);
  return activityType ? advancedActivityTypeSupportFor(activityType) : undefined;
}

export function promptActivityMechanicFor(spec: WorksheetSpec): WorksheetMechanicId | undefined {
  return promptActivityTypeSupportFor(spec)?.status === "supported"
    ? promptActivityTypeSupportFor(spec)?.mechanic
    : undefined;
}

export function isPromptActivityTypeLocked(spec: WorksheetSpec) {
  return Boolean(promptActivityMechanicFor(spec));
}

export function isAdvancedActivityTypeLocked(spec: WorksheetSpec) {
  return Boolean(spec.advancedActivityType?.trim());
}

/** A mode switch to Quick Create starts an open-ended request, not a stale Advanced contract. */
export function withoutAdvancedActivityType(spec: WorksheetSpec): WorksheetSpec {
  const { advancedActivityType: _advancedActivityType, ...quickSpec } = spec;
  return quickSpec;
}

export function advancedActivityMechanicFor(spec: WorksheetSpec): WorksheetMechanicId | undefined {
  if (!isAdvancedActivityTypeLocked(spec)) return undefined;
  return advancedActivityTypeSupportFor(spec.advancedActivityType!)?.mechanic;
}

export class UnsupportedAdvancedActivityTypeError extends Error {
  readonly activityType: string;

  constructor(activityType: string, message: string) {
    super(message);
    this.name = "UnsupportedAdvancedActivityTypeError";
    this.activityType = activityType;
  }
}

/** Blocks an Advanced option before any planner, repair, Studio, or export path can reinterpret it. */
export function assertAdvancedActivityTypeSupported(spec: WorksheetSpec) {
  if (!isAdvancedActivityTypeLocked(spec)) return;
  const activityType = spec.advancedActivityType!.trim();
  const support = advancedActivityTypeSupportFor(activityType);
  if (!support) {
    throw new UnsupportedAdvancedActivityTypeError(
      activityType,
      `“${activityType}” is not an available Advanced Create activity type.`,
    );
  }
  if (support.status === "unsupported") {
    throw new UnsupportedAdvancedActivityTypeError(activityType, support.message!);
  }
}

/** Blocks a named Quick Create request before a planner can substitute a different activity. */
export function assertPromptActivityTypeSupported(spec: WorksheetSpec) {
  const activityType = promptActivityTypeFor(spec);
  if (!activityType) return;
  const support = advancedActivityTypeSupportFor(activityType);
  if (!support) {
    throw new UnsupportedAdvancedActivityTypeError(
      activityType,
      `“${activityType}” is not an available Quick Create activity type.`,
    );
  }
  if (support.status === "unsupported") {
    throw new UnsupportedAdvancedActivityTypeError(activityType, support.message!);
  }
}

export const advancedActivityTypeAudit = advancedActivityTypeSupport;

/**
 * The AI planner may choose only activities that the printable renderer can
 * draw today. Keep this separate from the wider Creator menu: a menu option
 * can remain selectable while its nearest printable equivalent is used.
 */
export const plannerRenderableActivityTypes = [
  "Counting",
  "Tracing",
  "Matching",
  "Maze",
  "Cut & Paste",
  "Sorting",
  "I Spy",
  "Patterns",
  "Sequencing",
  "Find the Difference",
  "Worksheet",
] as const;

export function normalizeRendererActivityType(value: string): string {
  return value.trim();
}

export function rendererMechanicFor(mechanic: WorksheetMechanicId): WorksheetMechanicId {
  // A renderer mechanic is no longer normalized to an educationally "close"
  // substitute. Every mechanic listed in the registry must keep its own
  // renderer path, or be blocked before generation.
  return mechanic;
}

export function normalizeWorksheetSpecForRenderer(spec: WorksheetSpec): WorksheetSpec {
  // An Advanced selection is a hard contract. The historical normalizer exists
  // for Quick Create's open-ended wording only; it must never rewrite a named
  // Advanced activity such as Maze into Tracing.
  if (isAdvancedActivityTypeLocked(spec) || promptActivityTypeFor(spec)) return spec;
  const activityType = normalizeRendererActivityType(spec.activityType);
  return activityType === spec.activityType ? spec : { ...spec, activityType };
}

export function wasRendererMechanicConverted(
  requested: WorksheetMechanicId,
  rendered: WorksheetMechanicId,
) {
  return requested !== rendered && rendererMechanicFor(requested) === rendered;
}
/**
 * Structured worksheet model.
 *
 * The printable renderer NEVER hard-codes content — it renders exclusively from
 * this data. Later, an AI service can emit the very same shape (see
 * `worksheet-service.ts`) while Alfa's renderer keeps full control of the
 * professional print layout.
 */

import type { AlfaCharacterKey } from "./alfa-characters";
import {
  applyPrintMode,
  resolveVisualDirection,
  type DirectionPalette,
  type IllustrationPurpose,
  type IllustrationStyle,
  type PrintModeId,
} from "./visual-directions";

export type PaperFormat = "A4" | "Letter" | "A5";

export type PrintPalette = {
  id: string;
  name: string;
  /** page background (kept near-white for print economy) */
  paper: string;
  ink: string;
  inkSoft: string;
  rule: string;
  accent: string;
  accentSoft: string;
  surface: string;
  wing: string;
  wingAlt: string;
};

export const printPalettes: Record<string, PrintPalette> = {
  "Montessori Neutrals": {
    id: "montessori-neutrals",
    name: "Montessori Neutrals",
    paper: "#FFFFFF",
    ink: "#33382F",
    inkSoft: "#7C8274",
    rule: "#DED8CB",
    accent: "#B5714F",
    accentSoft: "#F1E4DB",
    surface: "#FAF7F0",
    wing: "#9DAE92",
    wingAlt: "#D8C7A8",
  },
  "Warm Earth": {
    id: "warm-earth",
    name: "Warm Earth",
    paper: "#FFFFFF",
    ink: "#3A3129",
    inkSoft: "#857767",
    rule: "#E3D8C8",
    accent: "#A9603C",
    accentSoft: "#F3E3D6",
    surface: "#FBF6EF",
    wing: "#C08A5E",
    wingAlt: "#DCC49B",
  },
  "Soft Pastel": {
    id: "soft-pastel",
    name: "Soft Pastel",
    paper: "#FFFFFF",
    ink: "#3B3946",
    inkSoft: "#8B8798",
    rule: "#E4E1EC",
    accent: "#B080A8",
    accentSoft: "#F3E9F1",
    surface: "#FBF8FC",
    wing: "#A9BFD4",
    wingAlt: "#E6C9CE",
  },
  "Ink Saving": {
    id: "ink-saving",
    name: "Ink Saving",
    paper: "#FFFFFF",
    ink: "#1F1F1F",
    inkSoft: "#6B6B6B",
    rule: "#CFCFCF",
    accent: "#1F1F1F",
    accentSoft: "#FFFFFF",
    surface: "#FFFFFF",
    wing: "#FFFFFF",
    wingAlt: "#FFFFFF",
  },
};

/**
 * Resolves the palette actually used by the renderer.
 *
 * Visual direction wins when a project declares one (that is the art-direction
 * layer); the legacy named palettes stay supported for older projects. The
 * chosen print mode is then applied on top, so one set of artwork serves
 * Premium Color, Soft Color, Ink-Saving and Black & White.
 */
export function resolvePalette(name: string, mode: RenderMode, directionId?: string): PrintPalette {
  const direction = directionId ? resolveVisualDirection(directionId) : undefined;
  const base: DirectionPalette =
    direction?.palette ?? printPalettes[name] ?? printPalettes["Montessori Neutrals"]!;
  const applied = applyPrintMode(base, mode);
  return {
    id: direction?.id ?? printPalettes[name]?.id ?? "montessori-neutrals",
    name: direction?.name ?? name,
    ...applied,
  };
}

export type RenderMode = PrintModeId;

/**
 * Generic, original artwork keys — no licensed characters.
 * The registry lives in the semantic topic layer so objects, labels and the
 * themes they belong to stay in one place.
 */
import type { VisualAssetKey } from "./semantic-topics";
export type { VisualAssetKey };
export { visualAssetLabels, visualAssetKeys } from "./semantic-topics";

export type RenderedCountObject = {
  /** stable identity shared by preview, print/PDF, answers, and validation */
  id: string;
  asset: VisualAssetKey;
  /** optional original Alfa character used instead of the generic asset */
  character?: AlfaCharacterKey | undefined;
  /** spoken word for this picture — used by phonics work ("ball") */
  label?: string;
  /** printed letter shown INSTEAD of the artwork (initial-sound work) */
  letter?: string;
};

export type CountGroup = {
  id: string;
  /**
   * Canonical final objects. There is deliberately no independent `count`:
   * every numerical answer is derived from renderedObjects.length.
   */
  renderedObjects: RenderedCountObject[];
  /** Final answer, derived only from renderedObjects.length during finalization. */
  correctAnswer: number;
  /** optional short caption under the group */
  label?: string;
};

export function renderedObjectCount(group: CountGroup): number {
  return group.renderedObjects.length;
}

/**
 * The pedagogical mechanic a page actually practises.
 *
 * The generator must preserve the learning objective it was asked for: a
 * "more & fewer" idea has to produce a real comparison page, never a generic
 * counting page. The mechanic id is carried on the activity so validation can
 * verify the objective survived generation.
 */
export type WorksheetMechanicId =
  | "count-match"
  | "count-circle"
  | "find-target"
  | "match-pairs"
  | "trace-draw"
  | "compare-quantity"
  | "compare-size"
  | "same-different"
  | "beginning-sound"
  // PHONEMIC AWARENESS: circling pictures whose NAME starts with a sound.
  // Deliberately distinct from "letter-recognition" (a visual letter hunt).
  | "beginning-sound-discrimination"
  | "pattern-complete"
  | "sequence-order"
  | "find-and-count"
  | "sort-attribute"
  | "letter-recognition"
  | "letter-trace"
  // INDEPENDENT HANDWRITING: the child writes the letter without tracing
  // guides. Deliberately distinct from "letter-trace" so a pack can progress
  // from guided formation to independent writing.
  | "letter-write"
  // NUMBER FORMATION: guided dotted numerals followed by blank writing space
  | "number-write"
  | "letter-sort"
  // MATCHING: draw a line from each picture to the letter its name begins with
  | "picture-letter-match"
  // COMPLETION: write the missing first letter under each picture
  | "word-initial-complete"
  // vocabulary / memory card work: a card game, never a counting page
  | "memory-pairs"
  // craft / fine-motor mechanics: explicitly requested scissors work
  | "cut-create-build"
  | "cut-create-scene"
  | "cut-create-count";

/** A "count the group, match it to a number on the other side" block. */
export type MatchActivity = {
  kind: "count-match";
  groups: CountGroup[];
  /** number options rendered on the opposite column, in display order */
  numberChoices: number[];
};

/** A "count the group, circle the right number" block. */
export type CircleActivity = {
  kind: "count-circle";
  rows: Array<CountGroup & { choices: number[] }>;
  challenge?: string;
  /**
   * How the child answers. "circle" prints number cards; "draw" prints an empty
   * box in which the child draws that many marks — a different response mode,
   * never interchangeable with circling a printed numeral.
   */
  responseMode?: "circle" | "draw";
  /** what the child draws in the answer box, e.g. "circles" */
  drawPrompt?: string;
};

/** Find specified pictures among visual distractors; no quantities are involved. */
export type FindTargetActivity = {
  kind: "find-target";
  mechanic: "find-target";
  targetAsset: VisualAssetKey;
  items: Array<RenderedCountObject & { isTarget: boolean }>;
};

/** Connect each picture on the left to its identical partner on the right. */
export type MatchPairsActivity = {
  kind: "match-pairs";
  mechanic: "match-pairs";
  subtype?: "identical-pairs" | "baby-parent" | "sound-to-picture" | "object-to-shape";
  relationship?: string;
  left: Array<{
    id: string;
    pairId: string;
    asset: VisualAssetKey;
    label?: string;
    letter?: string;
  }>;
  right: Array<{
    id: string;
    pairId: string;
    asset: VisualAssetKey;
    label?: string;
    letter?: string;
  }>;
};

/** Follow dotted shape outlines, then reproduce the shapes independently. */
export type TraceDrawActivity = {
  kind: "trace-draw";
  mechanic: "trace-draw";
  subtype?: "shape-formation" | "path-tracing";
  shapes: Array<{ id: string; asset: VisualAssetKey; label: string }>;
  paths?: Array<{
    id: string;
    from: RenderedCountObject & { label: string };
    to: RenderedCountObject & { label: string };
    relationship: string;
  }>;
};

/** One selectable card in a pick-one activity. */
export type PickOption = {
  id: string;
  /** artwork drawn inside the card (a group, a pair, or a single item) */
  renderedObjects: RenderedCountObject[];
  /** relative drawing scale — used by big/small comparison */
  scale?: number;
  /** short text printed on the card (used by letter/sound work) */
  label?: string;
};

/** The repeating rule a pattern row is built from. */
export type PatternRuleId = "AB" | "AAB" | "ABB" | "ABC";

export type PickRow = {
  id: string;
  /** optional reference artwork shown before the options */
  promptObjects?: RenderedCountObject[];
  /** optional reference text, e.g. the letter "B" */
  promptLabel?: string;
  /** true when the reference is a pattern ending in an empty slot */
  promptGap?: boolean;
  /** explicit repeating rule when this row is a pattern */
  patternRule?: PatternRuleId;
  /** the repeating unit the rule expands, e.g. [butterfly, flower] */
  patternUnit?: VisualAssetKey[];
  options: PickOption[];
  /** the single correct option id */
  answerOptionId: string;
};

/**
 * "Circle the one that …" — the shared shape behind more/fewer, big/small,
 * same/different, beginning sounds and pattern completion.
 */
export type PickActivity = {
  kind: "pick-one";
  mechanic: WorksheetMechanicId;
  rows: PickRow[];
  challenge?: string;
};

export type OrderItem = {
  id: string;
  renderedObjects: RenderedCountObject[];
  scale?: number;
  /** 1 = first in the correct order */
  rank: number;
};

/** "Number these pictures in order" — sequencing / ordering work. */
export type OrderActivity = {
  kind: "order-sequence";
  mechanic: WorksheetMechanicId;
  rows: Array<{ id: string; items: OrderItem[] }>;
  challenge?: string;
};

/** One object placed inside a find & count scene. */
export type SceneObject = RenderedCountObject & {
  /** placement inside the scene panel, 0–100 % of its width / height */
  xPct: number;
  yPct: number;
  /** true for garden scenery that is NOT part of the counted target set */
  decorative?: boolean;
};

/**
 * "Find & Count" — one simple scene containing the target objects mixed with
 * a little scenery. The counted group is a strict subset of the scene, so the
 * answer is still derived from the objects actually drawn.
 */
export type FindCountActivity = {
  kind: "find-count";
  mechanic: WorksheetMechanicId;
  targetAsset: VisualAssetKey;
  /** everything drawn in the scene, in draw order */
  sceneObjects: SceneObject[];
  /** the countable target set — same object ids as the non-decorative scene items */
  group: CountGroup;
  choices: number[];
  challenge?: string;
};

export type SortBin = {
  id: string;
  label: string;
  /** representative picture drawn on the bin */
  asset: VisualAssetKey;
  /** phonics bins sort by first letter instead of by picture identity */
  startsWith?: string;
  /** semantic attribute sorting (for example, animals with 2 vs 4 legs) */
  criterion?: { attribute: string; value: string | number };
  /** semantic category sorting: the pictures that belong in this box */
  members?: VisualAssetKey[];
};

/** True when an item belongs in this sorting box. */
export function sortBinAccepts(bin: SortBin, item: RenderedCountObject): boolean {
  if (bin.startsWith) {
    return (item.label ?? "").toLowerCase().startsWith(bin.startsWith.toLowerCase());
  }
  if (bin.members?.length) return bin.members.includes(item.asset);
  if (bin.criterion?.attribute === "leg-count") {
    const legs: Partial<Record<VisualAssetKey, number>> = {
      cow: 4,
      calf: 4,
      sheep: 4,
      lamb: 4,
      pig: 4,
      piglet: 4,
      chicken: 2,
      chick: 2,
      bird: 2,
    };
    return legs[item.asset] === bin.criterion.value;
  }
  return bin.asset === item.asset;
}

/** "Sorting" — one mixed strip of items and two clearly labelled sorting areas. */
export type SortActivity = {
  kind: "sort-groups";
  mechanic: WorksheetMechanicId;
  bins: SortBin[];
  /** the mixed items the child sorts, in display order */
  items: RenderedCountObject[];
  challenge?: string;
};

/** One printed glyph inside a letter-hunt row. */
export type LetterGlyph = {
  id: string;
  glyph: string;
  /** true when this glyph is the letter the child must find */
  isTarget: boolean;
};

/** "Find and circle every letter B" — letter recognition. */
export type LetterSearchActivity = {
  kind: "letter-search";
  mechanic: WorksheetMechanicId;
  /** the letter being practised, uppercase */
  targetLetter: string;
  rows: Array<{ id: string; glyphs: LetterGlyph[] }>;
  challenge?: string;
};

/** "Trace the letter" — handwriting formation plus picture words. */
export type LetterTraceActivity = {
  kind: "letter-trace";
  mechanic: WorksheetMechanicId;
  targetLetter: string;
  /**
   * "guided"      — a model letter plus dashed letters to trace.
   * "independent" — one small reminder model, then EMPTY ruled writing space
   *                 the child fills in without any tracing guide.
   */
  mode?: "guided" | "independent";
  rows: Array<{
    id: string;
    glyph: string;
    repeats: number;
    caption?: string;
    /** how many of the row's slots are dashed trace guides (independent rows use 0–1) */
    traceSlots?: number;
    /** how many slots are blank handwriting space */
    blankSlots?: number;
  }>;
  /** picture words that begin with the letter, drawn under the tracing lines */
  words: Array<{ id: string; word: string; asset: VisualAssetKey }>;
};

/**
 * "Which pictures begin with /b/?" — beginning-sound discrimination.
 *
 * Every item carries the sound its NAME starts with, so the answer key is
 * derived from `isTarget`, never from position on the page.
 */
export type SoundHuntItem = {
  id: string;
  word: string;
  initialPhoneme: string;
  asset: VisualAssetKey;
  isTarget: boolean;
};

export type SoundHuntActivity = {
  kind: "sound-hunt";
  mechanic: WorksheetMechanicId;
  targetLetter: string;
  targetPhoneme: string;
  items: SoundHuntItem[];
  challenge?: string;
};

/**
 * "Draw a line from each picture to the letter its name begins with."
 *
 * A REAL matching mechanic: pictures in the left column, letter cards in the
 * right column, one line per picture. Distinct from sound-hunt (circling) and
 * from letter-sort (which would introduce a second taught letter).
 */
export type PictureLetterMatchActivity = {
  kind: "picture-letter-match";
  mechanic: WorksheetMechanicId;
  targetLetter: string;
  targetPhoneme: string;
  /** pictures printed in the left column, in print order */
  pictures: Array<{
    id: string;
    word: string;
    asset: VisualAssetKey;
    /** the letter card this picture must be joined to */
    letter: string;
    isTarget: boolean;
  }>;
  /** letter cards printed in the right column, in print order */
  letterCards: Array<{ id: string; letter: string }>;
};

/**
 * "Complete the word" — the child writes the missing first letter under each
 * picture. A genuine completion task, never a selection task.
 */
export type WordCompleteActivity = {
  kind: "word-complete";
  mechanic: WorksheetMechanicId;
  targetLetter: string;
  targetPhoneme: string;
  items: Array<{
    id: string;
    word: string;
    asset: VisualAssetKey;
    /** the letter the child writes into the blank */
    missingLetter: string;
    /** the remainder of the word printed after the blank */
    remainder: string;
  }>;
};

/** One cut-out piece printed with its own cutting boundary. */
export type CutCreatePiece = RenderedCountObject & {
  /** the word printed under the piece */
  label: string;
};

/**
 * "Cut & Create" — an explicitly requested craft mechanic.
 *
 * The page prints a large build area (an aquarium, a plate, an open scene)
 * plus separated cut-out pieces. There is no single right answer unless the
 * page adds counting targets, so the answer key stays empty for build pages.
 */
export type CutCreateActivity = {
  kind: "cut-create";
  mechanic: WorksheetMechanicId;
  base: {
    id: string;
    label: string;
    caption: string;
    shape: "aquarium" | "plate" | "scene" | "open";
  };
  pieces: CutCreatePiece[];
  /** counting instructions for the Cut & Create counting challenge page */
  targets?: Array<{ id: string; asset: VisualAssetKey; label: string; quantity: number }>;
  challenge?: string;
};

/** One printable memory card. Two cards share a pairId and are identical. */
export type MemoryCard = {
  id: string;
  /** the vocabulary item this card belongs to; exactly two cards share it */
  pairId: string;
  asset: VisualAssetKey;
  /** the word printed under the picture */
  label: string;
};

/**
 * "Memory Pairs" — printable vocabulary cards.
 *
 * There is no counting and no quantity matching: the child cuts the cards out,
 * turns them face down and finds the identical pairs. Every vocabulary item
 * occurs exactly twice.
 */
export type MemoryPairsActivity = {
  kind: "memory-pairs";
  mechanic: WorksheetMechanicId;
  cards: MemoryCard[];
  /** print the word under each picture (older children) */
  showLabels: boolean;
  challenge?: string;
};

/** One stage of a real-world process, printed as a cut-out card. */
export type SequenceStageCard = {
  id: string;
  /** stable stage identity, e.g. "egg" | "caterpillar" | "chrysalis" */
  stageId: string;
  /** 1 = first stage of the correct order */
  order: number;
  label: string;
  asset: VisualAssetKey;
};

/**
 * "Put the stages in order" — genuine sequencing.
 *
 * The page prints numbered slots (1 → n) and a shuffled set of cut-out stage
 * cards. There are no quantities and nothing to count: each stage appears
 * exactly once and the answer is the biological / logical order.
 */
export type SequenceStagesActivity = {
  kind: "sequence-stages";
  mechanic: WorksheetMechanicId;
  /** id of the process being sequenced, e.g. "butterfly-life-cycle" */
  processId: string;
  processLabel: string;
  /** numbered slots the child fills, in display order (1..n) */
  slots: Array<{ id: string; position: number }>;
  /** shuffled cut-out cards, in print order */
  cards: SequenceStageCard[];
  showLabels: boolean;
  challenge?: string;
};

/* ------------------------------------------------------------------------ *
 * COMPOSABLE COMPONENT LAYER
 * --------------------------
 * Alfa is not a fixed set of worksheet templates. Every printable is, at the
 * bottom, a list of reusable educational components. A template is simply a
 * frequently used composition; when a Page Specification asks for something no
 * template covers, the planner composes the page out of these primitives
 * instead of substituting a different activity.
 * ------------------------------------------------------------------------ */

/** One entry in a matching column: a picture, a glyph, or both. */
export type MatchColumnEntry = {
  id: string;
  object?: RenderedCountObject;
  /** numeral, letter or word printed on the card */
  text?: string;
  /** id of the entry in the opposite column this one connects to */
  targetId?: string;
};

export type WorksheetComponent =
  /** a short line of teacher copy inside the activity area */
  | { type: "instruction"; id: string; text: string; emphasis?: "quiet" | "strong" }
  /** a strip of picture / shape / object cards */
  | {
      type: "card-row";
      id: string;
      label?: string;
      items: RenderedCountObject[];
      captions?: boolean;
    }
  /** a numeral, letter or word printed as a card */
  | { type: "glyph-card"; id: string; glyph: string; variant: "numeral" | "letter" | "word" }
  /** two columns with a clear corridor for the child's connecting lines */
  | { type: "match-columns"; id: string; left: MatchColumnEntry[]; right: MatchColumnEntry[] }
  /** labelled category areas plus the mixed items to place in them */
  | { type: "sort-bins"; id: string; bins: SortBin[]; items: RenderedCountObject[] }
  /** a countable set whose printed quantity IS the answer */
  | {
      type: "counting-group";
      id: string;
      items: RenderedCountObject[];
      label?: string;
      answer: number;
    }
  /** two or more sets printed side by side for a more / fewer judgement */
  | {
      type: "comparison-group";
      id: string;
      groups: Array<{ id: string; label?: string; items: RenderedCountObject[] }>;
    }
  /** a repeating sequence with one missing slot */
  | { type: "pattern-sequence"; id: string; shown: RenderedCountObject[]; rule?: string }
  /** printed options the child circles or ticks */
  | {
      type: "answer-choices";
      id: string;
      choices: Array<{ id: string; text?: string; object?: RenderedCountObject }>;
      answerId?: string;
    }
  /** a small empty box for a written answer */
  | { type: "response-box"; id: string; label?: string; heightMm?: number }
  /** a large empty area the child draws in */
  | { type: "drawing-area"; id: string; label?: string; heightMm?: number }
  /** ruled handwriting space */
  | { type: "handwriting-line"; id: string; slots: number; guide?: string }
  /** dotted glyphs or shapes to trace, then blank repeats */
  | {
      type: "tracing-row";
      id: string;
      glyph?: string;
      shape?: VisualAssetKey;
      traceSlots: number;
      blankSlots: number;
      label?: string;
    }
  /** cut-and-paste style loose pieces */
  | { type: "cut-out-strip"; id: string; items: RenderedCountObject[]; note?: string }
  /** layout: children placed left to right */
  | {
      type: "row";
      id: string;
      children: WorksheetComponent[];
      align?: "start" | "center" | "between";
    }
  /** layout: children stacked vertically */
  | { type: "stack"; id: string; children: WorksheetComponent[] };

/**
 * A page assembled from components rather than from a template. It still
 * carries a mechanic (so the page-plan contract can be enforced) and its own
 * copy of the Page Specification it was composed to satisfy.
 */
export type ComposedActivity = {
  kind: "composed";
  mechanic: WorksheetMechanicId;
  specification: {
    studentAction?: PageStudentAction;
    responseMode?: PageResponseMode;
    contentDomain?: PageContentDomain;
    subtype?: string;
  };
  components: WorksheetComponent[];
  challenge?: string;
};

/** Every component in a composition, including nested layout children. */
export function flattenComponents(components: WorksheetComponent[]): WorksheetComponent[] {
  return components.flatMap((component) =>
    component.type === "row" || component.type === "stack"
      ? [component, ...flattenComponents(component.children)]
      : [component],
  );
}

export type WorksheetActivity =
  | ComposedActivity
  | MatchActivity
  | FindTargetActivity
  | MatchPairsActivity
  | TraceDrawActivity
  | MemoryPairsActivity
  | CircleActivity
  | PickActivity
  | OrderActivity
  | SequenceStagesActivity
  | FindCountActivity
  | SortActivity
  | LetterSearchActivity
  | LetterTraceActivity
  | SoundHuntActivity
  | PictureLetterMatchActivity
  | WordCompleteActivity
  | CutCreateActivity;

export type AnswerKeyEntry = {
  groupId: string;
  /** numeric answer (a count, or the 1-based index of the correct option) */
  answer: number;
  /** human-readable answer for non-numeric mechanics */
  answerText?: string;
};

export type WorksheetPageModel = {
  id: string;
  title: string;
  instruction: string;
  activityType: string;
  activity: WorksheetActivity;
  /** immutable teacher requirements used by the final renderer */
  semanticRequirements?: PageSemanticRequirements;
  /** correct answers are always stored, never rendered on the student sheet */
  answerKey: AnswerKeyEntry[];
  layout: "two-column-match" | "stacked-rows";
  /** what the artwork on this page is for — drives visual complexity */
  purpose: IllustrationPurpose;
  /** resolved art rules for this page (direction + age + purpose) */
  illustrationStyle: IllustrationStyle;
  /** optional original Alfa character greeting the child on this page */
  mascot?: AlfaCharacterKey | undefined;
  /**
   * Extra skills this page also teaches beyond its own mechanic — e.g. a
   * tracing page that introduces upper and lower case. Coverage validation
   * reads this so a requested skill is never reported as missing when it is
   * genuinely taught.
   */
  coveredSkills?: WorksheetMechanicId[];
  /**
   * Presentation-only reflow stamped by the pre-render layout validator when
   * the page's artwork would otherwise collide or leave the safe print area.
   */
  layoutFit?: { objectScale: number } | undefined;
  footerNote?: string;
  /**
   * The page's pictures ARE its specification (object→shape matching, semantic
   * sorting, composed pages). Theme repair must never swap or drop them.
   */
  contentLocked?: boolean;
};

export type WorksheetMeta = {
  level: string;
  ageRange: string;
  difficulty: string;
  theme: string;
  palette: string;
  approach: string;
  skill: string;
  language: string;
  duration: string;
  paper: PaperFormat;
  printing: string;
  /** intended format selected by the originating idea */
  printableFormat?: string;
};

export type WorksheetIntent = {
  objectiveId?: string;
  mechanicId?: string;
  objective?: string;
  skill: string;
  level: string;
  theme: string;
  difficulty: string;
  printableFormat?: string;
};

/**
 * IMMUTABLE PAGE PLAN CONTRACT.
 *
 * Frozen at plan time and carried on the project. Any page marked `explicit`
 * (the teacher named it: "Page 3: …") MUST render exactly `requestedMechanic`.
 * The renderer hard-blocks a page that breaks this contract.
 */
export type PagePlanContractEntry = {
  page: number;
  requestedSkill: string;
  requestedMechanic: WorksheetMechanicId;
  requiredContent: string;
  /** immutable semantic meaning of the explicit instruction */
  semanticRequirements: PageSemanticRequirements;
  prohibitedMechanics: WorksheetMechanicId[];
  /** entities that may appear on this page without being a substitution */
  allowedEntities: VisualAssetKey[];
  /** entities explicitly forbidden because they belong to a prior/other domain */
  prohibitedEntities: VisualAssetKey[];
  explicit: boolean;
};

/**
 * PAGE SPECIFICATION
 * ------------------
 * What the child DOES (studentAction), on WHAT KIND of content
 * (contentDomain), and HOW the answer is given (responseMode). These three
 * fields are the part of a page a generator may never trade away for the
 * nearest available template: a "draw the same number" page can not become a
 * "circle the number" page, and an object→shape match can not become an
 * identical-picture match.
 */
export type PageStudentAction =
  | "trace"
  | "match"
  | "sort"
  | "count"
  | "compare"
  | "continue-pattern"
  | "find"
  | "order"
  | "write";

export type PageResponseMode =
  "circle" | "draw-line" | "trace" | "draw" | "write" | "sort" | "number";

export type PageContentDomain = "shapes" | "numbers" | "letters" | "objects" | "mixed";

/** A named semantic group a sorting page must actually use. */
export type PageCategoryGroup = {
  /** teacher-facing label printed on the sorting box */
  label: string;
  /** pictures that belong in this box */
  members: VisualAssetKey[];
  /** how many pictures the teacher asked for in this box, when stated */
  count?: number;
};

export type PageSemanticRequirements = {
  pageIntent: string;
  activitySubtype?: string;
  /** the verb the child performs; immutable */
  studentAction?: PageStudentAction;
  /** the kind of content the action is performed on; immutable */
  contentDomain?: PageContentDomain;
  /** how the answer is recorded on paper; immutable */
  responseMode?: PageResponseMode;
  /** named semantic sorting groups the page must render */
  categoryGroups?: PageCategoryGroup[];
  /** exact number of source items the teacher asked the page to show */
  requiredItemCount?: number;
  /** exact number of question rows the teacher asked for */
  requiredRowCount?: number;
  /** exact number of choices printed in each row */
  requiredChoiceCount?: number;
  /** exact visual grid requested for picture activities, e.g. 5 × 3 */
  requiredGrid?: { columns: number; rows: number };
  /** exact target/non-target split requested for beginning-sound pictures */
  requiredTargetCount?: number;
  /** mechanics that would satisfy the words but not the request */
  forbiddenSubstitutions?: WorksheetMechanicId[];
  /**
   * IMMUTABLE content: only entities the teacher explicitly marked as mandatory
   * ("must include", "exactly", "required"). Validation fails when missing.
   */
  requiredEntities: VisualAssetKey[];
  /**
   * FLEXIBLE content: ordinary thematic nouns. Builders prefer them, but an
   * equivalent themed illustration is never a contract violation.
   */
  preferredEntities?: VisualAssetKey[];
  requiredCategories: string[];
  requiredRelationships: string[];
  patternRules: PatternRuleId[];
  sortAttribute?: { attribute: string; values: Array<string | number> };
};

/** The one request snapshot consumed by planning, building, validation and rendering. */
export type ImmutableGenerationSpecification = {
  rawPrompt: string;
  requestedPageCount: number;
  normalizedSpec: WorksheetSpecSnapshot;
  pages: readonly PagePlanContractEntry[];
};

export type WorksheetSpecSnapshot = Readonly<{
  prompt: string;
  level: string;
  duration: string;
  pages: string;
  approach: string;
  skill: string;
  activityType: string;
  difficulty: string;
  theme: string;
  palette: string;
  inspiration: string;
  language: string;
  paper: string;
  printing: string;
}>;

export type WorksheetProject = {
  id: string;
  source: "deterministic" | "ai";
  title: string;
  subtitle: string;
  meta: WorksheetMeta;
  /** structured educational intent preserved from Idea Lab through rendering */
  intent?: WorksheetIntent;
  /** art-direction layer: id of an Alfa visual direction preset */
  visualDirection: string;
  /** project-level default illustration rules (pages may narrow them) */
  illustrationStyle: IllustrationStyle;
  /** print mode the project was designed for; the studio can override live */
  printMode: PrintModeId;
  pages: WorksheetPageModel[];
  teacherNotes: string[];
  /**
   * Engine signature stamped by the single production pipeline
   * (`finalizeWorksheetProject`). Never printed — it exists so the running
   * preview can be proven to consume the current generator.
   */
  generation?: WorksheetGenerationSignature;
  /** frozen page-plan contract; explicit pages are hard-blocked on mismatch */
  pagePlanContract?: readonly PagePlanContractEntry[];
  /** frozen source request used for end-to-end fidelity validation */
  generationSpecification?: ImmutableGenerationSpecification;
  /**
   * Pages that could not be represented exactly and were rebuilt with the
   * closest educationally equivalent supported activity. Recorded so the pack
   * is never silently judged against an activity it deliberately replaced.
   */
  substitutions?: readonly {
    page: number;
    requestedMechanic: WorksheetMechanicId;
    substitutedMechanic: WorksheetMechanicId;
    reason: string;
  }[];
  /**
   * Pages whose requested interaction (circle / match / sort / draw / …) has
   * no supported equivalent. They are flagged rather than replaced with an
   * unrelated activity, so the rest of the pack still generates.
   */
  unsupportedPages?: readonly {
    page: number;
    requestedMechanic: WorksheetMechanicId;
    reason: string;
  }[];
};

export type WorksheetGenerationSignature = {
  generationEngineVersion: string;
  plannerVersion: string;
  generationId: string;
  mechanicsUsed: string[];
  requestedSkills: string[];
  coveredSkills: string[];
  trace?: {
    rawUserPrompt: string;
    normalizedRequest: string;
    requestedTopic: string;
    requestedSkills: string[];
    requestedPageCount: number;
    explicitPageInstructions: string[];
    generatedPagePlan: string[];
    pageMechanics: string[];
    renderedPageMechanics: string[];
  };
};

export const paperSizes: Record<PaperFormat, { w: number; h: number }> = {
  A4: { w: 210, h: 297 },
  Letter: { w: 215.9, h: 279.4 },
  A5: { w: 148, h: 210 },
};

export function toPaperFormat(value: string): PaperFormat {
  if (value === "Letter" || value === "US Letter") return "Letter";
  if (value === "A5") return "A5";
  return "A4";
}

/**
 * Alfa Ideas — the "practical teacher brief" layer.
 *
 * The Idea Engine (`engine.ts`) composes a structured Educational Activity
 * Specification. This module turns that specification into everything a
 * teacher actually needs on the classroom floor: materials, preparation,
 * teacher script, child-facing instruction, printable recommendation,
 * differentiation and genuinely different activity variations.
 *
 * Everything here is deterministic and derived from the specification, so the
 * same idea id always produces the same brief — with or without AI.
 */

import {
  composeIdea,
  makeEasier,
  makeHarder,
  mechanicMap,
  mechanics,
  objectiveMap,
  type IdeaSpec,
} from "./engine";

/* --------------------------------------------------------------- types */

export type PrintableRecommendation = {
  /** maps onto the existing Creator `activityType` option */
  activityType: string;
  label: string;
  why: string;
};

export type RichIdea = {
  spec: IdeaSpec;
  title: string;
  level: string;
  objective: string;
  skills: string[];
  duration: string;
  materials: string[];
  prep: string;
  teacherInstructions: string[];
  studentInstruction: string;
  printables: PrintableRecommendation[];
  difficulty: string;
  grouping: string;
  /** set when this idea came from a variation ("Movement activity", …) */
  variation?: string;
};

/* ---------------------------------------------------- materials & script */

const mechanicMaterials: Record<string, string[]> = {
  "count-circle": ["Printed worksheet", "Pencil or crayon"],
  match: ["Printed worksheet", "Pencil"],
  sort: ["Printed sorting mat", "Pencil or counters"],
  trace: ["Printed tracing page", "Pencil", "Optional: dry-erase sleeve"],
  find: ["Printed search page", "Crayon"],
  compare: ["Printed worksheet", "Pencil"],
  sequence: ["Printed strip", "Pencil", "Optional: scissors"],
  pattern: ["Printed pattern strips", "Crayons"],
  maze: ["Printed maze", "Pencil"],
  "spot-difference": ["Printed page", "Crayon"],
  classify: ["Printed sorting mat", "Pencil"],
  "cut-paste": ["Printed page", "Child-safe scissors", "Glue stick"],
  draw: ["Printed frame page", "Pencils and crayons"],
  "color-rule": ["Printed page", "Crayons in 3–4 colours"],
  "story-sequence": ["Printed picture cards", "Optional: scissors"],
  observe: ["Printed observation sheet", "Pencil", "Real objects to look at"],
  memory: ["Printed cards", "Scissors (adult prep)"],
  "logic-puzzle": ["Printed puzzle page", "Pencil"],
  "visual-discrimination": ["Printed page", "Crayon"],
  bingo: ["Printed bingo boards", "Counters or crayons"],
};

const prepSteps: Record<string, string> = {
  "No prep": "Print and hand out — no preparation needed.",
  "Low prep": "Print one page per child; nothing else to prepare.",
  "Some prep": "Print and cut the cards once, then reuse them all year.",
};

/** Child-facing instruction: one short sentence, one action, no jargon. */
function studentInstruction(idea: IdeaSpec): string {
  // `whatChildrenDo` is already composed with the theme's own noun
  const action = idea.whatChildrenDo.replace(/^Children\s+/i, "").replace(/\.$/, "");
  return `${action.charAt(0).toUpperCase()}${action.slice(1)}.`;
}

function teacherInstructions(idea: IdeaSpec): string[] {
  const grouping =
    idea.grouping === "Individual"
      ? "Give each child their own page."
      : idea.grouping === "Small group"
        ? "Sit with a group of 3–4 children and share the material."
        : "Work through the first example together with the whole class.";

  return [
    grouping,
    `Name the goal out loud: “${idea.objective}”`,
    `Model one example slowly, then let children work: ${idea.whatChildrenDo.replace(/^Children\s+/i, "")}`,
    "Stay quiet while they work — step in only if a child stops.",
    `Finish by asking one child to explain their thinking (about ${idea.duration.replace(" minutes", " min")} in total).`,
  ];
}

/* ------------------------------------------- printable recommendations */

const printableBySkill: Record<string, PrintableRecommendation[]> = {
  Counting: [
    {
      activityType: "Worksheet",
      label: "Count & circle",
      why: "Children count a group and choose the matching number.",
    },
    {
      activityType: "Matching",
      label: "Quantity → number matching",
      why: "Links how many with the written numeral.",
    },
    { activityType: "Cut & Paste", label: "Number cards", why: "A reusable card set for centers." },
  ],
  "Number Recognition": [
    {
      activityType: "Matching",
      label: "Number matching",
      why: "Pairs the numeral with a pictured quantity.",
    },
    {
      activityType: "Tracing",
      label: "Number tracing",
      why: "Adds the motor memory of forming each numeral.",
    },
  ],
  Phonics: [
    {
      activityType: "Matching",
      label: "Sound matching",
      why: "Pairs a picture with its beginning sound.",
    },
    {
      activityType: "Worksheet",
      label: "Letter identification",
      why: "Find and mark the target letter.",
    },
    {
      activityType: "Tracing",
      label: "Letter tracing",
      why: "Practises formation after recognition.",
    },
  ],
  Handwriting: [
    { activityType: "Tracing", label: "Tracing paths", why: "Guided strokes before free writing." },
  ],
  "Fine Motor": [
    { activityType: "Tracing", label: "Tracing paths", why: "Controlled pencil movement." },
    {
      activityType: "Cut & Paste",
      label: "Cutting practice",
      why: "Builds hand strength and control.",
    },
    {
      activityType: "Worksheet",
      label: "Pattern completion",
      why: "Small precise marks in a set space.",
    },
  ],
  Vocabulary: [
    {
      activityType: "Matching",
      label: "Picture–word matching",
      why: "Connects a spoken word to its image.",
    },
    {
      activityType: "Cut & Paste",
      label: "Flashcards",
      why: "Reusable words for repeated exposure.",
    },
  ],
  Logic: [
    { activityType: "Sorting", label: "Sorting mat", why: "Classification by one clear rule." },
    { activityType: "Worksheet", label: "Sequencing strip", why: "Ordering steps or sizes." },
    { activityType: "Worksheet", label: "Pattern completion", why: "Predicting what comes next." },
  ],
  Patterns: [
    {
      activityType: "Worksheet",
      label: "Pattern completion",
      why: "Continue an AB / ABC pattern.",
    },
  ],
  Shapes: [
    { activityType: "Matching", label: "Shape matching", why: "Pairs shapes with real objects." },
    { activityType: "Sorting", label: "Shape sorting", why: "Groups shapes by attribute." },
  ],
  "SEL/Emotions": [
    {
      activityType: "Matching",
      label: "Feeling-face matching",
      why: "Names emotions with pictures.",
    },
    {
      activityType: "Drawing",
      label: "Draw & tell",
      why: "Lets a child express a situation safely.",
    },
  ],
  Science: [
    {
      activityType: "Sorting",
      label: "Sorting mat",
      why: "Classify living / non-living or by habitat.",
    },
    { activityType: "Worksheet", label: "Sequencing strip", why: "Order a life cycle." },
  ],
  Reading: [
    { activityType: "Worksheet", label: "Sequencing strip", why: "Retell a story in order." },
  ],
  "Visual Discrimination": [
    { activityType: "Worksheet", label: "Find & mark", why: "Trains careful looking." },
  ],
  Creativity: [
    {
      activityType: "Drawing",
      label: "Open drawing frame",
      why: "No single right answer — pure expression.",
    },
  ],
  "Problem Solving": [
    { activityType: "Worksheet", label: "Logic grid", why: "Applies clues step by step." },
  ],
};

export function recommendPrintables(idea: IdeaSpec): PrintableRecommendation[] {
  const list = printableBySkill[idea.skill] ?? [
    {
      activityType: idea.activityType,
      label: idea.mechanic,
      why: "Matches the activity as written.",
    },
  ];
  // the mechanic's own printable always comes first
  const own = list.find((p) => p.activityType === idea.activityType);
  return own ? [own, ...list.filter((p) => p !== own)] : list;
}

/* ------------------------------------------------------------- enrich */

export function enrichIdea(idea: IdeaSpec, variation?: string): RichIdea {
  const objective = objectiveMap[idea.objectiveId];
  const extraSkills = mechanicMap[idea.mechanicId]?.skills ?? [];
  const skills = Array.from(new Set([idea.skill, ...extraSkills.slice(0, 2)]));

  return {
    spec: idea,
    title: idea.title,
    level: idea.level,
    objective: objective?.statement ?? idea.objective,
    skills,
    duration: idea.duration,
    materials: mechanicMaterials[idea.mechanicId] ?? ["Printed worksheet", "Pencil"],
    prep: `${idea.prep} — ${prepSteps[idea.prep] ?? ""}`.trim(),
    teacherInstructions: teacherInstructions(idea),
    studentInstruction: studentInstruction(idea),
    printables: recommendPrintables(idea),
    difficulty: idea.difficulty,
    grouping: idea.grouping,
    ...(variation ? { variation } : {}),
  };
}

/* ---------------------------------------------------- differentiation */

export type DifferentiationPlan = {
  support: { idea: IdeaSpec; changes: string[] };
  standard: { idea: IdeaSpec; changes: string[] };
  challenge: { idea: IdeaSpec; changes: string[] };
};

export function differentiate(idea: IdeaSpec): DifferentiationPlan {
  return {
    support: {
      idea: makeEasier(idea),
      changes: [
        "Fewer questions on the page",
        "One-step instruction, spoken and shown",
        "Larger pictures for visual support",
        "Smaller number / item range",
        "Tracing or dotted guides where possible",
      ],
    },
    standard: {
      idea,
      changes: [
        "The activity exactly as designed",
        `${idea.pages} page${idea.pages === "1" ? "" : "s"} at ${idea.difficulty.toLowerCase()} level`,
      ],
    },
    challenge: {
      idea: makeHarder(idea),
      changes: [
        "Wider number / item range",
        "An extra reasoning step",
        "Independent recording or writing",
        "One challenge question at the end",
        "A multi-step task instead of a single action",
      ],
    },
  };
}

/* -------------------------------------------------------- variations */

export type VariationStyle = {
  id: string;
  label: string;
  /** how the activity itself changes — not just the visuals */
  change: string;
  /** mechanics that genuinely express this style */
  mechanics: string[];
  approach?: string;
};

export const variationStyles: VariationStyle[] = [
  {
    id: "montessori",
    label: "Montessori-inspired",
    change: "Isolate one difficulty and use a control of error the child can check alone.",
    mechanics: ["sort", "classify", "match", "sequence"],
    approach: "Montessori",
  },
  {
    id: "reggio",
    label: "Reggio Emilia-inspired",
    change: "Start from the children's own observations and let them document what they notice.",
    mechanics: ["observe", "draw", "story-sequence"],
    approach: "Reggio Emilia",
  },
  {
    id: "play",
    label: "Play-based",
    change: "Turn the task into a game with a goal, a turn and a small surprise.",
    mechanics: ["bingo", "memory", "find"],
    approach: "Play-Based Learning",
  },
  {
    id: "worksheet",
    label: "Worksheet-based",
    change: "A quiet independent printable the child completes with a pencil.",
    mechanics: ["count-circle", "match", "trace", "pattern"],
  },
  {
    id: "movement",
    label: "Movement activity",
    change: "Children move around the room to collect or place answers instead of sitting.",
    mechanics: ["find", "sort", "bingo"],
  },
  {
    id: "center",
    label: "Classroom center",
    change: "Set up as a reusable station two to four children rotate through.",
    mechanics: ["memory", "classify", "sort", "pattern"],
  },
  {
    id: "outdoor",
    label: "Outdoor learning",
    change: "Take the task outside and use real found objects as the material.",
    mechanics: ["observe", "sort", "find"],
  },
  {
    id: "quiet",
    label: "Quiet activity",
    change: "Slow, calm and solitary — no talking required, ideal after lunch.",
    mechanics: ["trace", "color-rule", "maze", "draw"],
  },
  {
    id: "partner",
    label: "Partner activity",
    change: "Two children take turns and check each other's thinking out loud.",
    mechanics: ["memory", "compare", "bingo"],
  },
  {
    id: "screen-free",
    label: "Screen-free hands-on",
    change: "Uses only printed and physical materials, cut once and reused.",
    mechanics: ["cut-paste", "sequence", "classify"],
  },
];

/**
 * Returns a genuinely different activity for the same learning objective:
 * the mechanic (what children physically do) changes, not the theme.
 */
export function variationOf(idea: IdeaSpec, style: VariationStyle): IdeaSpec | null {
  const objective = objectiveMap[idea.objectiveId];
  if (!objective) return null;

  const candidate =
    style.mechanics.find((m) => objective.mechanics.includes(m) && m !== idea.mechanicId) ??
    objective.mechanics.find((m) => m !== idea.mechanicId);

  const mechanic = mechanicMap[candidate ?? ""] ?? mechanics.find((m) => m.id === idea.mechanicId);
  if (!mechanic) return null;

  return composeIdea({
    objective,
    mechanic,
    theme: idea.theme,
    season: idea.season,
    level: idea.level,
    difficulty: idea.difficulty,
    duration: idea.duration,
    ...(style.approach ? { approach: style.approach } : {}),
  });
}

/* ------------------------------------------------------ quality rules */

export type QualityIssue = { severity: "error" | "warning"; message: string };

const bannedWords = ["stupid", "dumb", "lazy", "naughty", "punish", "disorder", "diagnos"];

/**
 * Educational quality gate for an *idea* (the worksheet itself is validated
 * separately by the Alfa worksheet validator before it can be exported).
 */
export function checkIdeaQuality(rich: RichIdea): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const idea = rich.spec;

  if (!rich.objective || rich.objective.length < 12) {
    issues.push({ severity: "error", message: "The learning objective is missing or too vague." });
  }
  if (!rich.studentInstruction.trim().endsWith(".") || rich.studentInstruction.length > 140) {
    issues.push({
      severity: "warning",
      message: "The child instruction should be one short sentence.",
    });
  }
  if (rich.teacherInstructions.length < 3) {
    issues.push({ severity: "warning", message: "Teacher instructions are too thin to follow." });
  }

  const objective = objectiveMap[idea.objectiveId];
  const mechanic = mechanicMap[idea.mechanicId];
  if (objective && mechanic && !objective.mechanics.includes(mechanic.id)) {
    issues.push({
      severity: "error",
      message: "This printable does not serve the stated objective.",
    });
  }

  const youngest = ["Ages 2–3", "Ages 3–4"].includes(idea.level);
  if (youngest && mechanic?.load === 3) {
    issues.push({ severity: "error", message: "This task is too demanding for this age group." });
  }
  if (youngest && idea.duration === "20 minutes") {
    issues.push({ severity: "warning", message: "20 minutes is long for children under four." });
  }

  const text =
    `${rich.title} ${rich.objective} ${rich.studentInstruction} ${rich.teacherInstructions.join(" ")}`.toLowerCase();
  if (bannedWords.some((w) => text.includes(w))) {
    issues.push({
      severity: "error",
      message: "Wording must stay supportive and never label a child.",
    });
  }

  if (!rich.printables.length) {
    issues.push({ severity: "error", message: "No printable format matches this activity." });
  }

  return issues;
}

export function ideaPasses(rich: RichIdea): boolean {
  return checkIdeaQuality(rich).every((i) => i.severity !== "error");
}

/* ------------------------------------------- printable format selection */

/**
 * Re-composes the idea around a different recommended printable format while
 * keeping the same learning objective — that is how "choose this printable"
 * stays one structured specification instead of a loose override.
 */
export function withPrintable(idea: IdeaSpec, activityType: string): IdeaSpec {
  const objective = objectiveMap[idea.objectiveId];
  if (!objective) return idea;
  const mechanic =
    objective.mechanics
      .map((id) => mechanicMap[id])
      .find((m) => m && m.activityType === activityType) ??
    mechanics.find((m) => m.activityType === activityType && objective.mechanics.includes(m.id));
  if (!mechanic) return idea;
  return composeIdea({
    objective,
    mechanic,
    theme: idea.theme,
    season: idea.season,
    level: idea.level,
    difficulty: idea.difficulty,
    duration: idea.duration,
    approach: idea.approach,
    pages: idea.pages,
  });
}

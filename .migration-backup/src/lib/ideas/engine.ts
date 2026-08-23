/**
 * Alfa Idea Engine — a composable activity-idea architecture.
 *
 * Ideas are NEVER hard-coded as finished cards. Every idea is *composed* from:
 *
 *   learning objective + activity mechanic + age adaptation + difficulty
 *   + theme + visual direction + printable format + duration
 *
 * This is the "Educational Activity Specification" layer of the Alfa pipeline:
 *
 *   Teacher Intent → Activity Specification → Worksheet Content →
 *   Illustration / Visual Direction → Page Layout → Alfa Renderer → PDF
 *
 * No AI is connected. Composition is deterministic (seeded), so an idea id can
 * be encoded into a URL and decoded again later — that is how "Create this
 * activity" hands a full specification to the existing Worksheet Creator
 * without storing anything server-side.
 */

import type { WorksheetSpec } from "@/lib/creator-options";
import { directionForTheme } from "@/lib/visual-directions";
import { resolveObjectiveProfile } from "@/lib/worksheet-objectives";

/* ------------------------------------------------------------ primitives */

export type Grouping = "Individual" | "Small group" | "Whole class";

export type PrintableFormat =
  "Single worksheet" | "2-page set" | "Activity cards" | "Mini booklet" | "Center mat";

export type ActivityMechanic = {
  id: string;
  /** short human title used in idea headings */
  title: string;
  /** maps onto the existing Creator "activityType" option */
  activityType: string;
  /** what children physically do; {objects} is replaced by the theme noun */
  childAction: string;
  /** skills this mechanic can carry */
  skills: string[];
  /** 1 = very simple, 3 = demanding */
  load: 1 | 2 | 3;
  prep: "No prep" | "Low prep" | "Some prep";
  grouping: Grouping;
  format: PrintableFormat;
};

export type LearningObjective = {
  id: string;
  /** short label used in idea headings */
  short: string;
  /** full pedagogical statement */
  statement: string;
  subject: string;
  skill: string;
  /** youngest suitable level index (see `levels`) */
  minLevel: number;
  /** mechanics that genuinely serve this objective */
  mechanics: string[];
  /** objectives that complement (not duplicate) this one */
  related?: string[];
};

export const levels = [
  "Ages 2–3",
  "Ages 3–4",
  "Ages 4–5",
  "Preschool",
  "Pre-K",
  "Kindergarten",
  "Grade 1",
  "Grade 2",
  "Grade 3",
  "Grade 4",
  "Grade 5",
  "Grade 6",
] as const;

export const seasons = [
  "Any season",
  "Autumn",
  "Winter",
  "Spring",
  "Summer",
  "Back to school",
  "Christmas",
  "Easter",
] as const;

export const difficulties = ["Very Easy", "Easy", "Standard", "Challenge"] as const;

export const durations = ["5 minutes", "10 minutes", "15 minutes", "20 minutes"] as const;

export const groupings: Grouping[] = ["Individual", "Small group", "Whole class"];

/* ------------------------------------------------------------- mechanics */

export const mechanics: ActivityMechanic[] = [
  {
    id: "count-circle",
    title: "Count & Circle",
    activityType: "Worksheet",
    childAction: "count each group of {objects} and circle the number that matches",
    skills: ["Counting", "Number Recognition"],
    load: 1,
    prep: "No prep",
    grouping: "Individual",
    format: "Single worksheet",
  },
  {
    id: "match",
    title: "Match",
    activityType: "Matching",
    childAction: "draw a line from each {objects} group to the card that belongs with it",
    skills: ["Counting", "Phonics", "Vocabulary", "Shapes", "SEL/Emotions", "Number Recognition"],
    load: 1,
    prep: "No prep",
    grouping: "Individual",
    format: "Single worksheet",
  },
  {
    id: "sort",
    title: "Sort",
    activityType: "Sorting",
    childAction: "sort the {objects} into two clear groups",
    skills: ["Logic", "Shapes", "Vocabulary", "Science", "Visual Discrimination"],
    load: 2,
    prep: "Low prep",
    grouping: "Small group",
    format: "Center mat",
  },
  {
    id: "trace",
    title: "Trace",
    activityType: "Tracing",
    childAction: "trace the shapes and lines around the {objects}",
    skills: ["Pre-Writing", "Handwriting", "Fine Motor", "Alphabet"],
    load: 1,
    prep: "No prep",
    grouping: "Individual",
    format: "Single worksheet",
  },
  {
    id: "find",
    title: "Find & Count",
    activityType: "I Spy",
    childAction: "search the scene, find every hidden {objects} and record how many",
    skills: ["Counting", "Visual Discrimination", "Science"],
    load: 2,
    prep: "No prep",
    grouping: "Individual",
    format: "Single worksheet",
  },
  {
    id: "compare",
    title: "Compare",
    activityType: "Worksheet",
    childAction: "compare two sets of {objects} and mark which has more",
    skills: ["Counting", "Logic", "Problem Solving"],
    load: 2,
    prep: "No prep",
    grouping: "Individual",
    format: "Single worksheet",
  },
  {
    id: "sequence",
    title: "Sequence",
    activityType: "Sequencing",
    childAction: "put the {objects} pictures in the right order and tell the story",
    skills: ["Logic", "Vocabulary", "Science", "Reading"],
    load: 3,
    prep: "Low prep",
    grouping: "Small group",
    format: "Activity cards",
  },
  {
    id: "pattern",
    title: "Complete the Pattern",
    activityType: "Worksheet",
    childAction: "read the {objects} pattern and draw what comes next",
    skills: ["Patterns", "Logic", "Shapes"],
    load: 2,
    prep: "No prep",
    grouping: "Individual",
    format: "Single worksheet",
  },
  {
    id: "maze",
    title: "Maze",
    activityType: "Maze",
    childAction: "guide the {objects} through the path without lifting the pencil",
    skills: ["Fine Motor", "Problem Solving", "Pre-Writing"],
    load: 2,
    prep: "No prep",
    grouping: "Individual",
    format: "Single worksheet",
  },
  {
    id: "spot-difference",
    title: "Spot the Difference",
    activityType: "Find the Difference",
    childAction: "compare two {objects} scenes and mark everything that changed",
    skills: ["Visual Discrimination", "Logic"],
    load: 2,
    prep: "No prep",
    grouping: "Individual",
    format: "Single worksheet",
  },
  {
    id: "classify",
    title: "Classify",
    activityType: "Sorting",
    childAction: "decide which family each {objects} belongs to and explain why",
    skills: ["Science", "Logic", "Vocabulary", "Geography"],
    load: 3,
    prep: "Low prep",
    grouping: "Small group",
    format: "Center mat",
  },
  {
    id: "cut-paste",
    title: "Cut & Paste",
    activityType: "Cut & Paste",
    childAction: "cut out the {objects} and paste each one in the right place",
    skills: ["Fine Motor", "Counting", "Phonics", "Shapes"],
    load: 2,
    prep: "Some prep",
    grouping: "Individual",
    format: "2-page set",
  },
  {
    id: "draw",
    title: "Draw",
    activityType: "Worksheet",
    childAction: "draw the missing {objects} to finish the picture",
    skills: ["Creativity", "Counting", "Fine Motor", "Science"],
    load: 1,
    prep: "No prep",
    grouping: "Individual",
    format: "Single worksheet",
  },
  {
    id: "color-rule",
    title: "Color by Rule",
    activityType: "Coloring",
    childAction: "colour each {objects} following the key at the top of the page",
    skills: ["Shapes", "Number Recognition", "Visual Discrimination", "Fine Motor"],
    load: 2,
    prep: "No prep",
    grouping: "Individual",
    format: "Single worksheet",
  },
  {
    id: "story-sequence",
    title: "Story Steps",
    activityType: "Mini Book",
    childAction: "retell the {objects} story in three steps and draw each one",
    skills: ["Reading", "Vocabulary", "SEL/Emotions", "Creativity"],
    load: 3,
    prep: "Low prep",
    grouping: "Small group",
    format: "Mini booklet",
  },
  {
    id: "observe",
    title: "Observation Journal",
    activityType: "Worksheet",
    childAction: "look closely at real {objects} and record what they notice",
    skills: ["Science", "Creativity", "Writing", "Geography"],
    load: 3,
    prep: "Some prep",
    grouping: "Small group",
    format: "Single worksheet",
  },
  {
    id: "memory",
    title: "Memory Pairs",
    activityType: "Flashcards",
    childAction: "turn over the {objects} cards and remember where each pair hides",
    skills: ["Visual Discrimination", "Vocabulary", "Number Recognition"],
    load: 2,
    prep: "Some prep",
    grouping: "Small group",
    format: "Activity cards",
  },
  {
    id: "logic-puzzle",
    title: "Logic Puzzle",
    activityType: "Puzzle",
    childAction: "use the clues to work out where every {objects} belongs",
    skills: ["Logic", "Problem Solving", "Counting"],
    load: 3,
    prep: "No prep",
    grouping: "Individual",
    format: "Single worksheet",
  },
  {
    id: "visual-discrimination",
    title: "Same or Different",
    activityType: "Worksheet",
    childAction: "look at each row of {objects} and mark the one that does not belong",
    skills: ["Visual Discrimination", "Logic", "Shapes"],
    load: 1,
    prep: "No prep",
    grouping: "Individual",
    format: "Single worksheet",
  },
  {
    id: "bingo",
    title: "Classroom Bingo",
    activityType: "Bingo",
    childAction: "listen, search their {objects} board and cover each square they hear",
    skills: ["Vocabulary", "Phonics", "Number Recognition", "Counting"],
    load: 2,
    prep: "Some prep",
    grouping: "Whole class",
    format: "Activity cards",
  },
];

export const mechanicMap: Record<string, ActivityMechanic> = Object.fromEntries(
  mechanics.map((m) => [m.id, m]),
);

/* ----------------------------------------------------------- objectives */

export const objectives: LearningObjective[] = [
  {
    id: "count-10",
    short: "Counting to 10",
    statement: "Count quantities up to 10 and connect them to written numerals.",
    subject: "Early Math",
    skill: "Counting",
    minLevel: 1,
    mechanics: ["count-circle", "match", "find", "compare", "cut-paste", "draw", "bingo"],
    related: ["number-recognition", "compare-quantity", "patterns-ab", "sorting-size"],
  },
  {
    id: "number-recognition",
    short: "Numerals 1–10",
    statement: "Recognise written numerals and link them to concrete quantities.",
    subject: "Early Math",
    skill: "Number Recognition",
    minLevel: 1,
    mechanics: ["match", "color-rule", "memory", "trace", "bingo"],
    related: ["count-10", "compare-quantity"],
  },
  {
    id: "compare-quantity",
    short: "More & Fewer",
    statement: "Compare two quantities and describe which has more or fewer.",
    subject: "Early Math",
    skill: "Logic",
    minLevel: 2,
    mechanics: ["compare", "sort", "logic-puzzle", "count-circle"],
    related: ["count-10", "sorting-size"],
  },
  {
    id: "patterns-ab",
    short: "AB & ABC Patterns",
    statement: "Read, continue and create simple repeating patterns.",
    subject: "Early Math",
    skill: "Patterns",
    minLevel: 1,
    mechanics: ["pattern", "cut-paste", "color-rule", "draw"],
    related: ["shapes-basic", "count-10", "logic-clues"],
  },
  {
    id: "shapes-basic",
    short: "Basic Shapes",
    statement: "Identify and name circle, square, triangle and rectangle in the environment.",
    subject: "Early Math",
    skill: "Shapes",
    minLevel: 1,
    mechanics: ["match", "sort", "color-rule", "trace", "visual-discrimination"],
    related: ["patterns-ab", "symmetry", "fine-motor-lines"],
  },
  {
    id: "symmetry",
    short: "Symmetry",
    statement: "Notice symmetry and complete the missing half of a picture.",
    subject: "Early Math",
    skill: "Visual Discrimination",
    minLevel: 3,
    mechanics: ["draw", "color-rule", "spot-difference"],
    related: ["shapes-basic", "observation-nature"],
  },
  {
    id: "sorting-size",
    short: "Big & Small Sorting",
    statement: "Sort objects by one clear attribute such as size or colour.",
    subject: "Early Math",
    skill: "Logic",
    minLevel: 0,
    mechanics: ["sort", "classify", "cut-paste", "match"],
    related: ["compare-quantity", "classify-living"],
  },
  {
    id: "logic-clues",
    short: "Thinking with Clues",
    statement: "Use one or two clues to reach a correct conclusion.",
    subject: "Problem Solving",
    skill: "Problem Solving",
    minLevel: 4,
    mechanics: ["logic-puzzle", "sequence", "compare"],
    related: ["patterns-ab", "compare-quantity"],
  },
  {
    id: "beginning-sounds",
    short: "Beginning Sounds",
    statement: "Hear and identify the first sound of familiar words.",
    subject: "Early Literacy",
    skill: "Phonics",
    minLevel: 2,
    mechanics: ["match", "cut-paste", "bingo", "color-rule", "find"],
    related: ["letter-formation", "vocabulary-theme", "rhyming"],
  },
  {
    id: "rhyming",
    short: "Rhyming Pairs",
    statement: "Hear rhyme and pair words that end with the same sound.",
    subject: "Early Literacy",
    skill: "Phonics",
    minLevel: 3,
    mechanics: ["match", "memory", "bingo"],
    related: ["beginning-sounds", "vocabulary-theme"],
  },
  {
    id: "letter-formation",
    short: "Letter Formation",
    statement: "Form letters with correct direction and comfortable control.",
    subject: "Early Literacy",
    skill: "Handwriting",
    minLevel: 3,
    mechanics: ["trace", "maze", "draw"],
    related: ["fine-motor-lines", "beginning-sounds"],
  },
  {
    id: "vocabulary-theme",
    short: "Theme Vocabulary",
    statement: "Learn and use new words connected to a shared theme.",
    subject: "Early Literacy",
    skill: "Vocabulary",
    minLevel: 1,
    mechanics: ["match", "memory", "bingo", "classify", "story-sequence"],
    related: ["beginning-sounds", "story-retell", "classify-living"],
  },
  {
    id: "story-retell",
    short: "Story Retelling",
    statement: "Retell a short story in the correct order using pictures.",
    subject: "Early Literacy",
    skill: "Reading",
    minLevel: 3,
    mechanics: ["story-sequence", "sequence", "draw"],
    related: ["vocabulary-theme", "emotions-name"],
  },
  {
    id: "fine-motor-lines",
    short: "Pencil Control",
    statement: "Build hand strength and control through lines, curves and cutting.",
    subject: "Fine Motor",
    skill: "Fine Motor",
    minLevel: 0,
    mechanics: ["trace", "maze", "cut-paste", "color-rule"],
    related: ["letter-formation", "shapes-basic"],
  },
  {
    id: "emotions-name",
    short: "Naming Feelings",
    statement: "Recognise and name everyday feelings in faces and situations.",
    subject: "SEL",
    skill: "SEL/Emotions",
    minLevel: 2,
    mechanics: ["match", "sort", "story-sequence", "draw"],
    related: ["story-retell", "kindness-choices"],
  },
  {
    id: "kindness-choices",
    short: "Kind Choices",
    statement: "Discuss helpful choices and what to do when something feels hard.",
    subject: "SEL",
    skill: "SEL/Emotions",
    minLevel: 4,
    mechanics: ["sort", "story-sequence", "sequence"],
    related: ["emotions-name", "story-retell"],
  },
  {
    id: "classify-living",
    short: "Living Things",
    statement: "Classify living things by simple observable features.",
    subject: "Science",
    skill: "Science",
    minLevel: 3,
    mechanics: ["classify", "sort", "observe", "match"],
    related: ["life-cycle", "observation-nature", "vocabulary-theme"],
  },
  {
    id: "life-cycle",
    short: "Life Cycles",
    statement: "Order the stages of a simple life cycle and describe each step.",
    subject: "Science",
    skill: "Science",
    minLevel: 4,
    mechanics: ["sequence", "story-sequence", "draw"],
    related: ["classify-living", "observation-nature"],
  },
  {
    id: "observation-nature",
    short: "Nature Observation",
    statement: "Observe carefully outdoors and record findings with drawings or tallies.",
    subject: "Nature",
    skill: "Science",
    minLevel: 3,
    mechanics: ["observe", "find", "draw", "classify"],
    related: ["classify-living", "seasonal-change", "count-10"],
  },
  {
    id: "seasonal-change",
    short: "Seasonal Change",
    statement: "Notice what changes outdoors as the season turns.",
    subject: "Seasonal Learning",
    skill: "Science",
    minLevel: 3,
    mechanics: ["sort", "observe", "sequence", "draw"],
    related: ["observation-nature", "vocabulary-theme"],
  },
  {
    id: "visual-attention",
    short: "Looking Closely",
    statement: "Sharpen visual attention by finding small differences and details.",
    subject: "Creative Thinking",
    skill: "Visual Discrimination",
    minLevel: 2,
    mechanics: ["spot-difference", "visual-discrimination", "find", "memory"],
    related: ["symmetry", "shapes-basic"],
  },
  {
    id: "imagination",
    short: "Imaginative Thinking",
    statement: "Invent, extend and explain an original idea in pictures.",
    subject: "Creative Thinking",
    skill: "Creativity",
    minLevel: 3,
    mechanics: ["draw", "story-sequence", "observe"],
    related: ["story-retell", "observation-nature"],
  },
];

export const objectiveMap: Record<string, LearningObjective> = Object.fromEntries(
  objectives.map((o) => [o.id, o]),
);

export const subjects = Array.from(new Set(objectives.map((o) => o.subject))).sort();
export const skills = Array.from(new Set(objectives.map((o) => o.skill))).sort();

export const themes = [
  "Insects",
  "Nature",
  "Woodland",
  "Farm",
  "Ocean",
  "Space",
  "Dinosaurs",
  "Flowers",
  "Seasons",
  "Animals",
  "Transportation",
  "Fairy-tale Garden",
  "Emotions",
  "School",
];

const themeNouns: Record<string, string> = {
  Insects: "little insects",
  Nature: "nature treasures",
  Woodland: "woodland friends",
  Farm: "farm animals",
  Ocean: "sea creatures",
  Space: "planets and stars",
  Dinosaurs: "dinosaurs",
  Flowers: "flowers",
  Seasons: "season pictures",
  Animals: "animals",
  Transportation: "vehicles",
  "Fairy-tale Garden": "garden friends",
  Emotions: "feeling faces",
  School: "classroom objects",
};

const seasonThemes: Record<string, string[]> = {
  Autumn: ["Nature", "Woodland", "Seasons"],
  Winter: ["Seasons", "Animals", "Woodland"],
  Spring: ["Insects", "Flowers", "Nature", "Fairy-tale Garden"],
  Summer: ["Ocean", "Insects", "Nature"],
  "Back to school": ["School", "Emotions", "Transportation"],
  Christmas: ["Seasons", "Woodland", "Animals"],
  Easter: ["Flowers", "Farm", "Spring" as string],
};

/* --------------------------------------------------------------- idea spec */

/** The structured Educational Activity Specification handed to the Creator. */
export type IdeaSpec = {
  id: string;
  title: string;
  objectiveId: string;
  objective: string;
  whatChildrenDo: string;
  subject: string;
  skill: string;
  mechanicId: string;
  mechanic: string;
  activityType: string;
  theme: string;
  season: string;
  level: string;
  difficulty: string;
  duration: string;
  approach: string;
  pages: string;
  visualDirection: string;
  format: PrintableFormat;
  grouping: Grouping;
  prep: "No prep" | "Low prep" | "Some prep";
};

const FIELD_SEP = "~";

/**
 * An idea id fully encodes its specification, so a composed idea survives a
 * page navigation (or a saved link) without any server storage.
 */
export function encodeIdeaId(parts: {
  objectiveId: string;
  mechanicId: string;
  theme: string;
  season: string;
  level: string;
  difficulty: string;
  duration: string;
  approach: string;
  pages: string;
}): string {
  return [
    "idea",
    parts.objectiveId,
    parts.mechanicId,
    parts.theme,
    parts.season,
    parts.level,
    parts.difficulty,
    parts.duration,
    parts.approach,
    parts.pages,
  ].join(FIELD_SEP);
}

export function decodeIdeaId(id: string): IdeaSpec | null {
  const parts = id.split(FIELD_SEP);
  if (parts[0] !== "idea" || parts.length < 10) return null;
  const objective = objectiveMap[parts[1] ?? ""];
  const mechanic = mechanicMap[parts[2] ?? ""];
  if (!objective || !mechanic) return null;
  return composeIdea({
    objective,
    mechanic,
    theme: parts[3] ?? "Nature",
    season: parts[4] ?? "Any season",
    level: parts[5] ?? "Ages 4–5",
    difficulty: parts[6] ?? "Easy",
    duration: parts[7] ?? "10 minutes",
    approach: parts[8] ?? "Montessori",
    pages: parts[9] ?? "1",
  });
}

const approachBySubject: Record<string, string> = {
  "Early Math": "Montessori",
  "Early Literacy": "Play-Based Learning",
  "Fine Motor": "Montessori",
  SEL: "Reggio Emilia",
  Science: "Inquiry-Based Learning",
  Nature: "Inquiry-Based Learning",
  "Seasonal Learning": "Play-Based Learning",
  "Problem Solving": "Project-Based Learning",
  "Creative Thinking": "Reggio Emilia",
};

export function composeIdea(input: {
  objective: LearningObjective;
  mechanic: ActivityMechanic;
  theme: string;
  season?: string;
  level: string;
  difficulty: string;
  duration: string;
  approach?: string;
  pages?: string;
}): IdeaSpec {
  const { objective, mechanic, theme, season = "Any season", level, difficulty, duration } = input;
  const approach = input.approach ?? approachBySubject[objective.subject] ?? "Montessori";
  const pages = input.pages ?? (mechanic.format === "2-page set" ? "2" : "1");
  const objects = themeNouns[theme] ?? theme.toLowerCase();

  return {
    id: encodeIdeaId({
      objectiveId: objective.id,
      mechanicId: mechanic.id,
      theme,
      season,
      level,
      difficulty,
      duration,
      approach,
      pages,
    }),
    title: `${mechanic.title} — ${objective.short}`,
    objectiveId: objective.id,
    objective: objective.statement,
    whatChildrenDo: `Children ${mechanic.childAction.replace("{objects}", objects)}.`,
    subject: objective.subject,
    skill: objective.skill,
    mechanicId: mechanic.id,
    mechanic: mechanic.title,
    activityType: mechanic.activityType,
    theme,
    season,
    level,
    difficulty,
    duration,
    approach,
    pages,
    visualDirection: directionForTheme(theme),
    format: mechanic.format,
    grouping: mechanic.grouping,
    prep: mechanic.prep,
  };
}

/* ---------------------------------------------------------- composition */

export type IdeaConstraints = {
  level?: string;
  subject?: string;
  skill?: string;
  theme?: string;
  season?: string;
  duration?: string;
  difficulty?: string;
  approach?: string;
  grouping?: string;
  format?: string;
  mechanicId?: string;
  /** free text from a "creative starting point" */
  intent?: string;
};

function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function levelIndex(level: string) {
  const i = (levels as readonly string[]).indexOf(level);
  return i === -1 ? 2 : i;
}

/** Age adaptation: younger children get fewer, simpler, shorter activities. */
function difficultyForLevel(level: string, base?: string) {
  if (base) return base;
  const i = levelIndex(level);
  if (i <= 1) return "Very Easy";
  if (i <= 4) return "Easy";
  return "Standard";
}

function durationForMechanic(m: ActivityMechanic, requested?: string) {
  if (requested) return requested;
  return m.load === 1 ? "10 minutes" : m.load === 2 ? "15 minutes" : "20 minutes";
}

function themeFor(c: IdeaConstraints, objective: LearningObjective, salt: number) {
  if (c.theme) return c.theme;
  const pool =
    (c.season && c.season !== "Any season" ? seasonThemes[c.season] : undefined) ??
    (objective.subject === "Early Math"
      ? ["Insects", "Nature", "Farm", "Ocean", "Space"]
      : objective.subject === "Science" || objective.subject === "Nature"
        ? ["Nature", "Woodland", "Insects", "Ocean", "Animals"]
        : themes);
  return pool[salt % pool.length] ?? "Nature";
}

/**
 * Composes genuinely different activity concepts for the given constraints.
 * Variety is enforced: no two returned ideas share both objective and mechanic,
 * and at most two ideas share the same mechanic.
 */
export function generateIdeas(c: IdeaConstraints = {}, count = 6, seed = 0): IdeaSpec[] {
  const level = c.level ?? "Ages 4–5";
  const lvl = levelIndex(level);
  const intent = (c.intent ?? "").toLowerCase();

  const candidates: Array<{
    objective: LearningObjective;
    mechanic: ActivityMechanic;
    score: number;
  }> = [];

  for (const objective of objectives) {
    if (objective.minLevel > lvl + 1) continue;
    if (c.subject && objective.subject !== c.subject) continue;
    if (c.skill && objective.skill !== c.skill) continue;

    for (const mid of objective.mechanics) {
      const mechanic = mechanicMap[mid];
      if (!mechanic) continue;
      if (c.mechanicId && mechanic.id !== c.mechanicId) continue;
      if (c.grouping && mechanic.grouping !== c.grouping) continue;
      if (c.format && mechanic.format !== c.format) continue;
      if (lvl <= 1 && mechanic.load === 3) continue;

      let score = hash(`${objective.id}:${mechanic.id}:${seed}`) % 1000;
      // constraint affinity
      if (c.duration === "5 minutes" && mechanic.load === 1) score += 900;
      if (c.duration === "20 minutes" && mechanic.load === 3) score += 700;
      if (intent) {
        const hay =
          `${objective.short} ${objective.statement} ${objective.subject} ${mechanic.title} ${mechanic.prep} ${mechanic.grouping}`.toLowerCase();
        for (const word of intent.split(/[^a-z]+/).filter((w) => w.length > 3)) {
          if (hay.includes(word)) score += 600;
        }
      }
      candidates.push({ objective, mechanic, score });
    }
  }

  candidates.sort((a, b) => b.score - a.score);

  const out: IdeaSpec[] = [];
  const mechanicUse = new Map<string, number>();
  const objectiveUse = new Set<string>();

  for (const pass of [0, 1]) {
    for (const cand of candidates) {
      if (out.length >= count) break;
      const used = mechanicUse.get(cand.mechanic.id) ?? 0;
      if (pass === 0 && (used >= 1 || objectiveUse.has(cand.objective.id))) continue;
      if (pass === 1 && used >= 2) continue;

      const salt = hash(`${cand.objective.id}${cand.mechanic.id}${seed}`);
      const theme = themeFor(c, cand.objective, salt);
      out.push(
        composeIdea({
          objective: cand.objective,
          mechanic: cand.mechanic,
          theme,
          ...(c.season ? { season: c.season } : {}),
          level,
          difficulty: difficultyForLevel(level, c.difficulty),
          duration: durationForMechanic(cand.mechanic, c.duration),
          ...(c.approach ? { approach: c.approach } : {}),
        }),
      );
      mechanicUse.set(cand.mechanic.id, used + 1);
      objectiveUse.add(cand.objective.id);
    }
  }
  return out;
}

/* ------------------------------------------------------- differentiation */

const difficultyOrder = ["Very Easy", "Easy", "Standard", "Challenge"];

/** Deterministic differentiation rules (AI can replace these later). */
export const differentiationRules = {
  easier: [
    "fewer items per row",
    "larger illustrations",
    "fewer answer choices",
    "smaller number range",
    "one-step instruction",
  ],
  harder: [
    "more items per row",
    "wider number range",
    "extra distractors",
    "a multi-step task",
    "a reasoning challenge",
  ],
};

function reIdentify(idea: IdeaSpec, patch: Partial<IdeaSpec>): IdeaSpec {
  const objective = objectiveMap[patch.objectiveId ?? idea.objectiveId]!;
  const mechanic = mechanicMap[patch.mechanicId ?? idea.mechanicId]!;
  return composeIdea({
    objective,
    mechanic,
    theme: patch.theme ?? idea.theme,
    season: patch.season ?? idea.season,
    level: patch.level ?? idea.level,
    difficulty: patch.difficulty ?? idea.difficulty,
    duration: patch.duration ?? idea.duration,
    approach: patch.approach ?? idea.approach,
    pages: patch.pages ?? idea.pages,
  });
}

export function makeEasier(idea: IdeaSpec): IdeaSpec {
  const i = Math.max(0, difficultyOrder.indexOf(idea.difficulty) - 1);
  return reIdentify(idea, {
    difficulty: difficultyOrder[i]!,
    pages: String(Math.max(1, Number(idea.pages) - 1)),
  });
}

export function makeHarder(idea: IdeaSpec): IdeaSpec {
  const i = Math.min(difficultyOrder.length - 1, difficultyOrder.indexOf(idea.difficulty) + 1);
  return reIdentify(idea, {
    difficulty: difficultyOrder[i]!,
    pages: String(Math.min(6, Number(idea.pages) + 1)),
  });
}

export function changeTheme(idea: IdeaSpec, seed = 0): IdeaSpec {
  const pool = themes.filter((t) => t !== idea.theme);
  const next = pool[hash(idea.id + seed) % pool.length]!;
  return reIdentify(idea, { theme: next });
}

/** A different mechanic for the same learning objective. */
export function similarIdea(idea: IdeaSpec, seed = 0): IdeaSpec {
  const objective = objectiveMap[idea.objectiveId]!;
  const pool = objective.mechanics.filter((m) => m !== idea.mechanicId);
  if (pool.length === 0) return changeTheme(idea, seed);
  const next = pool[hash(idea.id + "sim" + seed) % pool.length]!;
  return reIdentify(idea, { mechanicId: next });
}

/* ----------------------------------------------------- smart related next */

/**
 * "You might create next…" — complementary objectives, never a duplicate of
 * the current one.
 */
export function relatedIdeas(
  source: { skill?: string; theme?: string; level?: string; objectiveId?: string },
  count = 4,
): IdeaSpec[] {
  const level = source.level ?? "Ages 4–5";
  const lvl = levelIndex(level);
  const current =
    (source.objectiveId ? objectiveMap[source.objectiveId] : undefined) ??
    objectives.find((o) => o.skill === source.skill);

  const relatedIds = current?.related ?? [];
  const pool = objectives.filter(
    (o) =>
      o.id !== current?.id &&
      o.minLevel <= lvl + 1 &&
      (relatedIds.includes(o.id) || o.subject === current?.subject),
  );
  const ordered = [
    ...pool.filter((o) => relatedIds.includes(o.id)),
    ...pool.filter((o) => !relatedIds.includes(o.id)),
  ];

  return ordered.slice(0, count).map((objective, i) => {
    const mechanic = mechanicMap[objective.mechanics[i % objective.mechanics.length]!]!;
    return composeIdea({
      objective,
      mechanic,
      theme: source.theme ?? "Nature",
      level,
      difficulty: difficultyForLevel(level),
      duration: durationForMechanic(mechanic),
    });
  });
}

/* ----------------------------------------------- categories & shortcuts */

export type IdeaCategory = {
  id: string;
  label: string;
  group: "Time & moment" | "Learning area" | "Approach";
  constraints: IdeaConstraints;
};

export const ideaCategories: IdeaCategory[] = [
  {
    id: "quick-5",
    label: "Quick 5-Minute Activities",
    group: "Time & moment",
    constraints: { duration: "5 minutes" },
  },
  {
    id: "ten",
    label: "10-Minute Activities",
    group: "Time & moment",
    constraints: { duration: "10 minutes" },
  },
  {
    id: "morning",
    label: "Morning Work",
    group: "Time & moment",
    constraints: {
      duration: "10 minutes",
      grouping: "Individual",
      intent: "calm independent start",
    },
  },
  {
    id: "early-finishers",
    label: "Early Finishers",
    group: "Time & moment",
    constraints: { duration: "10 minutes", grouping: "Individual", intent: "no prep independent" },
  },
  {
    id: "quiet",
    label: "Quiet Time",
    group: "Time & moment",
    constraints: { grouping: "Individual", intent: "quiet calm colouring tracing" },
  },
  {
    id: "centers",
    label: "Learning Centers",
    group: "Time & moment",
    constraints: { grouping: "Small group", format: "Center mat" },
  },
  {
    id: "fine-motor",
    label: "Fine Motor",
    group: "Learning area",
    constraints: { subject: "Fine Motor" },
  },
  {
    id: "literacy",
    label: "Early Literacy",
    group: "Learning area",
    constraints: { subject: "Early Literacy" },
  },
  { id: "phonics", label: "Phonics", group: "Learning area", constraints: { skill: "Phonics" } },
  {
    id: "vocabulary",
    label: "Vocabulary",
    group: "Learning area",
    constraints: { skill: "Vocabulary" },
  },
  {
    id: "math",
    label: "Early Math",
    group: "Learning area",
    constraints: { subject: "Early Math" },
  },
  { id: "counting", label: "Counting", group: "Learning area", constraints: { skill: "Counting" } },
  { id: "patterns", label: "Patterns", group: "Learning area", constraints: { skill: "Patterns" } },
  { id: "logic", label: "Logic", group: "Learning area", constraints: { skill: "Logic" } },
  {
    id: "problem-solving",
    label: "Problem Solving",
    group: "Learning area",
    constraints: { subject: "Problem Solving" },
  },
  { id: "sel", label: "SEL", group: "Learning area", constraints: { subject: "SEL" } },
  { id: "science", label: "Science", group: "Learning area", constraints: { subject: "Science" } },
  { id: "nature", label: "Nature", group: "Learning area", constraints: { subject: "Nature" } },
  {
    id: "seasonal",
    label: "Seasonal Learning",
    group: "Learning area",
    constraints: { subject: "Seasonal Learning" },
  },
  {
    id: "games",
    label: "Classroom Games",
    group: "Approach",
    constraints: { grouping: "Whole class" },
  },
  {
    id: "story",
    label: "Story-Based Learning",
    group: "Approach",
    constraints: { intent: "story retell sequence" },
  },
  {
    id: "montessori",
    label: "Montessori-inspired",
    group: "Approach",
    constraints: { approach: "Montessori" },
  },
  {
    id: "reggio",
    label: "Reggio-inspired",
    group: "Approach",
    constraints: { approach: "Reggio Emilia" },
  },
  {
    id: "play",
    label: "Play-based learning",
    group: "Approach",
    constraints: { approach: "Play-Based Learning" },
  },
  {
    id: "creative",
    label: "Creative thinking",
    group: "Approach",
    constraints: { subject: "Creative Thinking" },
  },
];

/** Creative starting points — discovery without knowing what to search for. */
export const startingPoints: Array<{ label: string; constraints: IdeaConstraints }> = [
  { label: "I have 10 minutes", constraints: { duration: "10 minutes" } },
  {
    label: "I need a quiet activity",
    constraints: { grouping: "Individual", intent: "quiet calm tracing colouring" },
  },
  {
    label: "My students finished early",
    constraints: { duration: "5 minutes", grouping: "Individual" },
  },
  {
    label: "I need something with no prep",
    constraints: { intent: "no prep worksheet circle match" },
  },
  { label: "I want to practice counting", constraints: { skill: "Counting" } },
  {
    label: "I want a literacy center",
    constraints: { subject: "Early Literacy", grouping: "Small group" },
  },
  {
    label: "I need something for tomorrow morning",
    constraints: { duration: "10 minutes", intent: "morning independent calm" },
  },
  { label: "I want a nature activity", constraints: { subject: "Nature" } },
  {
    label: "I want something children can cut and paste",
    constraints: { mechanicId: "cut-paste" },
  },
  {
    label: "I need an activity for mixed abilities",
    constraints: { difficulty: "Standard", intent: "sorting open ended drawing" },
  },
  { label: "I want something playful", constraints: { approach: "Play-Based Learning" } },
  {
    label: "I want a challenge",
    constraints: { difficulty: "Challenge", intent: "logic reasoning puzzle" },
  },
];

/* ------------------------------------------------------ Creator handoff */

/**
 * COMPLETE HANDOFF — the Creator receives the whole activity specification,
 * not a theme plus a guess. Subject domain, objective, mechanic, skill,
 * format, grouping and age all travel together so the generator never has to
 * re-infer the activity from the theme.
 */
export function ideaToSpecPatch(idea: IdeaSpec): Partial<WorksheetSpec> {
  return {
    objectiveId: idea.objectiveId,
    mechanicId: idea.mechanicId,
    subjectDomain: idea.subject,
    activityMechanic: canonicalMechanicForIdea(idea),
    primarySkill: idea.skill,
    grouping: idea.grouping,
    activityTitle: idea.title,
    source: "idea-lab",
    objective: idea.objective,
    printableFormat: idea.format,
    level: idea.level,
    duration: idea.duration,
    pages: idea.pages,
    approach: idea.approach,
    skill: idea.skill,
    activityType: idea.activityType,
    difficulty: idea.difficulty,
    theme: idea.theme,
    prompt: `${idea.title}. ${idea.whatChildrenDo} Learning objective: ${idea.objective}`,
  };
}

/** The printable mechanic an idea contracts for, resolved once at handoff. */
export function canonicalMechanicForIdea(idea: IdeaSpec) {
  return resolveObjectiveProfile({
    objectiveId: idea.objectiveId,
    mechanicId: idea.mechanicId,
    subjectDomain: idea.subject,
    theme: idea.theme,
    skill: idea.skill,
    level: idea.level,
  } as WorksheetSpec).mechanic;
}

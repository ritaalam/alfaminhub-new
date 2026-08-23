export type OptionGroup = {
  key: WorksheetField;
  label: string;
  helper?: string;
  options: string[];
  allowCustom?: boolean;
};

export type WorksheetField =
  | "level"
  | "duration"
  | "pages"
  | "approach"
  | "skill"
  | "activityType"
  | "difficulty"
  | "theme"
  | "palette"
  | "inspiration"
  | "language"
  | "paper"
  | "printing";

/**
 * Facts the teacher stated in free text. These travel with the request instead
 * of being reduced to a theme or a generic template setting.
 */
export type PromptRequirementContract = {
  rawPrompt: string;
  /** Recognised visual entities that must appear without unrelated replacements. */
  exactObjects: string[];
  /** Exact quantities explicitly requested (for example, "exactly 5 shells"). */
  exactQuantities: number[];
  /** Ordered object/quantity pairs in a detailed counting request. */
  countGroups: Array<{ asset: string; count: number }>;
  /** Exact number of countable groups, when the teacher stated one. */
  requiredGroupCount?: number;
  /** Exact number of numeral choices required for every countable group. */
  requiredChoiceCount?: number;
  /** Explicit printable arrangement requests the renderer can verify. */
  layouts: Array<"two-columns" | "stacked-rows" | "grid">;
  /** Appearance constraints that must remain true in preview and export. */
  visualConstraints: Array<"color" | "black-and-white" | "ink-saving" | "watercolor">;
  /** An explicitly requested interaction/mechanic, when the parser recognises it. */
  requestedActivity?: string;
  /** Requirements the current deterministic renderer cannot honestly satisfy. */
  unsupported: string[];
};

/**
 * Short, server-generated teaching copy. The renderer still owns activities,
 * answers, layouts, and printable artwork; AI can never send executable or
 * arbitrary page markup.
 */
export type AIWorksheetContent = {
  title?: string;
  teacherNotes?: string[];
  pages?: Array<{
    page: number;
    title?: string;
    instruction?: string;
  }>;
};

export type WorksheetSpec = Record<WorksheetField, string> & {
  prompt: string;
  /**
   * Set only for a teacher-selected Advanced Create activity. Unlike the
   * display-oriented `activityType` field, this is a generation contract: the
   * printable must use the mapped mechanic or generation must stop.
   */
  advancedActivityType?: string;
  /** Immutable prompt-first requirements parsed before AI/local planning. */
  promptRequirements?: PromptRequirementContract;
  /** How the optional planning layer produced this request. */
  planningSource?: "ai" | "local";
  /** Optional structured teacher copy produced by the server-side AI planner. */
  aiWorksheetContent?: AIWorksheetContent;
  /** Idea Lab learning-objective id, preserved so the printable practises it */
  objectiveId?: string;
  /** Idea Lab activity-mechanic id */
  mechanicId?: string;
  /** human-readable learning objective carried from the idea */
  objective?: string;
  /** intended printable format carried from the idea (worksheet, cards, booklet…) */
  printableFormat?: string;
  /** Idea Lab subject, e.g. "Early Literacy" — decides the learning domain */
  subjectDomain?: string;
  /** canonical printable mechanic requested by the source activity */
  activityMechanic?: string;
  /** the skill the activity teaches, e.g. "Vocabulary" */
  primarySkill?: string;
  /** how children work: Individual / Small group / Whole class */
  grouping?: string;
  /** title of the originating activity */
  activityTitle?: string;
  /** where the specification came from */
  source?: "idea-lab" | "creator";
};

export const defaultSpec: WorksheetSpec = {
  prompt: "",
  level: "Ages 4–5",
  duration: "10 minutes",
  pages: "2",
  approach: "Montessori",
  skill: "Counting",
  activityType: "Worksheet",
  difficulty: "Easy",
  theme: "Insects",
  palette: "Montessori Neutrals",
  inspiration: "Vintage European Children's Storybook",
  language: "English",
  paper: "A4",
  printing: "Color",
};

export const basicsGroups: OptionGroup[] = [
  {
    key: "level",
    label: "Level / Class",
    options: [
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
    ],
    allowCustom: true,
  },
  {
    key: "duration",
    label: "Activity duration",
    options: [
      "5 minutes",
      "10 minutes",
      "15 minutes",
      "20 minutes",
      "30 minutes",
      "45 minutes",
      "60 minutes",
    ],
  },
  {
    key: "pages",
    label: "Number of pages",
    options: ["1", "2", "5", "10", "20"],
    allowCustom: true,
  },
];

export const learningGroups: OptionGroup[] = [
  {
    key: "approach",
    label: "Teaching approach",
    options: [
      "Montessori",
      "Reggio Emilia",
      "Waldorf-inspired",
      "Traditional Classroom",
      "Play-Based Learning",
      "Inquiry-Based Learning",
      "STEM",
      "Sensory Learning",
      "Project-Based Learning",
    ],
  },
  {
    key: "skill",
    label: "Learning skill",
    options: [
      "Alphabet",
      "Phonics",
      "Vocabulary",
      "Pre-Writing",
      "Handwriting",
      "Reading",
      "Writing",
      "Counting",
      "Number Recognition",
      "Addition",
      "Subtraction",
      "Shapes",
      "Patterns",
      "Logic",
      "Problem Solving",
      "Fine Motor",
      "Visual Discrimination",
      "Science",
      "Geography",
      "SEL/Emotions",
      "Creativity",
    ],
  },
  {
    key: "activityType",
    label: "Activity type",
    options: [
      "Tracing",
      "Matching",
      "Maze",
      "Cut & Paste",
      "Sorting",
      "I Spy",
      "Bingo",
      "Flashcards",
      "Coloring",
      "Sequencing",
      "Puzzle",
      "Worksheet",
      "Mini Book",
      "Scissor Skills",
      "Find the Difference",
      "Connect the Dots",
    ],
  },
  {
    key: "difficulty",
    label: "Difficulty",
    options: ["Very Easy", "Easy", "Standard", "Challenge", "Mixed/Differentiated"],
  },
];

export const styleGroups: OptionGroup[] = [
  {
    key: "theme",
    label: "Theme",
    options: [
      "Nature",
      "Farm",
      "Ocean",
      "Space",
      "Dinosaurs",
      "Flowers",
      "Insects",
      "Seasons",
      "Christmas",
      "Easter",
      "School",
      "Emotions",
      "Transportation",
      "Animals",
      "Fairy-tale Garden",
      "Countryside",
      "Woodland",
      "Seaside",
      "Alpine Village",
    ],
    allowCustom: true,
  },
  {
    key: "palette",
    label: "Color palette",
    options: [
      "Black & White / Ink Saving",
      "Montessori Neutrals",
      "Soft Pastels",
      "Bright Primary",
      "Sage & Cream",
      "Terracotta & Beige",
      "Pink",
      "Blue",
      "Rainbow",
    ],
    allowCustom: true,
  },
  {
    key: "inspiration",
    label: "Visual inspiration",
    helper:
      "Describes atmosphere, composition and mood only — never copyrighted characters or protected artwork.",
    options: [
      "Vintage European Children's Storybook",
      "Alpine Countryside Childhood",
      "French Countryside Childhood",
      "Woodland Storybook",
      "Scandinavian Minimal",
      "Watercolor Nature",
      "Classic Classroom",
      "Whimsical Garden",
      "Seaside Adventure",
      "Cozy Farm",
    ],
    allowCustom: true,
  },
];

export const outputGroups: OptionGroup[] = [
  {
    key: "language",
    label: "Language",
    options: [
      "English",
      "French",
      "Arabic",
      "English/French bilingual",
      "English/Arabic bilingual",
    ],
    allowCustom: true,
  },
  { key: "paper", label: "Paper", options: ["A4", "US Letter"] },
  { key: "printing", label: "Printing", options: ["Color", "Black & White"] },
];

export const steps = [
  { id: "basics", title: "Basics", groups: basicsGroups },
  { id: "learning", title: "Learning", groups: learningGroups },
  { id: "style", title: "Style", groups: styleGroups },
  { id: "output", title: "Output", groups: outputGroups },
] as const;

export const summaryFields: { key: WorksheetField; label: string }[] = [
  { key: "level", label: "Level" },
  { key: "duration", label: "Duration" },
  { key: "pages", label: "Pages" },
  { key: "approach", label: "Approach" },
  { key: "skill", label: "Skill" },
  { key: "activityType", label: "Activity" },
  { key: "difficulty", label: "Difficulty" },
  { key: "theme", label: "Theme" },
  { key: "palette", label: "Palette" },
  { key: "inspiration", label: "Inspiration" },
  { key: "language", label: "Language" },
  { key: "paper", label: "Paper" },
  { key: "printing", label: "Printing" },
];

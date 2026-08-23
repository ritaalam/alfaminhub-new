/**
 * Natural-language teacher request → structured idea constraints.
 *
 * This is the deterministic interpreter that runs instantly in the browser and
 * is also used as the guaranteed fallback whenever the AI planner is
 * unavailable. It never invents pedagogy: it only maps what the teacher wrote
 * onto the registries the Idea Engine already knows.
 */

import { levels, seasons, themes, type IdeaConstraints } from "./engine";

export type ParsedRequest = {
  constraints: IdeaConstraints;
  /** what the interpreter understood, shown back to the teacher */
  notes: string[];
};

const levelPatterns: Array<[RegExp, string]> = [
  [/\b(2|two)[-\s]?(year|yr)/i, "Ages 2–3"],
  [/\b(3|three)[-\s]?(year|yr)/i, "Ages 3–4"],
  [/\b(4|four)[-\s]?(year|yr)/i, "Ages 4–5"],
  [/\b(5|five)[-\s]?(year|yr)/i, "Kindergarten"],
  [/\bpre[-\s]?k\b/i, "Pre-K"],
  [/\bpreschool\b/i, "Preschool"],
  [/\bkinder/i, "Kindergarten"],
  [/\bgrade\s*1\b|\bfirst grade\b/i, "Grade 1"],
  [/\bgrade\s*2\b|\bsecond grade\b/i, "Grade 2"],
  [/\bgrade\s*3\b|\bthird grade\b/i, "Grade 3"],
  [/\bgrade\s*4\b|\bfourth grade\b/i, "Grade 4"],
  [/\bgrade\s*5\b|\bfifth grade\b/i, "Grade 5"],
  [/\bgrade\s*6\b|\bsixth grade\b/i, "Grade 6"],
  [/\bages?\s*2\s*[–-]\s*3/i, "Ages 2–3"],
  [/\bages?\s*3\s*[–-]\s*4/i, "Ages 3–4"],
  [/\bages?\s*4\s*[–-]\s*5/i, "Ages 4–5"],
];

const durationPatterns: Array<[RegExp, string]> = [
  [/\b5[-\s]?(minute|min)/i, "5 minutes"],
  [/\b10[-\s]?(minute|min)/i, "10 minutes"],
  [/\b15[-\s]?(minute|min)/i, "15 minutes"],
  [/\b20[-\s]?(minute|min)/i, "20 minutes"],
  [/\b30\+?[-\s]?(minute|min)/i, "20 minutes"],
];

const skillPatterns: Array<[RegExp, { skill?: string; subject?: string }]> = [
  [/\bcount|how many|quantit|numbers?\s*1\s*[–-]\s*\d+/i, { skill: "Counting" }],
  [
    /\bnumeral|number recognition|recognise numbers|recognize numbers/i,
    { skill: "Number Recognition" },
  ],
  [/\bphonic|beginning sound|letter sound|rhym/i, { skill: "Phonics" }],
  [
    /\b(b and d|p and q|letter recognition|confuse letters|mirror letters|reversal)/i,
    { skill: "Visual Discrimination" },
  ],
  [/\bwriting|handwriting|letter formation|trace letters/i, { skill: "Handwriting" }],
  [/\bfine motor|pencil grip|cutting|scissors|hand strength/i, { subject: "Fine Motor" }],
  [/\bvocabular|new words|word picture/i, { skill: "Vocabulary" }],
  [/\bread(ing)?\b|retell|story order/i, { skill: "Reading" }],
  [/\bshape/i, { skill: "Shapes" }],
  [/\bpattern/i, { skill: "Patterns" }],
  [/\blogic|puzzle|reason/i, { skill: "Logic" }],
  [/\bsort|classif|categor/i, { skill: "Logic" }],
  [/\bfeeling|emotion|kindness|sharing|calm down|social/i, { subject: "SEL" }],
  [/\bscience|life cycle|living|habitat|experiment/i, { subject: "Science" }],
  [/\bnature|outdoor|garden|leaf|leaves|tree/i, { subject: "Nature" }],
  [/\bproblem solving/i, { subject: "Problem Solving" }],
  [/\bcreativ|imagin|draw freely/i, { subject: "Creative Thinking" }],
  [/\bmath\b/i, { subject: "Early Math" }],
  [/\bliteracy|alphabet|letters\b/i, { subject: "Early Literacy" }],
];

const themeWords: Record<string, string> = {
  butterfl: "Insects",
  insect: "Insects",
  bug: "Insects",
  bee: "Insects",
  ladybug: "Insects",
  farm: "Farm",
  animal: "Animals",
  ocean: "Ocean",
  sea: "Ocean",
  fish: "Ocean",
  space: "Space",
  planet: "Space",
  star: "Space",
  dinosaur: "Dinosaurs",
  flower: "Flowers",
  forest: "Woodland",
  woodland: "Woodland",
  nature: "Nature",
  transport: "Transportation",
  car: "Transportation",
  emotion: "Emotions",
  feeling: "Emotions",
  school: "School",
  season: "Seasons",
  weather: "Seasons",
};

const seasonWords: Record<string, string> = {
  spring: "Spring",
  summer: "Summer",
  autumn: "Autumn",
  fall: "Autumn",
  winter: "Winter",
  christmas: "Christmas",
  easter: "Easter",
  "back to school": "Back to school",
};

export function parseTeacherRequest(text: string): ParsedRequest {
  const t = text.trim();
  const constraints: IdeaConstraints = {};
  const notes: string[] = [];
  if (!t) return { constraints, notes };

  for (const [re, level] of levelPatterns) {
    if (re.test(t)) {
      constraints.level = level;
      notes.push(`Age group: ${level}`);
      break;
    }
  }
  for (const [re, duration] of durationPatterns) {
    if (re.test(t)) {
      constraints.duration = duration;
      notes.push(`Time available: ${duration}`);
      break;
    }
  }
  for (const [re, patch] of skillPatterns) {
    if (re.test(t)) {
      Object.assign(constraints, patch);
      notes.push(`Focus: ${patch.skill ?? patch.subject}`);
      break;
    }
  }
  const lower = t.toLowerCase();
  for (const [word, theme] of Object.entries(themeWords)) {
    if (lower.includes(word)) {
      constraints.theme = theme;
      notes.push(`Theme: ${theme}`);
      break;
    }
  }
  for (const [word, season] of Object.entries(seasonWords)) {
    if (lower.includes(word)) {
      constraints.season = season;
      notes.push(`Season: ${season}`);
      break;
    }
  }

  if (/\bquiet|calm|settle|after lunch|nap/i.test(t)) {
    constraints.grouping = "Individual";
    notes.push("Calm, individual work");
  } else if (/\bgroup|together|whole class|circle time/i.test(t)) {
    constraints.grouping = "Whole class";
    notes.push("Whole-class activity");
  } else if (/\bpartner|pairs?\b|two children/i.test(t)) {
    constraints.grouping = "Small group";
    notes.push("Partner / small group");
  }

  if (/\bno prep|without preparation|almost no preparation|last minute|right now/i.test(t)) {
    constraints.intent = `${constraints.intent ?? ""} no prep print and go`.trim();
    notes.push("No preparation needed");
  }
  if (/\bfinish(ed)? (their work )?early|early finisher|fast finisher/i.test(t)) {
    constraints.grouping = constraints.grouping ?? "Individual";
    constraints.duration = constraints.duration ?? "5 minutes";
    notes.push("Early finishers");
  }
  if (/\bchalleng|advanced|too easy|bored/i.test(t)) {
    constraints.difficulty = "Challenge";
    notes.push("Higher challenge");
  }
  if (/\bstruggl|difficult|hard for|support|behind/i.test(t)) {
    constraints.difficulty = "Very Easy";
    notes.push("Extra support");
  }
  if (/\bmontessori/i.test(t)) constraints.approach = "Montessori";
  if (/\breggio/i.test(t)) constraints.approach = "Reggio Emilia";
  if (/\bplay/i.test(t)) constraints.approach = "Play-Based Learning";

  constraints.intent = `${constraints.intent ?? ""} ${t}`.trim();
  return { constraints, notes };
}

/** Guards an AI-proposed constraint object against the known registries. */
export function sanitizeConstraints(input: Record<string, unknown>): IdeaConstraints {
  const out: IdeaConstraints = {};
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);

  const level = str(input["level"]);
  if (level && (levels as readonly string[]).includes(level)) out.level = level;
  const theme = str(input["theme"]);
  if (theme && themes.includes(theme)) out.theme = theme;
  const season = str(input["season"]);
  if (season && (seasons as readonly string[]).includes(season)) out.season = season;
  for (const key of [
    "subject",
    "skill",
    "duration",
    "difficulty",
    "approach",
    "grouping",
    "mechanicId",
    "intent",
  ] as const) {
    const v = str(input[key]);
    if (v) out[key] = v;
  }
  return out;
}

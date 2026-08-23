/**
 * Prompt-first intent parsing.
 *
 * The teacher's CURRENT prompt is the source of truth. Before anything is
 * generated the prompt is parsed into a learning DOMAIN (literacy, math,
 * science) plus the concrete facts it states — target letter, topic, page
 * count, age band, difficulty, language.
 *
 * This is what stops a phonics request ("Letter B worksheet for 4 year olds")
 * from silently inheriting the app defaults (Counting + Insects) and producing
 * a counting pack.
 */

import {
  defaultSpec,
  type PromptRequirementContract,
  type WorksheetSpec,
} from "./creator-options";
import { matchObjects, matchTheme, themeTopics, visualObjects } from "./semantic-topics";
import { hasPictures, illustratedLetters } from "./phonics-vocabulary";
import { craftThemeFor } from "./worksheet-cut-create";

export type LearningDomain = "craft" | "literacy" | "math" | "science";

export type PromptIntent = {
  raw: string;
  domain: LearningDomain;
  /** true when the prompt itself (not a default) decided the domain */
  explicitDomain: boolean;
  letter?: string;
  skill?: string;
  theme?: string;
  pages?: number;
  level?: string;
  difficulty?: string;
  language?: string;
  activityType?: string;
};

/**
 * EXPLICIT ACTIVITY MECHANIC — Cut & Create.
 *
 * This is checked BEFORE any academic domain. "Build your own aquarium with
 * fish" is scissors work, not "F is for fish"; object names inside a craft
 * theme must never route the request into phonics or counting.
 */
export const CUT_CREATE = new RegExp(
  [
    // "cut & create", "cut and paste", "cut and glue"
    String.raw`\bcut\s*(?:&|and|\+)?\s*(?:create|paste|glue|stick)\b`,
    String.raw`\bcutting\s+(?:and|&)\s+(?:glu|past|stick|creat)\w*`,
    String.raw`\bcut\b[^.]{0,40}\b(?:glue|paste|stick)\b`,
    // "cut-out pieces", "movable pieces", "paper craft", "scissor skills"
    String.raw`\bcut[- ]?outs?\b`,
    String.raw`\bmov(?:e?able|ing) pieces\b`,
    String.raw`\bpaper craft\b|\bcraft (?:pack|activity|printable)\b|\bscissor skills?\b`,
    // "build your own …", "design your own …", "create your own …"
    String.raw`\b(?:build|make|design|create|decorate|assemble|construct)\s+(?:your|their|his|her|my)\s+own\b`,
    // "decorate a cupcake", "decorate the gingerbread house"
    String.raw`\bdecorate\s+(?:a|an|the|your)\b`,
    // "build a rocket by cutting …" / "assemble the pieces"
    String.raw`\b(?:build|assemble|construct)\b[^.]{0,40}\b(?:by cutting|cut|glue|paste|pieces)\b`,
  ].join("|"),
  "i",
);

const LITERACY =
  /\bletters?\b|\balphabet\b|phonic|phoneme|beginning sound|initial sound|first sound|\bvowels?\b|consonant|uppercase|lowercase|capital letter|handwriting|trace the letter|letter recognition|\babc\b|rhym|sight word|pre-?writing|\bbegins? with\b|\bstarts? with\b|same sound/i;

const SCIENCE =
  /\bweather\b|\bseasons?\b|life ?cycle|\bhabitat\b|five senses|\bsenses\b|body parts|float(ing)? (and|or) sink|magnet|living (and|or) non-?living|plants? grow|\bnature study\b|day and night|recycl/i;

const MATH =
  /\bcount(ing)?\b|\bnumbers?\b|numeral|\bmore\b|\bfewer\b|\bless\b|\bpatterns?\b|\bshapes?\b|\badd(ition)?\b|subtract|\bsorting by size\b|how many|quantit/i;

const literacySkill: Array<{ test: RegExp; skill: string }> = [
  { test: /trace|handwriting|pre-?writing|write the letter/i, skill: "Letter Tracing" },
  {
    test: /beginning sound|initial sound|first sound|phonic|phoneme|\bsounds?\b/i,
    skill: "Beginning Sounds",
  },
  { test: /sort/i, skill: "Letter Sorting" },
  { test: /./, skill: "Letter Recognition" },
];

const ageByPhrase: Array<{ test: RegExp; level: string }> = [
  { test: /\b2\s*(?:-|–|to)\s*3\b|\b2[- ]year/i, level: "Ages 2–3" },
  { test: /\b3\s*(?:-|–|to)\s*4\b|\b3[- ]year/i, level: "Ages 3–4" },
  {
    test: /\b4\s*(?:-|–|to)\s*[56]\b|\b5\s*(?:-|–|to)\s*6\b|\b4[- ]year|\b5[- ]year/i,
    level: "Ages 4–5",
  },
  { test: /kindergarten|\bkg\b/i, level: "Kindergarten" },
  { test: /pre-?school|nursery/i, level: "Preschool" },
  { test: /grade\s*1|year\s*1|first grade/i, level: "Grade 1" },
  { test: /grade\s*2|year\s*2|second grade/i, level: "Grade 2" },
  { test: /grade\s*3|year\s*3|third grade/i, level: "Grade 3" },
  { test: /grade\s*4|year\s*4|fourth grade/i, level: "Grade 4" },
  { test: /grade\s*5|year\s*5|fifth grade/i, level: "Grade 5" },
  { test: /grade\s*6|year\s*6|sixth grade/i, level: "Grade 6" },
  { test: /pre-?k\b/i, level: "Pre-K" },
];

const requestedActivity = [
  { test: CUT_CREATE, activityType: "Cut & Paste" },
  { test: /memory (pairs?|game|cards?)|matching cards|concentration game/i, activityType: "Flashcards" },
  { test: /\bconnect[- ]?the[- ]?dots?\b/i, activityType: "Connect the Dots" },
  { test: /\bmaze\b/i, activityType: "Maze" },
  { test: /\bcoloring\b|\bcolouring\b/i, activityType: "Coloring" },
  { test: /\bpatterns?\b|what comes next|complete the pattern/i, activityType: "Patterns" },
  {
    test: /\b(?:tracing|trace)\s+(?:worksheet|activity|practice|lines?|paths?|shapes?)\b/i,
    activityType: "Tracing",
  },
  {
    test:
      /\bmatching\b(?=[\s\S]*(?:\bworksheet|\bactivity|\bpractice|\bgame)\b)|\b(?:worksheet|activity|practice|game)\b(?=[\s\S]*\bmatching\b)|\bmatch(?:ing)?\s+(?:pairs|pictures?|objects?|shapes?|animals?|cards?)\b/i,
    activityType: "Matching",
  },
  { test: /\bsort(?:ing)?\b|classify|group .* into/i, activityType: "Sorting" },
  { test: /\bsequenc(?:e|ing)\b|put .* in order/i, activityType: "Sequencing" },
  {
    test: /\bi spy\b|\bfind[- ]?and[- ]?count\b|\bspot\s+(?:all|every|the)\b/i,
    activityType: "I Spy",
  },
  { test: /\bbingo\b/i, activityType: "Flashcards" },
  { test: /\bfind[- ]?the[- ]?difference\b/i, activityType: "Find the Difference" },
  { test: /\bpuzzle\b/i, activityType: "Puzzle" },
  { test: /\bmini[- ]?book\b/i, activityType: "Mini Book" },
  { test: /\bscissor skills?\b/i, activityType: "Cut & Paste" },
  { test: /\bcount(?:ing)?\b|how many|number recognition/i, activityType: "Counting" },
] as const;

/**
 * Extracts requirement facts that a planner is not allowed to "improve" away.
 * It is intentionally conservative: facts are recorded only when the teacher
 * wrote them explicitly, and unsupported mechanics are surfaced before a
 * generic worksheet could be shown.
 */
export function parsePromptRequirements(prompt: string): PromptRequirementContract {
  const rawPrompt = (prompt ?? "").trim();
  const exactObjects = [...new Set(matchObjects(rawPrompt))];
  const countGroups = [...rawPrompt.matchAll(/\b(\d{1,2})\s+([a-z][a-z-]*)\b/gi)].flatMap(
    (match) => {
      const count = Number(match[1]);
      const asset = matchObjects(match[2] ?? "")[0];
      return Number.isInteger(count) && count > 0 && count <= 20 && asset
        ? [{ asset, count }]
        : [];
    },
  );
  const genericExactQuantities = [
    ...rawPrompt.matchAll(/\b(?:exactly|show|use|include|with)\s+(\d{1,2})\b/gi),
  ]
    .map((match) => Number(match[1]))
    .filter((count) => Number.isInteger(count) && count > 0 && count <= 20);
  // A detailed request such as "3 groups: 2 apples, 4 stars, and 5 fish"
  // names each printable group. Its leading group count is never an object
  // quantity, and the object/count pairs must survive independently.
  const exactQuantities = countGroups.length
    ? countGroups.map((group) => group.count)
    : genericExactQuantities;
  const groupMatch = /\b(\d{1,2})\s+(?:different\s+)?(?:groups?|sets?)\b/i.exec(rawPrompt);
  const choiceMatch = /\b(\d{1,2})\s+(?:number|answer)\s+choices?\b/i.exec(rawPrompt);
  const requiredGroupCount = groupMatch ? Number(groupMatch[1]) : undefined;
  const requiredChoiceCount = choiceMatch ? Number(choiceMatch[1]) : undefined;
  const layouts: PromptRequirementContract["layouts"] = [];
  if (/\btwo[- ]?columns?\b|\b2[- ]?columns?\b/i.test(rawPrompt)) layouts.push("two-columns");
  if (/\b(?:stacked|rows?)\b/i.test(rawPrompt)) layouts.push("stacked-rows");
  if (/\b\d+\s*[×x]\s*\d+\s*(?:grid|layout)\b|\bgrid\b/i.test(rawPrompt)) layouts.push("grid");
  const visualConstraints: PromptRequirementContract["visualConstraints"] = [];
  if (/\bblack[- ]?(?:and|&)[- ]?white\b|\bgrayscale\b/i.test(rawPrompt))
    visualConstraints.push("black-and-white");
  else if (/\bfull[- ]?color\b|\bcolour\b|\bcolor\b/i.test(rawPrompt)) visualConstraints.push("color");
  if (/\bink[- ]?saving\b/i.test(rawPrompt)) visualConstraints.push("ink-saving");
  if (/\bwatercolou?r\b/i.test(rawPrompt)) visualConstraints.push("watercolor");
  const requested = requestedActivity.find((rule) => rule.test.test(rawPrompt))?.activityType;
  return {
    rawPrompt,
    exactObjects,
    exactQuantities: [...new Set(exactQuantities)],
    countGroups,
    ...(countGroups.length && requiredGroupCount ? { requiredGroupCount } : {}),
    ...(countGroups.length && requiredChoiceCount ? { requiredChoiceCount } : {}),
    layouts: [...new Set(layouts)],
    visualConstraints: [...new Set(visualConstraints)],
    ...(requested ? { requestedActivity: requested } : {}),
    // Activity wording is adapted to a renderer-ready equivalent rather than
    // blocking a teacher-requested page because the original layout is absent.
    unsupported: [],
  };
}

function letterFromPrompt(text: string): string | undefined {
  const named =
    text.match(/letters?\s+["']?([a-z])["']?\b/i) ??
    text.match(/\/\s*([a-z])\s*\//) ??
    text.match(/\b([a-z])\s*(?:sound|is for)\b/i) ??
    text.match(/sound of (?:the letter )?["']?([a-z])["']?\b/i);
  const letter = named?.[1]?.toLowerCase();
  if (letter && hasPictures(letter)) return letter;
  if (letter) return letter;
  return undefined;
}

function themeFromPrompt(text: string): string | undefined {
  const objects = matchObjects(text);
  if (objects.length === 1) return visualObjects[objects[0]!].label;
  const topic = matchTheme(text);
  if (topic) return topic.title;
  if (objects.length > 1) {
    const sharedTopic = themeTopics.find((candidate) =>
      objects.every((object) => candidate.objects.includes(object)),
    );
    return sharedTopic?.title;
  }
  return undefined;
}

export function parsePromptIntent(prompt: string): PromptIntent {
  const raw = (prompt ?? "").trim();
  const craft = CUT_CREATE.test(raw);
  const literacy = LITERACY.test(raw);
  const science = SCIENCE.test(raw);
  const math = MATH.test(raw);

  // literacy wins over an incidental "count the letters" wording; science only
  // wins when the prompt is not clearly a counting request
  // ROUTING PRIORITY: an activity mechanic the teacher explicitly asked for
  // (Cut & Create) beats every inferred academic domain.
  // A weak literacy word ("handwriting") inside a clearly numeric request is
  // number formation, not phonics.
  const strongLiteracy =
    /\bletters?\b|\balphabet\b|phonic|phoneme|beginning sound|initial sound|first sound|\bvowels?\b|consonant|rhym|sight word|\babc\b|\bbegins? with\b|\bstarts? with\b/i.test(
      raw,
    );
  const domain: LearningDomain = craft
    ? "craft"
    : literacy && (!math || strongLiteracy)
      ? "literacy"
      : science && !math
        ? "science"
        : "math";
  const explicitDomain = craft || literacy || science || math;

  const intent: PromptIntent = { raw, domain, explicitDomain };

  const pages = raw.match(/(\d{1,2})\s*[- ]?pages?\b/i);
  if (pages) intent.pages = Math.max(1, Math.min(parseInt(pages[1]!, 10), 20));

  const level = ageByPhrase.find((a) => a.test.test(raw))?.level;
  if (level) intent.level = level;

  if (/\bvery easy|simplest|beginner\b/i.test(raw)) intent.difficulty = "Very Easy";
  else if (/\bchalleng|harder|advanced\b/i.test(raw)) intent.difficulty = "Challenge";
  else if (/\beasy\b/i.test(raw)) intent.difficulty = "Easy";

  if (/\bfrench|français|francais\b/i.test(raw)) intent.language = "French";
  else if (/\bspanish|español|espanol\b/i.test(raw)) intent.language = "Spanish";
  else if (/\barabic|عربي\b/i.test(raw)) intent.language = "Arabic";
  const activity = requestedActivity.find((rule) => rule.test.test(raw))?.activityType;
  if (activity) intent.activityType = activity;

  if (domain === "craft") {
    intent.skill = "Cut & Create";
    const theme = craftThemeFor(raw);
    intent.theme = theme.label;
    return intent;
  }

  if (domain === "literacy") {
    const letter = letterFromPrompt(raw);
    if (letter) intent.letter = letter;
    intent.skill = literacySkill.find((s) => s.test.test(raw))!.skill;
    if (intent.letter) intent.theme = `Letter ${intent.letter.toUpperCase()}`;
  } else {
    const theme = themeFromPrompt(raw);
    if (theme) intent.theme = theme;
    else if (/\bshapes?\b/i.test(raw)) intent.theme = "Shapes";
    if (domain === "science") intent.skill = "Science Thinking";
    else if (/\bpatterns?\b/i.test(raw)) intent.skill = "Patterns";
    else if (/\bshapes?\b/i.test(raw)) intent.skill = "Shapes";
    else if (/\bcount|how many|numbers?\b/i.test(raw)) intent.skill = "Counting";
  }

  return intent;
}

/** The letter a literacy worksheet practises. */
export function letterForSpec(spec: WorksheetSpec): string {
  const fromPrompt = parsePromptIntent(spec.prompt ?? "").letter;
  if (fromPrompt) return fromPrompt;
  const fromTheme = (spec.theme ?? "").match(/letter\s+([a-z])/i)?.[1];
  if (fromTheme) return fromTheme.toLowerCase();
  return illustratedLetters[1] ?? "b";
}

/**
 * Normalizes a spec against its prompt.
 *
 * Prompt-derived facts replace values the teacher never changed (the app
 * defaults). Anything explicitly selected in the UI — page count above all —
 * always wins.
 */
export function applyPromptIntent(spec: WorksheetSpec): WorksheetSpec {
  const prompt = spec.prompt ?? "";
  const namedPages = [...prompt.matchAll(/\bpage\s*(\d{1,2})\s*[:.)\-–—]/gi)].map((match) =>
    parseInt(match[1]!, 10),
  );
  const numberedPages = prompt
    .split(/\n/)
    .map((line) => line.trim().match(/^[-*•\s]*(\d{1,2})\s*[:.)\-–—]\s*\S/))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .map((match) => parseInt(match[1]!, 10));
  const explicitPageNumbers = [
    ...new Set([...namedPages, ...(numberedPages.length >= 2 ? numberedPages : [])]),
  ].filter((page) => page >= 1 && page <= 20);
  // A newly written page-by-page brief is a complete creator request. It must
  // not inherit an Idea Lab objective/mechanic from the screen that opened it.
  // Structured ids retain priority only when there is no explicit page plan.
  if ((spec.objectiveId || spec.mechanicId) && explicitPageNumbers.length === 0) return spec;
  const intent = parsePromptIntent(spec.prompt ?? "");
  if (!intent.raw) return spec;

  const requirements = parsePromptRequirements(intent.raw);
  // A page-by-page brief owns each activity position. A word such as "count"
  // on Page 2 is not a whole-pack Counting contract that can replace Page 1.
  if (explicitPageNumbers.length) delete requirements.requestedActivity;
  const out: WorksheetSpec = { ...spec, promptRequirements: requirements };
  if (explicitPageNumbers.length) {
    delete out.objectiveId;
    delete out.mechanicId;
    delete out.objective;
    delete out.activityMechanic;
    delete out.primarySkill;
    delete out.activityTitle;
    out.source = "creator";
    // The highest explicitly numbered page is authoritative even when the
    // Quick Create chip still displays its default value of 2 — but a teacher
    // who asked for more pages than they spelled out still gets them.
    const chosen = parseInt(spec.pages ?? "", 10);
    const spelledOut = Math.max(...explicitPageNumbers);
    out.pages = String(Number.isFinite(chosen) ? Math.max(chosen, spelledOut) : spelledOut);
    const requestedTopic = matchTheme(spec.prompt ?? "");
    if (requestedTopic) out.theme = requestedTopic.title;
  }
  if (intent.explicitDomain) {
    // The domain the prompt states must never be overruled by a stale value
    // left behind by an earlier generation (a phonics skill from the previous
    // request must not survive into a Cut & Create pack).
    // A non-empty new prompt is a fresh generation request. Prompt-derived
    // topic/skill replace values from the previous request in every domain,
    // not only literacy/craft. Explicit page-level directives still decide the
    // mechanics later in the planner.
    if (intent.skill) out.skill = intent.skill;
    if (intent.theme) out.theme = intent.theme;
  } else if (intent.theme) {
    out.theme = intent.theme;
  }

  // The prompt is primary: an explicit prompt fact beats a stale/default UI
  // choice, while a selected setting remains intact when the prompt is silent.
  if (!explicitPageNumbers.length && intent.pages) out.pages = String(intent.pages);
  if (intent.level) out.level = intent.level;
  if (intent.difficulty) out.difficulty = intent.difficulty;
  if (intent.language) out.language = intent.language;
  if (intent.activityType && !explicitPageNumbers.length) out.activityType = intent.activityType;
  if (requirements.visualConstraints.includes("black-and-white")) out.printing = "Black & White";
  else if (requirements.visualConstraints.includes("ink-saving")) out.printing = "Ink Saving";
  else if (requirements.visualConstraints.includes("color")) out.printing = "Color";
  if (/\b(?:us )?letter\b/i.test(intent.raw)) out.paper = "Letter";
  else if (/\ba5\b/i.test(intent.raw)) out.paper = "A5";

  return out;
}

/**
 * Quick Create is an open prompt surface: every non-empty current prompt starts
 * a fresh activity request. Unlike Advanced Create, it must not carry a prior
 * Idea Lab mechanic or a previous prompt's activity type into the preview or
 * renderer.
 */
export function applyQuickCreatePromptIntent(spec: WorksheetSpec): WorksheetSpec {
  const prompt = (spec.prompt ?? "").trim();
  const {
    objectiveId: _objectiveId,
    mechanicId: _mechanicId,
    objective: _objective,
    printableFormat: _printableFormat,
    subjectDomain: _subjectDomain,
    activityMechanic: _activityMechanic,
    primarySkill: _primarySkill,
    grouping: _grouping,
    activityTitle: _activityTitle,
    advancedActivityType: _advancedActivityType,
    promptRequirements: _promptRequirements,
    ...openSpec
  } = spec;
  // Clearing/replacing a prompt is a real state transition, not a moment where
  // the previous worksheet's activity contract may remain active. In
  // particular, browser "select all → type" interactions can briefly emit an
  // empty value before the new explicit activity wording arrives.
  if (!prompt) {
    return {
      ...openSpec,
      prompt: spec.prompt,
      source: "creator",
      activityType: defaultSpec.activityType,
    };
  }
  const currentRequest = { ...openSpec, source: "creator" as const };
  const normalized = applyPromptIntent(currentRequest);
  const hasExplicitPagePlan =
    /\bpage\s*(\d{1,2})\s*[:.)\-–—]/i.test(prompt) ||
    prompt.split(/\n/).filter((line) => /^[-*•\s]*\d{1,2}\s*[:.)\-–—]\s*\S/.test(line)).length >= 2;
  const activityType = hasExplicitPagePlan
    ? defaultSpec.activityType
    : (parsePromptIntent(prompt).activityType ?? defaultSpec.activityType);
  return normalized.activityType === activityType
    ? normalized
    : { ...normalized, activityType };
}

/**
 * The canonical Quick Create request. This is intentionally derived from the
 * current prompt each time it crosses a workflow boundary (preview, planning,
 * Studio, print, or export) so a completed worksheet can never become the
 * authority for the next request.
 */
export function canonicalQuickCreateRequest(spec: WorksheetSpec): WorksheetSpec {
  return applyQuickCreatePromptIntent({
    ...spec,
    source: "creator",
  });
}

/**
 * Replaces a Quick Create prompt as one atomic request transition. Consumers
 * must use this instead of only assigning `spec.prompt`: the previous
 * activityType can belong to a generated worksheet and must never outlive the
 * prompt that selected it.
 */
export function replaceQuickCreatePrompt(spec: WorksheetSpec, prompt: string): WorksheetSpec {
  return canonicalQuickCreateRequest({
    ...spec,
    prompt,
  });
}

/** The learning domain a (normalized) spec belongs to. */
export function domainForSpec(spec: WorksheetSpec): LearningDomain {
  // THE PROMPT IS THE SOURCE OF TRUTH: when the current prompt states a
  // domain, stale skill/theme values from an earlier request are ignored.
  const prompt = (spec.prompt ?? "").trim();
  if (prompt) {
    const fromPrompt = parsePromptIntent(prompt);
    if (fromPrompt.explicitDomain) return fromPrompt.domain;
  }
  const text = `${prompt} ${spec.skill ?? ""} ${spec.theme ?? ""} ${spec.activityType ?? ""}`;
  if (CUT_CREATE.test(text) || /cut ?& ?create|cut ?& ?paste|scissor/i.test(text)) return "craft";
  // A weak literacy word ("handwriting", "pre-writing") inside an otherwise
  // mathematical request is number formation, not phonics. Only an explicit
  // letter / sound / alphabet signal makes a pack literacy.
  if (LITERACY.test(text)) {
    const strongLiteracy =
      /\bletters?\b|\balphabet\b|phonic|phoneme|beginning sound|initial sound|first sound|\bvowels?\b|consonant|rhym|sight word|\babc\b|\bbegins? with\b|\bstarts? with\b/i;
    if (!MATH.test(text) || strongLiteracy.test(text)) return "literacy";
  }
  if (SCIENCE.test(text) && !MATH.test(text)) return "science";
  return "math";
}

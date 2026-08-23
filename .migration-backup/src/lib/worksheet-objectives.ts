/**
 * Learning-objective preservation layer.
 *
 * An idea created in the Idea Lab carries a learning objective and an activity
 * mechanic ("More & Fewer", "Compare"). Historically the Creator only knew two
 * printable mechanics (count & match, count & circle), so every objective
 * silently collapsed into generic counting. This module resolves the mechanic
 * a worksheet MUST practise, from (in priority order):
 *
 *   1. the structured objective / mechanic ids carried by the idea,
 *   2. explicit wording in the teacher's prompt,
 *   3. the selected skill + activity type.
 *
 * The resolved mechanic is stamped onto the generated activity and re-checked
 * by validation, so an objective can never be lost between idea and printable.
 */

import type { WorksheetSpec } from "./creator-options";
import { CUT_CREATE, domainForSpec, type LearningDomain } from "./learning-domains";
import type { WorksheetActivity, WorksheetMechanicId } from "./worksheet-model";

export type ObjectiveProfile = {
  mechanic: WorksheetMechanicId;
  /** child-facing name of the printable activity */
  activityLabel: string;
  /** the learning objective this page must assess */
  objective: string;
  /** activity kinds this mechanic is allowed to render as */
  kinds: Array<WorksheetActivity["kind"]>;
  /** variant used by comparison mechanics: more/fewer, big/small, same/different */
  variant?: "more" | "fewer" | "bigger" | "smaller" | "same" | "different";
};

const profiles: Record<WorksheetMechanicId, Omit<ObjectiveProfile, "variant">> = {
  "find-target": {
    mechanic: "find-target",
    activityLabel: "Find",
    objective: "Find a target shape among distractors.",
    kinds: ["find-target"],
  },
  "match-pairs": {
    mechanic: "match-pairs",
    activityLabel: "Match",
    objective: "Match corresponding shapes.",
    kinds: ["match-pairs"],
  },
  "trace-draw": {
    mechanic: "trace-draw",
    activityLabel: "Trace & Draw",
    objective: "Trace and independently draw shapes.",
    kinds: ["trace-draw"],
  },
  "count-match": {
    mechanic: "count-match",
    activityLabel: "Count & Match",
    objective: "Count a quantity and match it to the written numeral.",
    kinds: ["count-match"],
  },
  "count-circle": {
    mechanic: "count-circle",
    activityLabel: "Count & Circle",
    objective: "Count a quantity and recognise the numeral that matches it.",
    kinds: ["count-circle"],
  },
  "compare-quantity": {
    mechanic: "compare-quantity",
    activityLabel: "More & Fewer",
    objective: "Compare two quantities and identify which group has more or fewer.",
    kinds: ["pick-one"],
  },
  "compare-size": {
    mechanic: "compare-size",
    activityLabel: "Big & Small",
    objective: "Compare two objects and identify which is bigger or smaller.",
    kinds: ["pick-one"],
  },
  "same-different": {
    mechanic: "same-different",
    activityLabel: "Same & Different",
    objective:
      "Look closely and decide which picture is the same as — or different from — the others.",
    kinds: ["pick-one"],
  },
  "beginning-sound": {
    mechanic: "beginning-sound",
    activityLabel: "Beginning Sounds",
    objective: "Hear and identify the first sound of familiar words.",
    kinds: ["pick-one"],
  },
  "beginning-sound-discrimination": {
    mechanic: "beginning-sound-discrimination",
    activityLabel: "Beginning Sound Pictures",
    objective: "Say each picture name and decide whether it begins with the target sound.",
    kinds: ["sound-hunt"],
  },
  "pattern-complete": {
    mechanic: "pattern-complete",
    activityLabel: "Complete the Pattern",
    objective: "Read a repeating pattern and choose the picture that comes next.",
    kinds: ["pick-one"],
  },
  "sequence-order": {
    mechanic: "sequence-order",
    activityLabel: "Put in Order",
    objective: "Put pictures in the correct order and explain the sequence.",
    kinds: ["sequence-stages", "order-sequence"],
  },
  "find-and-count": {
    mechanic: "find-and-count",
    activityLabel: "Find & Count",
    objective: "Search a simple scene, find every target object and count them.",
    kinds: ["find-count"],
  },
  "sort-attribute": {
    mechanic: "sort-attribute",
    activityLabel: "Sort the Pictures",
    objective: "Sort mixed pictures into two clearly labelled groups.",
    kinds: ["sort-groups"],
  },
  "letter-recognition": {
    mechanic: "letter-recognition",
    activityLabel: "Find the Letter",
    objective: "Recognise a target letter in upper and lower case.",
    kinds: ["letter-search"],
  },
  "letter-trace": {
    mechanic: "letter-trace",
    activityLabel: "Trace the Letter",
    objective: "Form a letter correctly in upper and lower case.",
    kinds: ["letter-trace"],
  },
  "letter-write": {
    mechanic: "letter-write",
    activityLabel: "Write the Letter",
    objective: "Write a letter independently, without tracing guides.",
    kinds: ["letter-trace"],
  },
  "number-write": {
    mechanic: "number-write",
    activityLabel: "Trace & Write Numbers",
    objective: "Trace dotted numerals and then write the numbers independently.",
    kinds: ["letter-trace"],
  },
  "letter-sort": {
    mechanic: "letter-sort",
    activityLabel: "Sort by First Sound",
    objective: "Sort pictures by the first sound of their name.",
    kinds: ["sort-groups"],
  },
  "picture-letter-match": {
    mechanic: "picture-letter-match",
    activityLabel: "Match to the Letter",
    objective: "Match each picture to the letter its name begins with.",
    kinds: ["picture-letter-match"],
  },
  "word-initial-complete": {
    mechanic: "word-initial-complete",
    activityLabel: "Complete the Word",
    objective: "Complete each word by writing its missing first letter.",
    kinds: ["word-complete"],
  },
  "memory-pairs": {
    mechanic: "memory-pairs",
    activityLabel: "Memory Pairs",
    objective: "Learn and recall theme vocabulary by finding identical picture pairs.",
    kinds: ["memory-pairs"],
  },
  "cut-create-build": {
    mechanic: "cut-create-build",
    activityLabel: "Cut & Create",
    objective:
      "Cut along clear boundaries and build a chosen scene — creative construction and fine motor control.",
    kinds: ["cut-create"],
  },
  "cut-create-scene": {
    mechanic: "cut-create-scene",
    activityLabel: "Cut & Create",
    objective: "Arrange and glue cut-out pieces to compose an original scene.",
    kinds: ["cut-create"],
  },
  "cut-create-count": {
    mechanic: "cut-create-count",
    activityLabel: "Cut & Create",
    objective: "Cut out an exact quantity of pieces and glue them into the scene.",
    kinds: ["cut-create"],
  },
};

/** Mechanics that belong to each learning domain. */
export const mechanicsByDomain: Record<LearningDomain, WorksheetMechanicId[]> = {
  craft: ["cut-create-build", "cut-create-scene", "cut-create-count"],
  literacy: [
    "letter-recognition",
    "letter-trace",
    "letter-write",
    "beginning-sound-discrimination",
    "beginning-sound",
    "picture-letter-match",
    "word-initial-complete",
    "letter-sort",
  ],
  science: ["sort-attribute", "find-and-count", "same-different", "sequence-order"],
  math: [
    "find-target",
    "match-pairs",
    "trace-draw",
    "count-match",
    "count-circle",
    "compare-quantity",
    "compare-size",
    "pattern-complete",
    "sequence-order",
    "find-and-count",
    "sort-attribute",
    "same-different",
    "number-write",
  ],
};

/** True when a mechanic serves any subject (a card game, not a domain skill). */
export function isCrossDomainMechanic(mechanic: WorksheetMechanicId) {
  return mechanic === "memory-pairs";
}

export function domainOfMechanic(mechanic: WorksheetMechanicId): LearningDomain {
  if (mechanicsByDomain.craft.includes(mechanic)) return "craft";
  if (mechanicsByDomain.literacy.includes(mechanic)) return "literacy";
  return "math";
}

/** Idea Lab learning-objective ids → printable mechanic. */
const byObjectiveId: Record<string, WorksheetMechanicId> = {
  "compare-quantity": "compare-quantity",
  "sorting-size": "compare-size",
  "visual-attention": "same-different",
  symmetry: "same-different",
  "beginning-sounds": "beginning-sound",
  rhyming: "beginning-sound",
  "patterns-ab": "pattern-complete",
  "life-cycle": "sequence-order",
  "story-retell": "sequence-order",
  "seasonal-change": "sequence-order",
  "kindness-choices": "sequence-order",
  "number-recognition": "count-match",
  "count-10": "count-circle",
};

/**
 * MECHANIC ROUTER — Idea Lab activity-mechanic ids → printable mechanic.
 *
 * The mechanic answers "what does the CHILD DO?" and therefore outranks the
 * theme entirely. Anything missing here is resolved by
 * `nearestMechanicForDomain`, never by silently falling back to counting.
 */
const byMechanicId: Record<string, WorksheetMechanicId> = {
  compare: "compare-quantity",
  pattern: "pattern-complete",
  sequence: "sequence-order",
  "story-sequence": "sequence-order",
  "spot-difference": "same-different",
  "visual-discrimination": "same-different",
  "count-circle": "count-circle",
  match: "count-match",
  memory: "memory-pairs",
  bingo: "memory-pairs",
  sort: "sort-attribute",
  classify: "sort-attribute",
  find: "find-and-count",
  observe: "find-and-count",
  trace: "letter-trace",
  maze: "letter-trace",
  "cut-paste": "cut-create-build",
  "beginning-sound-discrimination": "beginning-sound-discrimination",
};

/** Mechanics that serve every subject: a card game is neither math nor literacy. */
export const crossDomainMechanics: WorksheetMechanicId[] = ["memory-pairs"];

/** Idea Lab subject → learning domain. Never inferred from the theme. */
const domainBySubject: Record<string, LearningDomain> = {
  "Early Math": "math",
  "Early Literacy": "literacy",
  "Fine Motor": "craft",
  Science: "science",
  Nature: "science",
  "Seasonal Learning": "science",
  SEL: "science",
  "Problem Solving": "math",
  "Creative Thinking": "science",
};

export function domainForSubject(subject?: string): LearningDomain | undefined {
  if (!subject) return undefined;
  return domainBySubject[subject];
}

/**
 * The closest educationally equivalent mechanic when a requested activity has
 * no dedicated renderer yet. Counting is only ever reachable from a maths
 * objective — a literacy or science request can never land on it.
 */
export function nearestMechanicForDomain(domain: LearningDomain): WorksheetMechanicId {
  switch (domain) {
    case "craft":
      return "cut-create-build";
    case "literacy":
      return "letter-recognition";
    case "science":
      return "sort-attribute";
    default:
      return "count-match";
  }
}

/** Explicit teacher wording, checked before generic skill mapping. */
const byPrompt: Array<{ test: RegExp; mechanic: WorksheetMechanicId }> = [
  // CRAFT FIRST — an explicitly requested activity mechanic always outranks a
  // domain inferred from the object names inside the theme.
  { test: CUT_CREATE, mechanic: "cut-create-build" },
  {
    test: /memory (pairs?|game|cards?)|matching cards|pairs game|concentration game/i,
    mechanic: "memory-pairs",
  },
  {
    test: /\bmore\b.*\bfewer\b|\bfewer\b.*\bmore\b|more or less|which group has more|compare (two )?(quantit|group|amount)/i,
    mechanic: "compare-quantity",
  },
  {
    test: /\bbig(ger)?\b.*\bsmall(er)?\b|\bsmall(er)?\b.*\bbig(ger)?\b|\btall(er)?\b.*\bshort(er)?\b|compare sizes?/i,
    mechanic: "compare-size",
  },
  {
    test: /same (and|or|vs\.?|versus) different|which one is the same|odd one out|spot the difference/i,
    mechanic: "same-different",
  },
  {
    test: /trace the letters?|letter tracing|handwriting|write the letters?|pre-?writing/i,
    mechanic: "letter-trace",
  },
  {
    test: /sort .*(letters?|sounds?)|letter sort|sort by (first )?(sound|letter)/i,
    mechanic: "letter-sort",
  },
  {
    test: /sort (the )?(pictures?|animals?|objects?|shapes?|cards?|items?)|sort .* into|sorting activity|group the (pictures?|animals?|objects?)|classify/i,
    mechanic: "sort-attribute",
  },
  {
    test: /circle (the )?pictures?[^.]*\b(begin|start)/i,
    mechanic: "beginning-sound-discrimination",
  },
  {
    test: /pictures? whose names? (begin|start)|pictures? that (begin|start) with|words? that (begin|start) with the sound/i,
    mechanic: "beginning-sound-discrimination",
  },
  {
    test: /beginning sound|initial sound|first sound|starts? with the letter/i,
    mechanic: "beginning-sound",
  },
  {
    test: /find the letters?|circle the letters?|letter recognition|recogni[sz]e the letters?|identify the letters?|uppercase|lowercase|alphabet/i,
    mechanic: "letter-recognition",
  },
  {
    test: /complete the pattern|what comes next|ab pattern|abc pattern|repeating pattern|\bpatterns?\b/i,
    mechanic: "pattern-complete",
  },
  {
    test: /put .* in order|sequenc(e|ing)|first,? then,? last|order the (pictures|stages|steps)|life cycle/i,
    mechanic: "sequence-order",
  },
  {
    test: /match (the )?(quantity|number|numeral)|draw a line to the (correct )?number|quantity[- ]to[- ]number/i,
    mechanic: "count-match",
  },
  { test: /circle the (correct )?number|count and circle/i, mechanic: "count-circle" },
];

function variantFor(mechanic: WorksheetMechanicId, text: string): ObjectiveProfile["variant"] {
  const t = text.toLowerCase();
  if (mechanic === "compare-quantity")
    return /\bfewer\b|\bless\b|fewest|smallest group/.test(t) && !/\bmore\b/.test(t)
      ? "fewer"
      : "more";
  if (mechanic === "compare-size")
    return /\bsmaller\b|\bsmallest\b|\bsmall\b/.test(t) && !/\bbigger\b|\bbiggest\b/.test(t)
      ? "smaller"
      : "bigger";
  if (mechanic === "same-different")
    return /different|odd one out|not the same/.test(t) ? "different" : "same";
  return undefined;
}

/**
 * The mechanic the teacher asked for IN WORDS.
 *
 * An explicitly requested activity ("put these in order", "memory pairs") is a
 * contract for the WHOLE pack, not just page 1 — later pages may vary content,
 * never the mechanic.
 */
export function promptRequestsMechanic(spec: WorksheetSpec): WorksheetMechanicId | undefined {
  const text = `${spec.prompt ?? ""} ${spec.objective ?? ""} ${spec.skill ?? ""} ${spec.activityType ?? ""}`;
  const matched = new Set(
    byPrompt.filter((rule) => rule.test.test(text)).map((rule) => rule.mechanic),
  );
  // a prompt that lists several activities ("recognition, tracing, sorting…")
  // is a request for VARIETY, not a single-mechanic contract
  return matched.size === 1 ? [...matched][0] : undefined;
}

/** True when the spec came from a structured Idea Lab idea. */
export function specHasObjective(spec: WorksheetSpec) {
  return Boolean(spec.objectiveId || spec.mechanicId);
}

export function resolveObjectiveProfile(spec: WorksheetSpec): ObjectiveProfile {
  const text = `${spec.prompt ?? ""} ${spec.skill ?? ""} ${spec.activityType ?? ""}`;

  let mechanic: WorksheetMechanicId | undefined;

  // 1. structured idea ids — the strongest signal
  if (spec.objectiveId && byObjectiveId[spec.objectiveId]) {
    mechanic = byObjectiveId[spec.objectiveId];
    // an objective that supports several printable mechanics respects the
    // mechanic the teacher picked (e.g. "Counting to 10" + Match)
    if (
      (spec.objectiveId === "count-10" || spec.objectiveId === "number-recognition") &&
      spec.mechanicId &&
      byMechanicId[spec.mechanicId] &&
      mechanicsByDomain.math.includes(byMechanicId[spec.mechanicId]!)
    ) {
      mechanic = byMechanicId[spec.mechanicId];
    }
  }
  if (!mechanic && spec.mechanicId && byMechanicId[spec.mechanicId]) {
    mechanic = byMechanicId[spec.mechanicId];
  }

  // 2. explicit teacher wording
  if (!mechanic) {
    mechanic = byPrompt.find((rule) => rule.test.test(text))?.mechanic;
  }

  // 3. skill / activity type fallback (previous behaviour)
  if (!mechanic) {
    const t = `${spec.activityType} ${spec.skill}`.toLowerCase();
    if (/pattern/.test(t)) mechanic = "pattern-complete";
    else if (/sequenc/.test(t)) mechanic = "sequence-order";
    else if (/phonic|alphabet/.test(t)) mechanic = "beginning-sound";
    else if (/visual discrimination|find the difference/.test(t)) mechanic = "same-different";
    else if (/match|connect|puzzle|line/.test(t)) mechanic = "count-match";
    else if (/circle|i spy|find|bingo|recognition/.test(t)) mechanic = "count-circle";
  }

  // 4. DOMAIN GUARD — counting is NEVER a universal fallback. A structured
  // idea carries its own subject domain, so an Early Literacy card game can
  // never collapse into a counting page just because its theme is drawable.
  const structured = Boolean(spec.objectiveId || spec.mechanicId);
  const domain = structured
    ? (domainForSubject(spec.subjectDomain) ?? "math")
    : domainForSpec(spec);
  let resolved = mechanic ?? nearestMechanicForDomain(domain);
  if (
    !structured &&
    !crossDomainMechanics.includes(resolved) &&
    !mechanicsByDomain[domain].includes(resolved)
  ) {
    resolved = mechanicsByDomain[domain][0]!;
  }
  const base = profiles[resolved];
  const variant = variantFor(resolved, text);
  return variant ? { ...base, variant } : { ...base };
}

/** Every activity kind the requested objective permits. */
export function allowedKindsFor(spec: WorksheetSpec): Array<WorksheetActivity["kind"]> {
  const profile = resolveObjectiveProfile(spec);
  if (profile.mechanic === "count-match" || profile.mechanic === "count-circle") {
    // Structured Idea Lab metadata is an exact contract. A selected Count &
    // Circle mechanic must not alternate with a generic matching page.
    if (specHasObjective(spec)) return profile.kinds;
    // generic counting requests may mix both classic counting pages
    const t = `${spec.activityType} ${spec.skill} ${spec.prompt ?? ""}`.toLowerCase();
    if (/match|connect|puzzle|line/.test(t)) return ["count-match"];
    if (/circle|i spy|find|bingo|recognition/.test(t)) return ["count-circle"];
    return ["count-match", "count-circle"];
  }
  return profile.kinds;
}

/**
 * Profile for one explicitly planned mechanic (used by multi-page variety).
 * The variant (more/fewer, big/small…) still follows the teacher's wording.
 */
export function profileForMechanic(
  mechanic: WorksheetMechanicId,
  spec: WorksheetSpec,
): ObjectiveProfile {
  const text = `${spec.prompt ?? ""} ${spec.skill ?? ""} ${spec.activityType ?? ""}`;
  const variant = variantFor(mechanic, text);
  const base = profiles[mechanic];
  return variant ? { ...base, variant } : { ...base };
}

export function mechanicOfActivity(activity: WorksheetActivity): WorksheetMechanicId {
  if (activity.kind === "count-match" || activity.kind === "count-circle") return activity.kind;
  return activity.mechanic;
}

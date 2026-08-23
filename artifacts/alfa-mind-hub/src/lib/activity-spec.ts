/**
 * ActivitySpec — the complete contract handed from Idea Lab to the Creator.
 *
 * THEME determines the visual world.
 * LEARNING OBJECTIVE determines what is taught.
 * MECHANIC determines what the child does.
 * AGE determines complexity.
 * FORMAT determines page composition.
 *
 * Nothing downstream may reconstruct these from the theme alone.
 */

import type { WorksheetSpec } from "./creator-options";
import type { WorksheetMechanicId, WorksheetProject } from "./worksheet-model";
import {
  domainForSubject,
  isCrossDomainMechanic,
  mechanicOfActivity,
  resolveObjectiveProfile,
} from "./worksheet-objectives";

export type ActivitySpec = {
  subjectDomain: string;
  theme: string;
  title: string;
  learningObjective: string;
  primarySkill: string;
  /** canonical printable mechanic */
  activityMechanic: WorksheetMechanicId;
  activityFormat: string;
  ageBand: string;
  difficulty: string;
  duration: string;
  grouping: string;
  suggestedPageCount: number;
  source: "idea-lab";
};

/** The mechanic the source activity contracted for. */
export function contractedMechanic(spec: WorksheetSpec): WorksheetMechanicId | undefined {
  if (spec.activityMechanic) return spec.activityMechanic as WorksheetMechanicId;
  if (spec.objectiveId || spec.mechanicId) return resolveObjectiveProfile(spec).mechanic;
  return undefined;
}

export type HandoffIssue = { code: string; message: string };

/**
 * HANDOFF CONTRACT VALIDATION.
 *
 * Compares the source activity specification with what was actually generated.
 * A mechanic or subject-domain drift is a hard failure — the worksheet must
 * not be rendered.
 */
export function validateHandoffContract(
  spec: WorksheetSpec,
  project: WorksheetProject,
): HandoffIssue[] {
  const expected = contractedMechanic(spec);
  if (!expected) return [];
  const issues: HandoffIssue[] = [];

  for (const page of project.pages) {
    const actual = mechanicOfActivity(page.activity);
    if (actual !== expected) {
      issues.push({
        code: "handoff-mechanic-drift",
        message: `${page.id}: source activity requires "${expected}" but the page renders "${actual}".`,
      });
      continue;
    }
    // Counting is the historic silent default, so it is the one drift worth
    // failing on: a literacy or science activity may never become a counting
    // page. Mechanics shared across domains (sorting, sequencing, memory) are
    // legitimate for any subject.
    const sourceDomain = domainForSubject(spec.subjectDomain);
    const counting = actual === "count-match" || actual === "count-circle";
    if (sourceDomain && sourceDomain !== "math" && counting && !isCrossDomainMechanic(actual)) {
      issues.push({
        code: "handoff-domain-drift",
        message: `${page.id}: source subject is ${spec.subjectDomain} (${sourceDomain}) but the page renders a counting activity.`,
      });
    }
  }
  return issues;
}

/* ------------------------------------------------------- multi-skill parsing */

/**
 * REQUESTED SKILLS.
 *
 * A single prompt often asks for several distinct skills ("identify uppercase
 * B and lowercase b, trace B and b, and circle pictures whose names begin with
 * /b/"). Collapsing that into one mechanic silently drops teaching content, so
 * every explicitly worded skill is parsed out and the planner must cover them
 * all.
 *
 * Skills are modelled separately on purpose: finding B among E, F and D is
 * VISUAL letter recognition; circling ball, bear and bird among cat and sun is
 * PHONEMIC discrimination. They are never treated as the same request.
 */
const skillRules: Array<{ mechanic: WorksheetMechanicId; test: RegExp }> = [
  {
    mechanic: "letter-trace",
    test: /\btrac(e|ing)\b|handwriting|write the letters?|pre-?writing|letter formation/i,
  },
  {
    mechanic: "beginning-sound-discrimination",
    test: /circle (the )?pictures?[^.]*\b(begin|start)|pictures? whose names? (begin|start)|pictures? that (begin|start) with|words? that (begin|start) with|beginning sounds?|initial sounds?|\/[a-z]\/ ?sound/i,
  },
  {
    mechanic: "letter-recognition",
    test: /upper ?case|lower ?case|capital and small|find the letters?|identify (the )?(upper|lower|letters?)|letter recognition|recogni[sz]e the letters?/i,
  },
  {
    mechanic: "letter-sort",
    test: /sort .*(letters?|sounds?)|sort by (first )?(sound|letter)/i,
  },
];

/** Order the pack teaches in: introduce & form the letter, then use its sound. */
const skillTeachingOrder: WorksheetMechanicId[] = [
  "letter-trace",
  "beginning-sound-discrimination",
  "letter-recognition",
  "letter-sort",
];

export function parseRequestedSkills(spec: WorksheetSpec): WorksheetMechanicId[] {
  const text = `${spec.prompt ?? ""} ${spec.objective ?? ""} ${spec.skill ?? ""} ${spec.activityType ?? ""}`;
  // "Trace and write numbers" is numeral formation, even though it shares
  // handwriting vocabulary with letter tracing. Route it before the broad
  // literacy rules so planning and validation stay in the maths domain.
  const numericHandwriting =
    /\b(?:numbers?|numerals?|digits?)\b/i.test(text) &&
    /\b(?:trace|tracing|handwriting|write|writing)\b/i.test(text) &&
    !/\bletters?\b|\balphabet\b|phonic|phoneme/i.test(text);
  if (numericHandwriting) return ["number-write"];
  const found = new Set(skillRules.filter((rule) => rule.test.test(text)).map((r) => r.mechanic));
  return skillTeachingOrder.filter((mechanic) => found.has(mechanic));
}

/**
 * COVERAGE VALIDATION — every explicitly requested skill must appear in the
 * finished pack (a page may teach more than one, e.g. a tracing page that also
 * introduces upper and lower case).
 */
export function uncoveredSkills(
  spec: WorksheetSpec,
  project: WorksheetProject,
): WorksheetMechanicId[] {
  const requested = parseRequestedSkills(spec);
  if (requested.length < 2) return [];
  const covered = new Set<WorksheetMechanicId>();
  for (const page of project.pages) {
    covered.add(mechanicOfActivity(page.activity));
    for (const skill of page.coveredSkills ?? []) covered.add(skill);
  }
  return requested.filter((skill) => !covered.has(skill));
}

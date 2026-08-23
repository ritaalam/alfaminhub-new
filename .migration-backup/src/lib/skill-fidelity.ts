/**
 * SKILL FIDELITY — the explicitly requested educational skill is a hard
 * constraint on the whole pack.
 *
 *   THEME     = what children see        (insects, ocean, letter B)
 *   SKILL     = what children practise   (counting / quantity)
 *   MECHANIC  = how they practise it     (count & match, count & circle…)
 *   VISUALS   = presentation only
 *
 * "Each page should use a different activity" means a different MECHANIC for
 * the SAME skill — never a different cognitive skill. So a counting/quantity
 * request may never silently rotate into size comparison, patterns,
 * sequencing, phonics, memory or sorting.
 *
 * This module is domain-generic: every mechanic declares one skill family, the
 * prompt is parsed for the skill families it explicitly asks for, and both the
 * planner (before generation) and the validator (before rendering) intersect
 * the two.
 */

import type { WorksheetSpec } from "./creator-options";
import type { WorksheetMechanicId, WorksheetProject } from "./worksheet-model";
import { directiveMechanics } from "./page-directives";
import { mechanicRegistry } from "./mechanic-registry";
import {
  mechanicOfActivity,
  resolveObjectiveProfile,
  specHasObjective,
} from "./worksheet-objectives";

export type SkillFamily =
  | "quantity"
  | "size"
  | "patterns"
  | "sequencing"
  | "sorting"
  | "visual-discrimination"
  | "letters"
  | "phonemic-awareness"
  | "memory"
  | "craft";

/** The cognitive skill each mechanic actually practises. */
const skillFamilyByMechanic: Record<WorksheetMechanicId, SkillFamily> = {
  "find-target": "visual-discrimination",
  "match-pairs": "visual-discrimination",
  "trace-draw": "visual-discrimination",
  "count-match": "quantity",
  "count-circle": "quantity",
  "compare-quantity": "quantity",
  "find-and-count": "quantity",
  "compare-size": "size",
  "pattern-complete": "patterns",
  "sequence-order": "sequencing",
  "sort-attribute": "sorting",
  "same-different": "visual-discrimination",
  "letter-recognition": "letters",
  "letter-trace": "letters",
  "letter-write": "letters",
  "number-write": "quantity",
  "beginning-sound": "phonemic-awareness",
  "beginning-sound-discrimination": "phonemic-awareness",
  "letter-sort": "phonemic-awareness",
  "picture-letter-match": "phonemic-awareness",
  "word-initial-complete": "letters",
  "memory-pairs": "memory",
  "cut-create-build": "craft",
  "cut-create-scene": "craft",
  "cut-create-count": "craft",
};

export function skillFamilyOfMechanic(mechanic: WorksheetMechanicId): SkillFamily {
  return skillFamilyByMechanic[mechanic];
}

export function mechanicsInFamilies(families: SkillFamily[]): WorksheetMechanicId[] {
  const set = new Set(families);
  return (Object.keys(mechanicRegistry) as WorksheetMechanicId[]).filter((mechanic) =>
    set.has(skillFamilyOfMechanic(mechanic)),
  );
}

/**
 * Skill families the teacher explicitly asked for. Only explicit wording
 * counts — a theme ("insects", "ocean") never selects a skill.
 */
const familyRules: Array<{ family: SkillFamily; test: RegExp }> = [
  {
    family: "quantity",
    test: /\bcount(ing|s)?\b|\bquantit(y|ies)\b|how many|\bnumeral|number sense|numbers? to \d|more (or|and|&) fewer|fewer (or|and) more|\bnumber recognition\b|one-to-one|add(ition|ing)?\b|subtract(ion|ing)?\b|\bsum(s)?\b/i,
  },
  {
    family: "size",
    test: /\bsizes?\b|big(ger)? (and|or|vs\.?) small|small (and|or) big|\btall(er)? (and|or) short|long(er)? (and|or) short/i,
  },
  { family: "patterns", test: /\bpatterns?\b|\bab ?ab\b|what comes next/i },
  {
    family: "sequencing",
    test: /\bsequenc(e|ing)\b|life ?cycle|put .{0,30}in (the )?(correct )?order|order the (stages|steps|pictures)|first.{0,20}then.{0,20}last|story order/i,
  },
  {
    family: "sorting",
    test: /\bsort(ing)?\b|classif(y|ication)|categor(y|ise|ize|ies)|group (them|the) .* by/i,
  },
  {
    family: "visual-discrimination",
    test: /same (and|or) different|odd one out|which one is different|matching pictures/i,
  },
  {
    family: "letters",
    test: /\bletters?\b|\balphabet\b|upper ?case|lower ?case|trac(e|ing)\b|handwriting|letter formation|pre-?writing/i,
  },
  {
    family: "phonemic-awareness",
    test: /phonics|phoneme|phonemic|beginning sounds?|initial sounds?|\/[a-z]\/ ?sound|(words?|pictures?) (whose names? )?(that )?(begin|start)s? with/i,
  },
  { family: "memory", test: /\bmemory (pairs|game|cards?)\b|concentration game/i },
  { family: "craft", test: /cut (and|&) (create|paste|glue)|cut-?outs?|scissor|\bcraft\b|glue/i },
];

export function parseRequestedSkillFamilies(spec: WorksheetSpec): SkillFamily[] {
  // A structured request (Idea Lab objective / explicit mechanic id) IS the
  // requested skill. Its family outranks any wording the prompt inherited.
  if (specHasObjective(spec)) {
    return [skillFamilyOfMechanic(resolveObjectiveProfile(spec).mechanic)];
  }
  // The written prompt is the source of truth. The dropdown skill/activity
  // fields only speak when the teacher wrote nothing — otherwise a leftover
  // default ("Counting") would silently re-open a skill the prompt excluded.
  const written = [spec.prompt, spec.objective].filter(Boolean).join(" ").trim();
  const text = written || [spec.skill, spec.activityType].filter(Boolean).join(" ");
  if (!text.trim()) return [];
  // A negated clause ("this is a phonics activity, not counting") asks for the
  // OPPOSITE of that skill, so it must never register as a request.
  const positive = text.replace(
    /\b(not|never|no|rather than|instead of|avoid|without)\b[^.;,!?]*/gi,
    " ",
  );
  return familyRules.filter((rule) => rule.test.test(positive)).map((rule) => rule.family);
}

/**
 * The mechanics a pack is allowed to use once the explicitly requested skills
 * are applied. When the prompt names no skill at all, nothing is narrowed.
 */
export function narrowMechanicsToRequestedSkills(
  mechanics: WorksheetMechanicId[],
  families: SkillFamily[],
): WorksheetMechanicId[] {
  if (!families.length) return mechanics;
  const set = new Set(families);
  const narrowed = mechanics.filter((mechanic) => set.has(skillFamilyOfMechanic(mechanic)));
  if (narrowed.length) return narrowed;
  // The requested skill lives outside the domain pool (a memory game inside a
  // maths domain). The SKILL still wins — fall back to that family's mechanics.
  const byFamily = mechanicsInFamilies(families);
  return byFamily.length ? byFamily : mechanics;
}

export type SkillFidelityIssue = { code: string; message: string };

/**
 * PRE-RENDER SKILL CHECK — every page must practise a requested skill family.
 * A page that introduces an unrequested cognitive skill is an error, so the
 * generator regenerates instead of printing it.
 */
export function skillFidelityIssues(
  spec: WorksheetSpec,
  project: WorksheetProject,
): SkillFidelityIssue[] {
  const families = parseRequestedSkillFamilies(spec);
  if (!families.length) return [];
  const allowed = new Set(families);
  // A mechanic the teacher named page by page is requested by definition, so
  // its skill family is allowed wherever the pack uses it.
  const specified = new Set(directiveMechanics(spec));
  for (const mechanic of specified) {
    const family = skillFamilyOfMechanic(mechanic);
    if (family) allowed.add(family);
  }
  const issues: SkillFidelityIssue[] = [];
  for (const page of project.pages) {
    const mechanic = mechanicOfActivity(page.activity);
    const family = skillFamilyOfMechanic(mechanic);
    if (family && !allowed.has(family)) {
      issues.push({
        code: "skill-drift",
        message: `${page.id}: "${mechanicRegistry[mechanic].label}" practises ${family}, but the request asked for ${families.join(", ")}.`,
      });
    }
  }
  return issues;
}

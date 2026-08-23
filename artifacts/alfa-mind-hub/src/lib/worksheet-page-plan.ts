/**
 * Multi-page composition planner.
 *
 * A worksheet pack must feel designed, not duplicated: two butterfly counting
 * pages should practise the same objective through DIFFERENT activities
 * (count & match, then count & circle, then a small pattern challenge…).
 *
 * The planner decides the mechanic of every page BEFORE any content is built,
 * so the builder, the allowed-kind validation and the answer key all read the
 * same plan. Age gating lives here too: a 2–3 year old pack never rotates into
 * sequencing or beginning sounds.
 */

import { resolveAgeTokens } from "./age-tokens";
import type { WorksheetSpec } from "./creator-options";
import {
  isCrossDomainMechanic,
  resolveObjectiveProfile,
  specHasObjective,
  type ObjectiveProfile,
} from "./worksheet-objectives";
import { familyOfMechanic, kindsForMechanic, mechanicRegistry } from "./mechanic-registry";

const allMechanics = Object.keys(mechanicRegistry) as WorksheetMechanicId[];
import { mechanicsByDomain, promptRequestsMechanic } from "./worksheet-objectives";
import { domainForSpec } from "./learning-domains";
import {
  advancedActivityMechanicFor,
  isAdvancedActivityTypeLocked,
  isPromptActivityTypeLocked,
  promptActivityMechanicFor,
  rendererMechanicFor,
} from "./worksheet-renderer-support";
import { parseRequestedSkills } from "./activity-spec";
import { parsePageDirectives } from "./page-directives";
import {
  narrowMechanicsToRequestedSkills,
  parseRequestedSkillFamilies,
  skillFamilyOfMechanic,
} from "./skill-fidelity";
import type { WorksheetActivity, WorksheetMechanicId } from "./worksheet-model";

/**
 * Mechanics each age band is developmentally ready for, in the order a teacher
 * would sequence them across a pack: the core counting work first, then a
 * genuinely different composition each time.
 */
export function mechanicsAllowedForAge(level: string): WorksheetMechanicId[] {
  return [...new Set(resolveAgeTokens(level).allowedMechanics.map(rendererMechanicFor))];
}

/**
 * Mechanics a pack may use: the domain the prompt asked for, narrowed by what
 * the age band is ready for AND by the skills the teacher explicitly asked
 * for. A phonics pack only ever rotates through letter work; a counting pack
 * only ever rotates through quantity work.
 */
export function mechanicsAllowedFor(spec: WorksheetSpec): WorksheetMechanicId[] {
  const contracted = resolveObjectiveProfile(spec).mechanic;
  // Advanced Create has one selected child interaction. It may vary content
  // and difficulty, but page planning must never rotate it into another one.
  if (
    (isAdvancedActivityTypeLocked(spec) && advancedActivityMechanicFor(spec)) ||
    (isPromptActivityTypeLocked(spec) && promptActivityMechanicFor(spec))
  )
    return [contracted];
  // A structured Idea Lab card game is a complete activity contract, not an
  // ambiguous prompt. Cross-domain mechanics such as Memory Pairs remain
  // printable at every level (their card density is age-adapted by the
  // builder), so never replace them with an unrelated domain fallback.
  if (specHasObjective(spec) && isCrossDomainMechanic(contracted)) return [contracted];
  return narrowMechanicsToRequestedSkills(
    mechanicsAllowedForDomainAndAge(spec),
    parseRequestedSkillFamilies(spec),
  );
}

function mechanicsAllowedForDomainAndAge(spec: WorksheetSpec): WorksheetMechanicId[] {
  const domain = domainForSpec(spec);
  // an explicitly requested craft mechanic is never narrowed by age: the
  // pieces get bigger instead
  if (domain === "craft") return [...new Set(mechanicsByDomain.craft.map(rendererMechanicFor))];
  if (domain === "literacy") {
    const profile = resolveAgeTokens(spec.level);
    return [
      ...new Set(
        mechanicsByDomain.literacy
          .filter((mechanic) => profile.literacyMechanics.includes(mechanic))
          .map(rendererMechanicFor),
      ),
    ];
  }
  const byAge = mechanicsAllowedForAge(spec.level);
  // Preserve the profile's teaching sequence. This makes a Grade 4 pack begin
  // with different follow-up reasoning work than a Grade 2 pack, rather than
  // merely shrinking the same activity list.
  return [
    ...new Set(
      byAge
        .filter((mechanic) => mechanicsByDomain[domain].includes(mechanic))
        .map(rendererMechanicFor),
    ),
  ];
}

const kindsByMechanic: Record<WorksheetMechanicId, WorksheetActivity["kind"]> = {
  "find-target": "find-target",
  "match-pairs": "match-pairs",
  "trace-draw": "trace-draw",
  "maze-route": "maze",
  "count-match": "count-match",
  "count-circle": "count-circle",
  "compare-quantity": "pick-one",
  "compare-size": "pick-one",
  "same-different": "pick-one",
  "beginning-sound": "pick-one",
  "beginning-sound-discrimination": "sound-hunt",
  "pattern-complete": "pick-one",
  "sequence-order": "order-sequence",
  "find-and-count": "find-count",
  "sort-attribute": "sort-groups",
  "letter-recognition": "letter-search",
  "letter-trace": "letter-trace",
  "letter-write": "letter-trace",
  "number-write": "letter-trace",
  "letter-sort": "sort-groups",
  "picture-letter-match": "picture-letter-match",
  "word-initial-complete": "word-complete",
  "memory-pairs": "memory-pairs",
  "cut-create-build": "cut-create",
  "cut-create-scene": "cut-create",
  "cut-create-count": "cut-create",
};

export { kindsForMechanic };

export function kindForMechanic(mechanic: WorksheetMechanicId): WorksheetActivity["kind"] {
  return kindsByMechanic[mechanic];
}

/**
 * The mechanic of every page, in order.
 *
 * Page 1 always practises the resolved learning objective. After that the pack
 * uses a GENUINELY DIFFERENT composition on every page for as long as the age
 * band offers one — no page is a resized copy of the page before it. Only when
 * a pack is longer than the available vocabulary does it cycle back, and then
 * it returns to the core skill as a review page.
 *
 * A structured Idea Lab idea is an exact contract, so those packs keep one
 * mechanic on every page (content still varies).
 */
export function planWorksheetPages(
  spec: WorksheetSpec,
  pageCount: number,
  profile: ObjectiveProfile = resolveObjectiveProfile(spec),
): WorksheetMechanicId[] {
  const total = Math.max(1, Math.min(pageCount, 20));
  // "Worksheet" remains a skill-directed format, but every named Advanced
  // interaction repeats its exact mechanic across the pack.
  if (
    (isAdvancedActivityTypeLocked(spec) && advancedActivityMechanicFor(spec)) ||
    (isPromptActivityTypeLocked(spec) && promptActivityMechanicFor(spec))
  ) {
    return Array.from({ length: total }, () => profile.mechanic);
  }
  // Legacy structured ideas can carry `mechanicId: "maze"`. It is an explicit
  // request for a maze and must not be narrowed into an age-band counting
  // mechanic before the page contract is frozen.
  if (spec.mechanicId === "maze" && profile.mechanic === "maze-route") {
    return Array.from({ length: total }, () => profile.mechanic);
  }
  // EXACT PAGE FIDELITY — a prompt that specifies pages one by one is a hard
  // contract. Each specified page keeps its mechanic and its position; pages
  // the teacher left unspecified recycle the specified ones rather than
  // introducing an activity nobody asked for.
  const directives = parsePageDirectives(spec);
  if (directives.length) {
    // Pages the teacher specified keep their exact mechanic and position.
    // Pages left unspecified recycle the REQUESTED activities in written
    // order — never an activity nobody asked for — and never repeat the
    // activity sitting directly above them.
    const plan: WorksheetMechanicId[] = Array.from({ length: total }, (_unused, index) => {
      const exact = directives.find((directive) => directive.page === index + 1);
      return exact ? exact.mechanic : (undefined as unknown as WorksheetMechanicId);
    });
    const ordered = [...new Set(directives.map((directive) => directive.mechanic))];
    let cursor = 0;
    for (let index = 0; index < plan.length; index++) {
      if (plan[index]) continue;
      let choice = ordered[cursor % ordered.length]!;
      if (ordered.length > 1 && choice === plan[index - 1]) {
        cursor++;
        choice = ordered[cursor % ordered.length]!;
      }
      cursor++;
      plan[index] = choice;
    }
    return plan;
  }
  // Detailed counting requests that ask for choices for every group require a
  // row-by-row numeral response. Count & Circle is the renderer that carries
  // one set of choices per rendered group; Count & Match has one shared bank.
  if (
    total === 1 &&
    spec.promptRequirements?.countGroups.length &&
    spec.promptRequirements.requiredChoiceCount
  ) {
    return ["count-circle"];
  }

  const families = parseRequestedSkillFamilies(spec);
  const allowed = mechanicsAllowedFor(spec);
  // SKILL FIDELITY — an explicitly requested skill outranks the objective the
  // theme resolved to. "Different activity" means a different mechanic for the
  // SAME skill, never a different cognitive skill.
  const resolvedPrimary =
    !specHasObjective(spec) &&
    families.length &&
    !families.includes(skillFamilyOfMechanic(profile.mechanic)) &&
    allowed[0]
      ? allowed[0]
      : profile.mechanic;
  // A level constraint must choose a developmentally appropriate rendition,
  // never knowingly plan a mechanic that the validation gate will reject.
  // This is particularly important for open phonics requests: early readers
  // can start with letter recognition before moving into sound discrimination.
  const primary = allowed.includes(resolvedPrimary) ? resolvedPrimary : (allowed[0] ?? resolvedPrimary);
  // A structured idea OR an explicitly worded activity request is an exact
  // contract: every page practises that mechanic. Rotation may only add
  // variety when the teacher left the activity open.
  // A structured Idea Lab idea is an exact contract: same mechanic on every page.
  if (specHasObjective(spec) || total === 1) {
    return Array.from({ length: total }, () => primary);
  }
  // REQUESTED-SKILL FIDELITY — a prompt that explicitly words its skills
  // ("identify B and b, trace B and b, circle pictures that begin with /b/")
  // must teach every one of them first, in teaching order. Only once each
  // requested skill has a page may the pack add in-domain variety, and a pack
  // longer than its vocabulary recycles the REQUESTED skills — never an
  // unrelated mechanic.
  const requested = parseRequestedSkills(spec).filter((mechanic) => allowed.includes(mechanic));
  if (requested.length >= 1) {
    if (requested.includes("number-write")) {
      return Array.from({ length: total }, () => primary);
    }
    const skills = requested.includes(primary)
      ? [primary, ...requested.filter((mechanic) => mechanic !== primary)]
      : requested;
    const plan = skills.slice(0, total);
    const extras = allowed.filter((mechanic) => !skills.includes(mechanic));
    let extraIndex = 0;
    for (let page = plan.length; page < total; page++) {
      if (extraIndex < extras.length) {
        plan.push(extras[extraIndex]!);
        extraIndex++;
      } else {
        plan.push(skills[(page - extras.length) % skills.length]!);
      }
    }
    return plan;
  }

  // A prompt naming ONE activity locks the pack to that activity's content model.
  const requestedMechanic = promptRequestsMechanic(spec);
  // Generic counting is a SKILL request, not a request to repeat whichever
  // counting mechanic happened to resolve first. It may rotate through every
  // quantity mechanic; explicit "match" / "circle" wording remains locked.
  const genericCounting =
    !isPromptActivityTypeLocked(spec) &&
    requestedMechanic === "count-circle" &&
    /\bcount(ing)?\b/i.test(spec.prompt ?? "") &&
    !/\bcircle\b/i.test(spec.prompt ?? "");
  const locked = Boolean(requestedMechanic && !genericCounting);
  // Numeral formation is a concrete motor practice, not a generic quantity
  // activity. A teacher who requests tracing and writing numbers expects each
  // page to preserve that interaction, rather than rotating into counting.
  if (requestedMechanic === "number-write") {
    return Array.from({ length: total }, () => primary);
  }

  // A locked pack may still vary its pages, but only inside the SAME content
  // model — a sequencing pack never rotates into counting, while a Cut &
  // Create pack may rotate between its build / scene / count variants.
  // When the prompt named its skill, the skill-narrowed pool wins: variety
  // comes from mechanics that all practise that one skill.
  const contentFamily = allMechanics.filter(
    (mechanic) => familyOfMechanic(mechanic) === familyOfMechanic(primary),
  );
  const pool = locked
    ? // both constraints apply: same content model AND same requested skill
      (() => {
        const both = contentFamily.filter((mechanic) => allowed.includes(mechanic));
        return families.length && both.length ? both : contentFamily;
      })()
    : allowed;
  const companions = [...new Set(pool)].filter((mechanic) => mechanic !== primary);
  if (locked && !companions.length) return Array.from({ length: total }, () => primary);
  const plan: WorksheetMechanicId[] = [primary];
  let companionIndex = 0;
  for (let page = 1; page < total; page++) {
    if (companionIndex < companions.length) {
      plan.push(companions[companionIndex]!);
      companionIndex++;
    } else {
      // vocabulary exhausted: consolidate the core skill, then rotate again
      const cycle = page - companions.length - 1;
      plan.push(cycle % 3 === 0 ? primary : companions[cycle % companions.length]!);
    }
  }
  return plan;
}

/** Every activity kind the planned pack is allowed to render. */
export function plannedActivityKinds(
  spec: WorksheetSpec,
  pageCount: number,
): Array<WorksheetActivity["kind"]> {
  return [
    ...new Set(
      planWorksheetPages(spec, pageCount).flatMap((mechanic) => kindsForMechanic(mechanic)),
    ),
  ];
}

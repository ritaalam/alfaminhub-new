/**
 * GRACEFUL PAGE-LEVEL FALLBACK.
 *
 * A single page whose requested activity no builder can represent correctly
 * must never sink an otherwise valid pack. Instead of rejecting the whole
 * worksheet, that ONE page is rebuilt with the closest educationally
 * equivalent supported activity: same skill family first (so the learning
 * objective survives), then the same content family, then anything the age
 * band and domain already allow.
 *
 * Nothing here weakens quality validation — a substituted page still has to
 * pass every answer, count, pairing, sorting, pattern, age and layout check.
 */

import type { WorksheetSpec } from "./creator-options";
import { sameInteraction } from "./interaction-verbs";
import { familyOfMechanic } from "./mechanic-registry";
import { skillFamilyOfMechanic } from "./skill-fidelity";
import { mechanicsAllowedFor, mechanicsAllowedForAge } from "./worksheet-page-plan";
import type { WorksheetMechanicId } from "./worksheet-model";

export type PageSubstitution = {
  page: number;
  requestedMechanic: WorksheetMechanicId;
  substitutedMechanic: WorksheetMechanicId;
  reason: string;
};

/**
 * Supported mechanics ordered by educational closeness to `mechanic`.
 *
 * HARD CONSTRAINT: only mechanics with the SAME interaction verb are eligible
 * — CIRCLE never becomes SORT, MATCH never becomes odd-one-out, DRAW never
 * becomes multiple choice. When no same-interaction mechanic exists the list
 * is empty and the page is flagged unsupported instead of being replaced by an
 * unrelated activity.
 */
export function equivalentMechanics(
  spec: WorksheetSpec,
  mechanic: WorksheetMechanicId,
): WorksheetMechanicId[] {
  const pool = [
    ...new Set<WorksheetMechanicId>([
      ...mechanicsAllowedFor(spec),
      ...mechanicsAllowedForAge(spec.level),
    ]),
  ].filter((candidate) => candidate !== mechanic && sameInteraction(mechanic, candidate));

  const skill = skillFamilyOfMechanic(mechanic);
  const content = familyOfMechanic(mechanic);
  const rank = (candidate: WorksheetMechanicId) => {
    const sameSkill = skillFamilyOfMechanic(candidate) === skill;
    const sameContent = familyOfMechanic(candidate) === content;
    if (sameSkill && sameContent) return 0;
    if (sameSkill) return 1;
    if (sameContent) return 2;
    return 3;
  };
  return [...pool].sort((a, b) => rank(a) - rank(b));
}

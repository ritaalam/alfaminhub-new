import { describe, expect, it } from "vitest";
import { defaultSpec } from "@/lib/creator-options";
import { applyPromptIntent } from "@/lib/learning-domains";
import { buildValidWorksheetProject, checkWorksheetProject } from "@/lib/worksheet-service";
import { equivalentMechanics } from "@/lib/worksheet-page-fallback";
import { skillFamilyOfMechanic } from "@/lib/skill-fidelity";
import { interactionOfMechanic } from "@/lib/interaction-verbs";

const letterPack = `Create a 5-page worksheet pack for Ages 4–5 about letter B.
Page 1: Trace letter B.
Page 2: Sort letter B.
Page 3: Order letter B.
Page 4: Sort letter B.
Page 5: Trace letter B.`;

describe("graceful page-level fallback", () => {
  it("offers same-skill activities first", () => {
    const spec = applyPromptIntent({
      ...defaultSpec,
      level: "Ages 4–5",
      prompt: "Count the butterflies.",
    });
    const candidates = equivalentMechanics(spec, "count-circle");
    if (candidates.length) {
      expect(skillFamilyOfMechanic(candidates[0]!)).toBe(skillFamilyOfMechanic("count-circle"));
    }
    // the child's action is a hard constraint: no sorting/comparison swaps
    for (const candidate of candidates) {
      expect(interactionOfMechanic(candidate)).toBe(interactionOfMechanic("count-circle"));
    }
  });

  it("rescues a pack whose individual pages cannot all be represented exactly", () => {
    const spec = applyPromptIntent({
      ...defaultSpec,
      level: "Ages 4–5",
      pages: "5",
      prompt: letterPack,
    });
    const project = buildValidWorksheetProject(spec, 1);
    expect(project.pages).toHaveLength(5);
    // pages that could not be represented were substituted (same interaction)
    // or explicitly flagged as unsupported — never silently rejected
    const handled = (project.substitutions?.length ?? 0) + (project.unsupportedPages?.length ?? 0);
    expect(handled).toBeGreaterThan(0);
    // every page that was NOT flagged unsupported still passes the quality gate
    const flaggedIds = new Set(
      (project.unsupportedPages ?? []).map((entry) => project.pages[entry.page - 1]?.id),
    );
    const flaggedNumbers = new Set((project.unsupportedPages ?? []).map((entry) => entry.page));
    expect(
      checkWorksheetProject(project, spec)
        .issues.filter((i) => i.severity === "error")
        .filter((i) => {
          if (i.pageId && flaggedIds.has(i.pageId)) return false;
          const named = /\bPage (\d+)\b/.exec(i.message);
          return !(named && flaggedNumbers.has(Number(named[1])));
        }),
    ).toEqual([]);
  });
});

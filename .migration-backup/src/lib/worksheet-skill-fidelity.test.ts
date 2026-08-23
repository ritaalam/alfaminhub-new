/**
 * SKILL FIDELITY REGRESSION — an explicitly requested skill is a hard
 * constraint on EVERY page of a pack, at any length.
 */
import { describe, expect, it } from "vitest";
import { defaultSpec, type WorksheetSpec } from "@/lib/creator-options";
import { buildValidWorksheetProject, checkWorksheetProject } from "@/lib/worksheet-service";
import { mechanicOfActivity } from "@/lib/worksheet-objectives";
import { parseRequestedSkillFamilies, skillFamilyOfMechanic } from "@/lib/skill-fidelity";
import { planWorksheetPages } from "@/lib/worksheet-page-plan";

function specFor(prompt: string, pages: number, level = "Ages 4–5"): WorksheetSpec {
  return { ...defaultSpec, prompt, level, pages: String(pages) } as WorksheetSpec;
}

const cases: Array<[string, string, number]> = [
  [
    "5-page counting insects",
    "Create a 5-page counting insects activity for ages 4–5. Each page should use a different activity, but every page must practise counting or quantity.",
    5,
  ],
  [
    "10-page counting animals",
    "Create a 10-page counting animals pack for ages 4–5. Every page must practise counting or quantity, using a different activity each time.",
    10,
  ],
  [
    "20-page counting nature",
    "Create a 20-page counting nature pack for ages 4–5. Each page uses a different activity but every page must teach counting and quantity.",
    20,
  ],
];

describe("skill fidelity across pack lengths", () => {
  for (const [name, prompt, pages] of cases) {
    it(`keeps every page of the ${name} pack on the quantity skill`, () => {
      const spec = specFor(prompt, pages);
      expect(parseRequestedSkillFamilies(spec)).toContain("quantity");

      const plan = planWorksheetPages(spec, pages);
      expect(plan).toHaveLength(pages);
      for (const mechanic of plan) {
        expect(skillFamilyOfMechanic(mechanic), mechanic).toBe("quantity");
      }

      const project = buildValidWorksheetProject(spec, 3);
      expect(project.pages).toHaveLength(pages);
      for (const page of project.pages) {
        const mechanic = mechanicOfActivity(page.activity);
        expect(skillFamilyOfMechanic(mechanic), `${page.id} ${mechanic}`).toBe("quantity");
      }
      const check = checkWorksheetProject(project, spec);
      expect(check.issues.filter((i) => i.severity === "error")).toEqual([]);
    });
  }

  it("never plans size or pattern pages inside a counting request", () => {
    const plan = planWorksheetPages(specFor(cases[0]![1], 5), 5);
    expect(plan).not.toContain("compare-size");
    expect(plan).not.toContain("pattern-complete");
    expect(plan).not.toContain("sequence-order");
  });

  it("leaves open-ended prompts free to vary across skills", () => {
    const spec = specFor("A fun activity pack about the farm for ages 4-5.", 4);
    expect(parseRequestedSkillFamilies(spec)).toEqual([]);
    expect(planWorksheetPages(spec, 4)).toHaveLength(4);
  });
});

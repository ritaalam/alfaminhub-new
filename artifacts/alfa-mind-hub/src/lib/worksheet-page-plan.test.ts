import { describe, expect, it } from "vitest";
import { defaultSpec, type WorksheetSpec } from "@/lib/creator-options";
import { buildValidWorksheetProject, checkWorksheetProject } from "@/lib/worksheet-service";
import { mechanicsAllowedForAge, planWorksheetPages } from "@/lib/worksheet-page-plan";
import { mechanicOfActivity } from "@/lib/worksheet-objectives";
import { skillFamilyOfMechanic } from "@/lib/skill-fidelity";

function specFor(patch: Partial<WorksheetSpec>): WorksheetSpec {
  return { ...defaultSpec, ...patch } as WorksheetSpec;
}

describe("multi-page composition", () => {
  it("does not repeat the same activity on a 2-page free-form pack", () => {
    const spec = specFor({
      level: "Ages 4–5",
      pages: "2",
      prompt: "Create a butterfly counting activity for ages 4-5.",
    });
    const project = buildValidWorksheetProject(spec, 1);
    expect(project.pages).toHaveLength(2);
    const mechanics = project.pages.map((page) => mechanicOfActivity(page.activity));
    expect(new Set(mechanics).size).toBeGreaterThan(1);
    expect(checkWorksheetProject(project, spec).valid).toBe(true);
  });

  it("rotates activities across a 6-page pack while returning to the core skill", () => {
    const spec = specFor({
      level: "Kindergarten",
      pages: "6",
      prompt: "Counting butterflies from 1 to 10.",
    });
    const plan = planWorksheetPages(spec, 6);
    // skill fidelity first: an explicit counting request rotates only through
    // quantity mechanics, opening on the core skill the prompt asked for
    expect(new Set(plan).size).toBeGreaterThanOrEqual(3);
    for (const mechanic of plan) expect(skillFamilyOfMechanic(mechanic)).toBe("quantity");
    expect(plan[0]).toBe("count-match");

    const project = buildValidWorksheetProject(spec, 2);
    expect(project.pages).toHaveLength(6);
    const titles = project.pages.map((page) => page.title);
    expect(new Set(titles).size).toBe(titles.length);
    expect(checkWorksheetProject(project, spec).valid).toBe(true);
  });

  it("keeps toddler packs inside the simplest mechanics and one instruction", () => {
    expect(mechanicsAllowedForAge("Ages 2–3")).not.toContain("sequence-order");
    expect(mechanicsAllowedForAge("Ages 2–3")).not.toContain("beginning-sound");
    const spec = specFor({
      level: "Ages 2–3",
      pages: "3",
      prompt: "Count the butterflies 1 to 3.",
    });
    const project = buildValidWorksheetProject(spec, 1);
    for (const page of project.pages) {
      expect(page.footerNote).toBeUndefined();
      expect((page.activity as { challenge?: string }).challenge).toBeUndefined();
      expect(mechanicsAllowedForAge("Ages 2–3")).toContain(mechanicOfActivity(page.activity));
    }
  });

  it("keeps a structured idea pack on its objective mechanic on every page", () => {
    const spec = specFor({
      level: "Ages 4–5",
      pages: "3",
      objectiveId: "compare-quantity",
      mechanicId: "compare",
      prompt: "Which group has more?",
    });
    const project = buildValidWorksheetProject(spec, 1);
    for (const page of project.pages) {
      expect(mechanicOfActivity(page.activity)).toBe("compare-quantity");
    }
    expect(checkWorksheetProject(project, spec).valid).toBe(true);
  });
});

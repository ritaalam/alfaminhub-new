import { describe, expect, it } from "vitest";
import { buildValidWorksheetProject } from "./worksheet-service";
import {
  PagePlanContractError,
  assertPagePlanContract,
  explicitMechanicBreaches,
  freezePagePlan,
  pageContractBreach,
  type WorksheetPagePlan,
} from "./worksheet-page-contract";
import { mechanicOfActivity } from "./worksheet-objectives";
import type { WorksheetSpec } from "./creator-options";
import type { WorksheetProject } from "./worksheet-model";

function spec(prompt: string, pages: string): WorksheetSpec {
  return {
    prompt,
    theme: "Letters",
    skill: "Phonics",
    level: "Ages 4–5",
    difficulty: "Just right",
    duration: "10 minutes",
    approach: "Montessori",
    palette: "Sage",
    language: "English",
    printing: "Full color",
    pages,
  } as WorksheetSpec;
}

const prompt = `Create a 5-page early phonics pack for ages 4–5 about the letter S.
Page 1: Trace uppercase S and lowercase s.
Page 2: Circle pictures beginning with /s/.
Page 3: Find and circle S/s among distractor letters.
Page 4: Match pictures beginning with S to the letter S.
Page 5: Complete a simple picture activity using words beginning with S.`;

describe("immutable page plan contract", () => {
  const project = buildValidWorksheetProject(spec(prompt, "5"), 1);

  it("is attached to the project and frozen", () => {
    expect(project.pagePlanContract).toBeDefined();
    expect(Object.isFrozen(project.pagePlanContract)).toBe(true);
    expect(Object.isFrozen(project.pagePlanContract![0])).toBe(true);
  });

  it("renders exactly the requested mechanic on every explicit page", () => {
    for (const entry of project.pagePlanContract!.filter((e) => e.explicit)) {
      expect(mechanicOfActivity(project.pages[entry.page - 1]!.activity)).toBe(
        entry.requestedMechanic,
      );
    }
    expect(explicitMechanicBreaches(project.pagePlanContract, project)).toEqual([]);
  });

  it("hard-blocks a page whose rendered mechanic differs from the requested one", () => {
    const swapped: WorksheetProject = {
      ...project,
      pages: [project.pages[1]!, ...project.pages.slice(1)],
    };
    const breaches = explicitMechanicBreaches(swapped.pagePlanContract, swapped);
    expect(breaches.length).toBeGreaterThan(0);
    expect(breaches[0]!.code).toBe("page-contract-mechanic");
    expect(pageContractBreach(swapped, swapped.pages[0]!, 0)).not.toBeNull();
    expect(() => assertPagePlanContract(swapped.pagePlanContract, swapped)).toThrow(
      PagePlanContractError,
    );
  });

  it("never blocks non-explicit pages", () => {
    const plan = freezePagePlan([
      {
        page: 1,
        requestedSkill: "quantity",
        requestedMechanic: "count-match",
        requiredContent: "",
        semanticRequirements: {
          pageIntent: "",
          requiredEntities: [],
          requiredCategories: [],
          requiredRelationships: [],
          patternRules: [],
        },
        prohibitedMechanics: [],
        allowedEntities: [],
        prohibitedEntities: [],
        explicit: false,
      } as WorksheetPagePlan,
    ]);
    const loose = { ...project, pagePlanContract: plan };
    expect(explicitMechanicBreaches(loose.pagePlanContract, loose)).toEqual([]);
  });
});

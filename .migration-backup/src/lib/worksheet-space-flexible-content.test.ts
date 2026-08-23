/**
 * IMMUTABLE MECHANIC, FLEXIBLE CONTENT
 * ------------------------------------
 * A 5-page space pack names many thematic nouns (astronaut, rocket, star,
 * planet). Those nouns are DECORATIVE by default: an equivalent space visual
 * may be substituted. What must never change is what the child DOES on each
 * page — the activity mechanic.
 */

import { describe, expect, it } from "vitest";
import { defaultSpec, type WorksheetSpec } from "@/lib/creator-options";
import { applyPromptIntent } from "@/lib/learning-domains";
import { buildValidWorksheetProject, checkWorksheetProject } from "@/lib/worksheet-service";
import { explicitMechanicBreaches } from "@/lib/worksheet-page-contract";
import { parsePageDirectives, semanticRequirementsOf } from "@/lib/page-directives";
import { mechanicOfActivity } from "@/lib/worksheet-objectives";

const PROMPT = `Create a 5-page space worksheet for ages 4-5.
Page 1: LETTER HUNT — find and circle the letter S among other letters.
Page 2: COUNTING — count the rockets in each row and circle the number.
Page 3: MATCHING — match astronauts to matching helmets.
Page 4: PATTERN COMPLETION using planets, stars and rockets.
Page 5: TRACING MAZE from astronaut to rocket.`;

function spaceSpec(): WorksheetSpec {
  return applyPromptIntent({ ...defaultSpec, prompt: PROMPT, level: "Ages 4–5", pages: "5" });
}

describe("space pack — flexible visuals, immutable mechanics", () => {
  const spec = spaceSpec();
  const project = buildValidWorksheetProject(spec, 1);

  it("treats ordinary thematic nouns as flexible content", () => {
    for (const directive of parsePageDirectives(spec)) {
      expect(directive.semanticRequirements.requiredEntities).toEqual([]);
    }
  });

  it("still freezes visuals when the teacher marks them mandatory", () => {
    const req = semanticRequirementsOf(
      "Count the rockets — the page must include a rocket.",
      "count-circle",
    );
    expect(req.requiredEntities).toContain("rocket");
  });

  it("passes validation with no page-plan contract violations", () => {
    expect(explicitMechanicBreaches(project.pagePlanContract, project)).toEqual([]);
    expect(checkWorksheetProject(project, spec).valid).toBe(true);
  });

  it("renders five distinct requested mechanics", () => {
    expect(project.pages).toHaveLength(5);
    const rendered = project.pages.map((page) => mechanicOfActivity(page.activity));
    const requested = project.pagePlanContract!.map((entry) => entry.requestedMechanic);
    expect(rendered).toEqual(requested);
    expect(new Set(rendered).size).toBe(5);
  });
});

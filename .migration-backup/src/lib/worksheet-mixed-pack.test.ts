import { describe, expect, it } from "vitest";
import { defaultSpec, type WorksheetSpec } from "@/lib/creator-options";
import { applyPromptIntent } from "@/lib/learning-domains";
import { buildValidWorksheetProject, checkWorksheetProject } from "@/lib/worksheet-service";
import { mechanicOfActivity } from "@/lib/worksheet-objectives";

/**
 * A mixed multi-activity request must be DECOMPOSED, never collapsed into five
 * copies of whichever activity happened to resolve first.
 */
const numbered = `Create a 5-page early math worksheet pack for ages 4–5 covering numbers 1–10.
Page 1: Count objects 1–10 and choose the correct numeral.
Page 2: Match quantities to numerals.
Page 3: Complete AB and AAB patterns.
Page 4: Compare groups using more and less.
Page 5: Trace and independently write numbers 1–10.`;

const plainList = `Create a 5-page early math worksheet pack for ages 4–5 covering numbers 1–10.
1. Count objects 1–10 and choose the correct numeral.
2. Match quantities to numerals.
3. Complete AB and AAB patterns.
4. Compare groups using more and less.
5. Trace and independently write numbers 1–10.`;

const inlineList =
  "Create a 5-page early math worksheet pack for ages 4–5 covering numbers 1–10 with five different activities: counting, matching quantities to numerals, patterns, comparing more and less, number handwriting.";

function specFor(prompt: string): WorksheetSpec {
  return applyPromptIntent({ ...defaultSpec, prompt, level: "Ages 4–5", pages: "5" });
}

describe("mixed multi-activity math pack", () => {
  for (const [label, prompt] of Object.entries({ numbered, plainList, inlineList })) {
    it(`decomposes the ${label} prompt into five different activities`, () => {
      const spec = specFor(prompt);
      const project = buildValidWorksheetProject(spec, 1);
      expect(project.pages).toHaveLength(5);
      const mechanics = project.pages.map((page) => mechanicOfActivity(page.activity));
      expect(new Set(mechanics).size).toBeGreaterThanOrEqual(4);
      expect(mechanics[0]).toBe("count-circle");
      expect(mechanics).toContain("pattern-complete");
      expect(mechanics).toContain("number-write");
      // the pack is never titled after page 1's activity
      expect(project.title).toMatch(/Early Math Pack/i);
      expect(
        checkWorksheetProject(project, spec).issues.filter((i) => i.severity === "error"),
      ).toEqual([]);
    });
  }
});

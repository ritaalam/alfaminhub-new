import { describe, expect, it } from "vitest";
import { buildWorksheetProject } from "./worksheet-builder";
import { parsePageDirectives } from "./page-directives";
import { explicitMechanicBreaches } from "./worksheet-page-contract";
import { defaultSpec } from "./creator-options";
import type { WorksheetSpec } from "./creator-options";
import { mechanicOfActivity } from "./worksheet-objectives";

/**
 * SHAPES & THINKING SKILLS STRESS TEST
 * The teacher's page specification — student action, content and response mode
 * — must survive generation. No page may be answered with the nearest existing
 * template (identical-picture matching, same/different, circle-a-numeral).
 */
const prompt = [
  "Page 1: Trace the basic shapes: circle, square, triangle and rectangle.",
  "Page 2: Match everyday objects to the shape they look like.",
  "Page 3: Sort the pictures into things we eat and things we play with.",
  "Page 4: Complete the repeating shape patterns (AB and AAB).",
  "Page 5: Count the pictures in each row and draw the same number of circles in the box.",
].join("\n");

const spec: WorksheetSpec = { ...defaultSpec, prompt, level: "Ages 4-5", pages: "5" };

describe("shapes & thinking skills pack", () => {
  it("parses every page into its own activity", () => {
    const directives = parsePageDirectives(spec);
    expect(directives.map((d) => d.mechanic)).toEqual([
      "trace-draw",
      "match-pairs",
      "sort-attribute",
      "pattern-complete",
      "count-circle",
    ]);
    expect(directives[1]!.semanticRequirements.activitySubtype).toBe("object-to-shape");
    expect(directives[2]!.semanticRequirements.categoryGroups?.length).toBe(2);
    expect(directives[4]!.semanticRequirements.responseMode).toBe("draw");
  });

  it("renders each requested activity without substitution", () => {
    const project = buildWorksheetProject(spec);
    expect(project.pages).toHaveLength(5);
    expect(project.pages.map((page) => mechanicOfActivity(page.activity))).toEqual([
      "trace-draw",
      "match-pairs",
      "sort-attribute",
      "pattern-complete",
      "count-circle",
    ]);

    const shapeMatch = project.pages[1]!.activity;
    expect(shapeMatch.kind).toBe("match-pairs");
    if (shapeMatch.kind === "match-pairs") {
      expect(shapeMatch.subtype).toBe("object-to-shape");
      expect(
        shapeMatch.right.every((item) =>
          ["circle", "square", "triangle", "rectangle"].includes(item.asset),
        ),
      ).toBe(true);
    }

    const sort = project.pages[2]!.activity;
    if (sort.kind === "sort-groups") {
      expect(sort.bins.map((bin) => bin.label)).toEqual(["Things We Eat", "Things We Play With"]);
      expect(sort.items.length).toBeGreaterThanOrEqual(6);
    } else {
      throw new Error("page 3 must be a sorting page");
    }

    const draw = project.pages[4]!.activity;
    if (draw.kind === "count-circle") {
      expect(draw.responseMode).toBe("draw");
      expect(draw.rows.every((row) => row.renderedObjects.length === row.correctAnswer)).toBe(true);
      expect(draw.rows.every((row) => row.choices.length === 0)).toBe(true);
    } else {
      throw new Error("page 5 must be a counting page answered by drawing");
    }

    expect(explicitMechanicBreaches(project.pagePlanContract, project)).toEqual([]);
  });
});

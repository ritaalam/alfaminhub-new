import { describe, expect, it } from "vitest";
import { defaultSpec, type WorksheetSpec } from "./creator-options";
import { parsePageDirectives } from "./page-directives";
import { buildValidWorksheetProject, checkWorksheetProject } from "./worksheet-service";
import { explicitMechanicBreaches } from "./worksheet-page-contract";
import { mechanicOfActivity } from "./worksheet-objectives";
import { basicShapes } from "./object-semantics";

/**
 * 4-PAGE SHAPES & THINKING SKILLS REGRESSION
 *
 * The exact teacher request that previously failed at pack level. Every page
 * must render its requested interaction: circle, match, sort, count & draw.
 * No substitutions, no unsupported-page flags, no pack-level failure.
 */
const prompt = [
  "Create a 4-page worksheet pack for Ages 4–5 about shapes and thinking skills.",
  "",
  "Page 1: Circle all the triangles from a mixed group of shapes.",
  "Page 2: Match familiar objects to their basic shapes.",
  "Page 3: Sort 8 pictures — 4 food items and 4 things we play with.",
  "Page 4: Count a group of objects and draw the same number of circles.",
].join("\n");

const spec: WorksheetSpec = { ...defaultSpec, prompt, level: "Ages 4-5", pages: "4" };

describe("4-page shapes & thinking skills pack", () => {
  it("parses one activity per page", () => {
    expect(parsePageDirectives(spec).map((d) => d.mechanic)).toEqual([
      "find-target",
      "match-pairs",
      "sort-attribute",
      "count-circle",
    ]);
  });

  it("generates the whole pack without a pack-level failure", () => {
    const project = buildValidWorksheetProject(spec);
    expect(project.pages).toHaveLength(4);
    expect(project.pages.map((page) => mechanicOfActivity(page.activity))).toEqual([
      "find-target",
      "match-pairs",
      "sort-attribute",
      "count-circle",
    ]);
    // nothing was swapped for a different activity, nothing was given up on
    expect(project.substitutions ?? []).toHaveLength(0);
    expect(project.unsupportedPages ?? []).toHaveLength(0);
    expect(explicitMechanicBreaches(project.pagePlanContract, project)).toEqual([]);
    expect(
      checkWorksheetProject(project, spec).issues.filter((issue) => issue.severity === "error"),
    ).toEqual([]);

    // page 2 keeps real object -> shape pairs (theme repair must not swap them)
    const match = project.pages[1]!.activity;
    expect(match.kind).toBe("match-pairs");
    if (match.kind === "match-pairs") {
      expect(match.subtype).toBe("object-to-shape");
      expect(match.left.every((item) => !basicShapes.includes(item.asset as never))).toBe(true);
      expect(match.right.every((item) => basicShapes.includes(item.asset as never))).toBe(true);
    }

    // page 4 is answered by DRAWING: no printed number cards, answer = objects
    const draw = project.pages[3]!.activity;
    expect(draw.kind).toBe("count-circle");
    if (draw.kind === "count-circle") {
      expect(draw.responseMode).toBe("draw");
      for (const row of draw.rows) {
        expect(row.choices).toHaveLength(0);
        expect(project.pages[3]!.answerKey.find((a) => a.groupId === row.id)?.answer).toBe(
          row.renderedObjects.length,
        );
      }
    }
  });
});

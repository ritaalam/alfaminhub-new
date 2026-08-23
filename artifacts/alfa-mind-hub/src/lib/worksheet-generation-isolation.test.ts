import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { defaultSpec, type WorksheetSpec } from "./creator-options";
import {
  buildValidWorksheetProject,
  checkWorksheetProject,
  validateFinalizedPageData,
} from "./worksheet-service";
import { mechanicOfActivity } from "./worksheet-objectives";
import { parsePageDirectives } from "./page-directives";
import { finalizeWorksheetProject, generateWorksheetProject } from "./worksheet-service";
import { applyPromptIntent } from "./learning-domains";
import { PrintablePage } from "../components/studio/PrintablePage";

const makeSpec = (prompt: string, pages: string): WorksheetSpec => ({
  ...defaultSpec,
  prompt,
  pages,
});

function copy(project: ReturnType<typeof buildValidWorksheetProject>) {
  return [
    project.title,
    project.meta.theme,
    ...project.pages.flatMap((page) => [page.title, page.instruction]),
  ]
    .join(" ")
    .toLowerCase();
}

describe("generation isolation and strict page planning", () => {
  it("switches from insects/counting to shapes without inherited content", () => {
    const insects = buildValidWorksheetProject(
      makeSpec("Create a 5-page counting insects pack.", "5"),
    );
    const shapesSpec = makeSpec("Create a 5-page shapes activity for ages 4–5.", "5");
    const shapes = buildValidWorksheetProject(shapesSpec);
    expect(copy(insects)).toMatch(/insect|butterfl|bee/);
    expect(copy(shapes)).toMatch(/shape/);
    expect(copy(shapes)).not.toMatch(/insect|butterfl|ladybug|bee/);
    expect(shapes.generation?.generationId).not.toBe(insects.generation?.generationId);
  });

  it("honours five explicitly distinct mechanics", () => {
    const prompt = `Create a 5-page insects pack for ages 4–5.
Page 1: Count the insects and circle the correct number.
Page 2: Match each insect group to its number.
Page 3: Sort the insects into groups.
Page 4: Complete an insect pattern.
Page 5: Find and count the insects in a picture.`;
    const spec = makeSpec(prompt, "5");
    expect(parsePageDirectives(spec).map((entry) => entry.mechanic)).toEqual([
      "count-circle",
      "count-match",
      "sort-attribute",
      "pattern-complete",
      "find-and-count",
    ]);
    const project = buildValidWorksheetProject(spec);
    expect(project.pages.map((page) => mechanicOfActivity(page.activity))).toEqual([
      "count-circle",
      "count-match",
      "sort-attribute",
      "pattern-complete",
      "find-and-count",
    ]);
    expect(
      checkWorksheetProject(project, spec).issues.filter((issue) => issue.severity === "error"),
    ).toEqual([]);
  });

  it("regenerates a fresh request without prior topic, title, objects or plan", () => {
    buildValidWorksheetProject(makeSpec("Create a 5-page counting insects pack.", "5"), 1);
    const nextSpec = makeSpec("Create a 3-page ocean pattern activity.", "3");
    const next = buildValidWorksheetProject(nextSpec, 1);
    expect(next.pages).toHaveLength(3);
    expect(new Set(next.pages.map((page) => mechanicOfActivity(page.activity)))).toEqual(
      new Set(["pattern-complete"]),
    );
    expect(copy(next)).not.toMatch(/insect|butterfl|ladybug/);
  });

  it("runs chickens then an explicit non-counting shapes pack through fresh semantic mechanics", () => {
    const chickens = buildValidWorksheetProject(
      makeSpec("Create a counting chickens activity.", "2"),
    );
    const prompt = `Create a 5-page shapes pack for ages 4–5. Do not use counting or animals.
Page 1: Find all the circles among different shapes.
Page 2: Match each shape to the same shape.
Page 3: Complete a simple shape pattern.
Page 4: Sort the shapes by type.
Page 5: Trace the shapes and draw each shape by yourself.`;
    const spec = makeSpec(prompt, "5");
    const shapes = buildValidWorksheetProject(spec);
    const mechanics = shapes.pages.map((page) => mechanicOfActivity(page.activity));

    expect(copy(chickens)).toMatch(/chicken/);
    expect(mechanics).toEqual([
      "find-target",
      "match-pairs",
      "pattern-complete",
      "sort-attribute",
      "trace-draw",
    ]);
    expect(
      mechanics.every(
        (mechanic) =>
          !["count-circle", "count-match", "find-and-count", "compare-quantity"].includes(mechanic),
      ),
    ).toBe(true);
    expect(JSON.stringify(shapes.pages).toLowerCase()).not.toMatch(
      /chicken|animal|insect|butterfl|bee/,
    );
    expect(shapes.generation?.trace?.rawUserPrompt).toBe(prompt);
    expect(shapes.generation?.trace?.requestedTopic).toBe("Shapes");
    expect(shapes.generation?.trace?.explicitPageInstructions).toHaveLength(5);
    expect(shapes.generation?.trace?.pageMechanics).toEqual(mechanics);
    expect(
      checkWorksheetProject(shapes, spec).issues.filter((issue) => issue.severity === "error"),
    ).toEqual([]);
  });

  it("preserves the exact semantic contract of a five-page farm-animal pack", () => {
    const prompt = `Create a 5-page farm-animal pack for ages 4–5.
Page 1: Find and circle all cows among different farm animals.
Page 2: Match each baby animal to its parent.
Page 3: Complete AB and AAB farm-animal patterns.
Page 4: Sort animals into 2 legs vs 4 legs.
Page 5: Trace paths helping each farm animal reach its food.`;
    const spec = makeSpec(prompt, "5");
    const directives = parsePageDirectives(spec);
    expect(directives.map((entry) => entry.mechanic)).toEqual([
      "find-target",
      "match-pairs",
      "pattern-complete",
      "sort-attribute",
      "trace-draw",
    ]);
    const project = buildValidWorksheetProject(spec);
    expect(project.pages.map((page) => mechanicOfActivity(page.activity))).toEqual(
      directives.map((entry) => entry.mechanic),
    );

    const find = project.pages[0]!.activity;
    expect(find.kind).toBe("find-target");
    if (find.kind === "find-target") {
      expect(find.targetAsset).toBe("cow");
      expect(find.items.some((item) => item.asset === "cow" && item.isTarget)).toBe(true);
      expect(find.items.some((item) => item.asset !== "cow" && !item.isTarget)).toBe(true);
    }
    const match = project.pages[1]!.activity;
    expect(match.kind).toBe("match-pairs");
    if (match.kind === "match-pairs") {
      expect(match.subtype).toBe("baby-parent");
      expect(match.relationship).toBe("baby-to-parent");
      expect(new Set(match.left.map((item) => item.asset))).toEqual(
        new Set(["calf", "lamb", "chick", "piglet"]),
      );
      expect(new Set(match.right.map((item) => item.asset))).toEqual(
        new Set(["cow", "sheep", "chicken", "pig"]),
      );
    }
    const pattern = project.pages[2]!.activity;
    expect(pattern.kind).toBe("pick-one");
    if (pattern.kind === "pick-one")
      expect(new Set(pattern.rows.map((row) => row.patternRule))).toEqual(new Set(["AB", "AAB"]));
    const sort = project.pages[3]!.activity;
    expect(sort.kind).toBe("sort-groups");
    if (sort.kind === "sort-groups")
      expect(sort.bins.map((bin) => bin.criterion?.value)).toEqual([2, 4]);
    const trace = project.pages[4]!.activity;
    expect(trace.kind).toBe("trace-draw");
    if (trace.kind === "trace-draw") {
      expect(trace.subtype).toBe("path-tracing");
      expect(trace.paths?.every((path) => path.relationship === "animal-to-food")).toBe(true);
    }
    expect(new Set(project.pages.map((page) => mechanicOfActivity(page.activity))).size).toBe(5);
    expect(
      checkWorksheetProject(project, spec).issues.filter((issue) => issue.severity === "error"),
    ).toEqual([]);
  });

  it("runs the exact farm request through Quick Create despite stale 2-page shape intent", async () => {
    const prompt = `Create a 5-page farm-animal pack for ages 4–5.
Page 1: Find and circle all cows among different farm animals.
Page 2: Match each baby animal to its parent.
Page 3: Complete AB and AAB farm-animal patterns.
Page 4: Sort animals into 2 legs vs 4 legs.
Page 5: Trace paths helping each farm animal reach its food.`;
    const staleSpec: WorksheetSpec = {
      ...defaultSpec,
      prompt,
      pages: "2",
      theme: "Shapes",
      skill: "Shapes",
      objectiveId: "sort-attribute",
      mechanicId: "sort",
      activityMechanic: "sort-attribute",
      source: "idea-lab",
    };
    const normalized = applyPromptIntent(staleSpec);
    const generated = await generateWorksheetProject(normalized);
    const project = finalizeWorksheetProject(generated, normalized);

    expect(normalized.pages).toBe("5");
    expect(normalized.objectiveId).toBeUndefined();
    expect(normalized.mechanicId).toBeUndefined();
    expect(project.generationSpecification?.rawPrompt).toBe(prompt);
    expect(project.generationSpecification?.requestedPageCount).toBe(5);
    expect(project.pages).toHaveLength(5);
    expect(project.pages.map((page) => mechanicOfActivity(page.activity))).toEqual([
      "find-target",
      "match-pairs",
      "pattern-complete",
      "sort-attribute",
      "trace-draw",
    ]);
    expect(project.pages.every((page, index) => project.pagePlanContract?.[index]?.explicit)).toBe(
      true,
    );
    expect(
      checkWorksheetProject(project, normalized).issues.filter(
        (issue) => issue.severity === "error",
      ),
    ).toEqual([]);
    expect(project.pages.map((page) => validateFinalizedPageData(page))).toEqual([
      [],
      [],
      [],
      [],
      [],
    ]);
    const rendered = project.pages
      .map((page, index) =>
        renderToStaticMarkup(
          createElement(PrintablePage, {
            project,
            page,
            index,
            mode: project.printMode,
          }),
        ),
      )
      .join("\n");
    expect(rendered).not.toContain("data-worksheet-contract-blocked");
    expect(rendered).not.toContain("data-worksheet-runtime-error");
    expect(rendered).toContain("Find the Cows");
    expect(rendered).toContain("Baby Animals &amp; Parents");
    expect(rendered).toContain("What Comes Next?");
    expect(rendered).toContain("Sort by Number of Legs");
    expect(rendered).toContain("Help the Farm Animals");
  });

  it.each([10, 20])("avoids mechanic collapse in a %i-page counting pack", (pageCount) => {
    const spec = makeSpec(
      `Create a ${pageCount}-page counting nature pack for ages 4–5. Use different counting or quantity activities across the pack.`,
      String(pageCount),
    );
    const project = buildValidWorksheetProject(spec);
    const mechanics = project.pages.map((page) => mechanicOfActivity(page.activity));
    expect(project.pages).toHaveLength(pageCount);
    expect(new Set(mechanics).size).toBeGreaterThanOrEqual(4);
    expect(
      mechanics.every((mechanic) =>
        ["count-match", "count-circle", "compare-quantity", "find-and-count"].includes(mechanic),
      ),
    ).toBe(true);
    expect(
      checkWorksheetProject(project, spec).issues.filter((issue) => issue.severity === "error"),
    ).toEqual([]);
  });
});

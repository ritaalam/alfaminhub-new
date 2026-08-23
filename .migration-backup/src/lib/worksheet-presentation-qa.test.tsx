import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { defaultSpec, type WorksheetSpec } from "./creator-options";
import { buildValidWorksheetProject, checkWorksheetProject } from "./worksheet-service";
import {
  fitPageLayout,
  layoutIssuesForBoxes,
  layoutIssuesForPage,
  measurePageLayout,
} from "./worksheet-layout";
import { clarifyPageInstruction, semanticInstructionIssues } from "./worksheet-semantic-qa";
import { specForIdea } from "./ideas/printables";
import { composeIdea, mechanicMap, objectiveMap } from "./ideas/engine";
import { PrintablePage } from "@/components/studio/PrintablePage";
import type { WorksheetPageModel } from "./worksheet-model";

function specFor(extra: Partial<WorksheetSpec> = {}): WorksheetSpec {
  return { ...defaultSpec, theme: "Insects", ...extra };
}

function comparisonSpec() {
  const idea = composeIdea({
    objective: objectiveMap["compare-quantity"]!,
    mechanic: mechanicMap["count-circle"]!,
    theme: "Insects",
    level: "Ages 4–5",
    difficulty: "Standard",
    duration: "10 minutes",
    pages: "2",
  });
  return specForIdea(idea);
}

describe("pre-render layout validation", () => {
  it("keeps every generated page inside the printable safe area with no collisions", () => {
    const specs = [
      specFor({ pages: "5", level: "Ages 4–5" }),
      specFor({ pages: "3", level: "Ages 2–3", difficulty: "Challenge" }),
      specFor({ theme: "Animals", pages: "4", level: "Grade 1", difficulty: "Challenge" }),
      comparisonSpec(),
    ];
    for (const spec of specs) {
      for (let version = 1; version <= 4; version++) {
        const project = buildValidWorksheetProject(spec, version);
        for (const page of project.pages) {
          expect(
            layoutIssuesForPage(page, { level: project.meta.level, paper: project.meta.paper }),
            `${spec.theme} v${version} · ${page.title}`,
          ).toEqual([]);
        }
      }
    }
  });

  it("detects overlap and clipping, then reflows the page until it fits", () => {
    const project = buildValidWorksheetProject(specFor({ pages: "1", level: "Ages 4–5" }), 2);
    const page = project.pages[0]!;
    if (page.activity.kind !== "count-match" && page.activity.kind !== "count-circle") return;

    // force an unfittable page: many oversized groups crammed into one sheet
    const groups = page.activity.kind === "count-match" ? page.activity.groups : page.activity.rows;
    const source = groups[0]!;
    const fat = Array.from({ length: 9 }, (_, i) => ({
      ...source,
      id: `overflow-${i}`,
      renderedObjects: Array.from({ length: 10 }, (_, j) => ({
        id: `overflow-${i}-${j}`,
        asset: source.renderedObjects[0]!.asset,
      })),
      correctAnswer: 10,
    }));
    const broken = {
      ...page,
      layoutFit: undefined,
      activity:
        page.activity.kind === "count-match"
          ? { ...page.activity, groups: fat }
          : { ...page.activity, rows: fat.map((row) => ({ ...row, choices: [9, 10, 11] })) },
    } as WorksheetPageModel;

    const before = layoutIssuesForBoxes(measurePageLayout(broken, { level: "Ages 4–5" }), "A4");
    expect(before.length).toBeGreaterThan(0);
    expect(before.map((issue) => issue.code)).toContain("layout-collision");

    const reflowed = fitPageLayout(broken, { level: "Ages 4–5", paper: "A4" });
    expect(reflowed.layoutFit?.objectScale).toBeLessThan(1);
    // an intentionally impossible page still gets the tightest reflow, and the
    // remaining problems are strictly fewer than before
    expect(layoutIssuesForPage(reflowed, { level: "Ages 4–5" }).length).toBeLessThan(before.length);
  });

  it("reflows a real over-full page until it fits completely", () => {
    const project = buildValidWorksheetProject(
      specFor({ pages: "4", level: "Grade 1", theme: "Animals", difficulty: "Challenge" }),
      4,
    );
    for (const page of project.pages) {
      expect(layoutIssuesForPage(page, { level: project.meta.level })).toEqual([]);
    }
  });

  it("never prints the MORE / FEWER prompt on top of the comparison cards", () => {
    const project = buildValidWorksheetProject(comparisonSpec(), 13);
    for (const [index, page] of project.pages.entries()) {
      expect(page.activity.kind).toBe("pick-one");
      const markup = renderToStaticMarkup(
        <PrintablePage project={project} page={page} index={index} mode="premium" />,
      );
      expect(markup).toContain("data-pick-prompt-label");
      // the label is a sized column, not oversized text layered behind cards
      expect(markup).not.toMatch(/position:absolute[^"]*"[^"]*MORE/);
      const label = markup.slice(markup.indexOf("data-pick-prompt-label"));
      const width = Number(label.match(/width:([\d.]+)mm/)?.[1]);
      const font = Number(label.match(/font-size:([\d.]+)mm/)?.[1]);
      expect(width).toBeLessThanOrEqual(32);
      expect(font * 0.68 * "FEWER".length).toBeLessThanOrEqual(width);
      expect(layoutIssuesForPage(page, { level: project.meta.level })).toEqual([]);
    }
  });
});

describe("semantic QA between instruction and drawn objects", () => {
  it("says exactly what to count when non-target objects are drawn", () => {
    const project = buildValidWorksheetProject(
      specFor({ pages: "3", activityType: "Counting", prompt: "Find and count the butterflies." }),
      6,
    );
    for (const page of project.pages) {
      expect(semanticInstructionIssues(page)).toEqual([]);
      if (page.activity.kind !== "find-count") continue;
      const hasDistractors = page.activity.sceneObjects.some((object) => object.decorative);
      if (hasDistractors) expect(page.instruction.toLowerCase()).toContain("only");
    }
  });

  it("flags an ambiguous instruction and clarifies it automatically", () => {
    const project = buildValidWorksheetProject(
      specFor({ pages: "3", activityType: "Counting", prompt: "Find and count the butterflies." }),
      6,
    );
    const scenePage = project.pages.find((page) => page.activity.kind === "find-count");
    if (!scenePage || scenePage.activity.kind !== "find-count") return;
    if (!scenePage.activity.sceneObjects.some((object) => object.decorative)) return;

    const ambiguous = { ...scenePage, instruction: "Count the insects in the picture." };
    expect(semanticInstructionIssues(ambiguous)[0]).toMatch(/does not say what to count/);

    const clarified = clarifyPageInstruction(ambiguous);
    expect(clarified.instruction.toLowerCase()).toContain("only");
    expect(semanticInstructionIssues(clarified)).toEqual([]);
  });

  it("leaves distractor-free counting pages untouched", () => {
    const project = buildValidWorksheetProject(specFor({ pages: "2" }), 3);
    for (const page of project.pages) {
      if (page.activity.kind !== "count-match" && page.activity.kind !== "count-circle") continue;
      expect(semanticInstructionIssues(page)).toEqual([]);
      expect(clarifyPageInstruction(page).instruction).toBe(page.instruction);
    }
  });

  it("keeps packs valid end to end after presentation QA", () => {
    for (const spec of [specFor({ pages: "5" }), comparisonSpec()]) {
      const project = buildValidWorksheetProject(spec, 7);
      const result = checkWorksheetProject(project, spec);
      expect(result.issues.filter((issue) => issue.severity === "error")).toEqual([]);
    }
  });
});

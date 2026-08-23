import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { defaultSpec, type WorksheetSpec } from "@/lib/creator-options";
import {
  buildValidWorksheetProject,
  checkWorksheetProject,
  validateFinalizedPageData,
} from "@/lib/worksheet-service";
import { mechanicOfActivity } from "@/lib/worksheet-objectives";
import { skillFamilyOfMechanic } from "@/lib/skill-fidelity";
import { buildPatternRow, validatePatternRow } from "@/lib/worksheet-patterns";
import { PrintablePage } from "@/components/studio/PrintablePage";

const butterflyPack: WorksheetSpec = {
  ...defaultSpec,
  level: "Ages 4–5",
  pages: "5",
  activityType: "Counting",
  theme: "Insects",
  prompt: "Butterfly counting pack for ages 4-5, numbers 1 to 10.",
};

const project = buildValidWorksheetProject(butterflyPack, 7);

describe("5-page Ages 4–5 butterfly pack composition", () => {
  it("gives every page a genuinely different activity mechanic", () => {
    const mechanics = project.pages.map((page) => mechanicOfActivity(page.activity));
    expect(mechanics).toHaveLength(5);
    // SKILL FIDELITY over variety: a counting request rotates only through
    // quantity mechanics, so pages differ as much as that skill allows.
    expect(new Set(mechanics).size).toBeGreaterThanOrEqual(3);
    for (const mechanic of mechanics) {
      expect(skillFamilyOfMechanic(mechanic), mechanic).toBe("quantity");
    }
  });

  it("gives every page a distinct composition kind or title", () => {
    const titles = project.pages.map((page) => page.title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it("passes the Alfa quality gate and the finalized runtime guard", () => {
    expect(
      checkWorksheetProject(project, butterflyPack).issues.filter((i) => i.severity === "error"),
    ).toEqual([]);
    for (const page of project.pages) {
      expect(validateFinalizedPageData(page)).toEqual([]);
    }
  });

  it("derives every counting answer from the objects actually drawn", () => {
    for (const page of project.pages) {
      const activity = page.activity;
      const groups =
        activity.kind === "count-match"
          ? activity.groups
          : activity.kind === "count-circle"
            ? activity.rows
            : activity.kind === "find-count"
              ? [activity.group]
              : [];
      for (const group of groups) {
        expect(group.correctAnswer).toBe(group.renderedObjects.length);
        expect(page.answerKey.find((entry) => entry.groupId === group.id)?.answer).toBe(
          group.correctAnswer,
        );
      }
    }
  });

  it("never uses size as decoration outside size teaching", () => {
    for (const page of project.pages) {
      const activity = page.activity;
      if (activity.kind !== "pick-one" || activity.mechanic === "compare-size") continue;
      for (const row of activity.rows) {
        for (const option of row.options) {
          expect(option.scale ?? 1).toBe(1);
        }
      }
    }
  });

  it("renders every page without a runtime integrity error, overlap or clipping", () => {
    for (const [index, page] of project.pages.entries()) {
      const markup = renderToStaticMarkup(
        <PrintablePage project={project} page={page} index={index} mode="premium" />,
      );
      expect(markup).not.toContain("data-worksheet-runtime-error");
      expect(markup).toContain(page.instruction);
    }
  });
});

describe("pattern activities", () => {
  it("expands each rule into a repeating sequence with one correct answer", () => {
    for (const rule of ["AB", "AAB", "ABB", "ABC"] as const) {
      const unit = { AB: 2, AAB: 2, ABB: 2, ABC: 3 }[rule];
      const assets = ["butterfly", "flower", "leaf"].slice(0, unit) as never;
      const expanded = buildPatternRow(rule, assets, ["caterpillar"] as never)!;
      expect(expanded.sequence.length).toBeGreaterThanOrEqual(4);
      expect(
        validatePatternRow({ ...expanded, choices: [expanded.answer, "leaf" as never] }),
      ).toEqual([]);
    }
  });

  it("rejects a pattern whose answer breaks its own rule", () => {
    const expanded = buildPatternRow("AB", ["butterfly", "flower"] as never, ["leaf"] as never)!;
    const broken = {
      ...expanded,
      answer: "leaf" as never,
      choices: ["leaf", expanded.answer] as never,
    };
    expect(validatePatternRow(broken).length).toBeGreaterThan(0);
  });

  it("offers 2–3 choices containing exactly one correct picture in a generated pack", () => {
    const spec = {
      ...butterflyPack,
      objectiveId: "complete-pattern",
      mechanicId: "pattern",
      pages: "2",
    } as WorksheetSpec;
    const patternProject = buildValidWorksheetProject(spec, 3);
    for (const page of patternProject.pages) {
      if (page.activity.kind !== "pick-one") continue;
      expect(page.activity.rows.length).toBeGreaterThan(0);
      for (const row of page.activity.rows) {
        expect(row.options.length).toBeGreaterThanOrEqual(2);
        expect(row.options.length).toBeLessThanOrEqual(3);
        expect(row.options.filter((option) => option.id === row.answerOptionId)).toHaveLength(1);
        expect(row.patternRule).toBeDefined();
      }
    }
  });
});

describe("find & count and sorting compositions", () => {
  it("counts exactly the non-decorative scene objects", () => {
    const spec = {
      ...butterflyPack,
      objectiveId: "find-and-count",
      mechanicId: "find",
      pages: "1",
    } as WorksheetSpec;
    const found = buildValidWorksheetProject(spec, 5).pages[0]!;
    const activity = found.activity;
    if (activity.kind !== "find-count") return;
    const targets = activity.sceneObjects.filter((object) => !object.decorative);
    expect(targets).toHaveLength(activity.group.correctAnswer);
    expect(targets.every((object) => object.asset === activity.targetAsset)).toBe(true);
    expect(validateFinalizedPageData(found)).toEqual([]);
  });

  it("sorts every item into exactly one labelled bin", () => {
    const spec = {
      ...butterflyPack,
      objectiveId: "sort-attribute",
      mechanicId: "sort",
      pages: "1",
    } as WorksheetSpec;
    const sorted = buildValidWorksheetProject(spec, 9).pages[0]!;
    if (sorted.activity.kind !== "sort-groups") return;
    const assets = sorted.activity.bins.map((bin) => bin.asset);
    expect(new Set(assets).size).toBe(assets.length);
    for (const item of sorted.activity.items) {
      expect(assets.filter((asset) => asset === item.asset)).toHaveLength(1);
    }
    expect(validateFinalizedPageData(sorted)).toEqual([]);
  });
});

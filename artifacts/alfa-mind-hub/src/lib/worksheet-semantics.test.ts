import { describe, expect, it } from "vitest";
import { defaultSpec, type WorksheetSpec } from "./creator-options";
import {
  buildValidWorksheetProject,
  checkWorksheetProject,
  finalizeWorksheetProject,
} from "./worksheet-service";
import { validateWorksheetPage } from "./worksheet-validation";
import { categoryCoversAssets } from "./semantic-topics";
import type { VisualAssetKey } from "./worksheet-model";
import { composeIdea, ideaToSpecPatch, mechanicMap, objectiveMap } from "./ideas/engine";
import { specForIdea } from "./ideas/printables";

const themes = ["Insects", "Animals", "Fruits", "Space", "Ocean", "Farm", "Weather"];

function specFor(theme: string, extra: Partial<WorksheetSpec> = {}): WorksheetSpec {
  return { ...defaultSpec, theme, ...extra };
}

describe("semantic validation across themes", () => {
  for (const theme of themes) {
    it(`generates a valid, exportable ${theme} worksheet`, () => {
      const spec = specFor(theme);
      const project = buildValidWorksheetProject(spec, 1);
      const result = checkWorksheetProject(project, spec);
      const errors = result.issues.filter((i) => i.severity === "error");
      expect(errors, JSON.stringify(errors, null, 2)).toHaveLength(0);
      expect(result.valid).toBe(true);
    });

    it(`keeps every ${theme} answer equal to the number of rendered objects`, () => {
      const project = buildValidWorksheetProject(specFor(theme), 2);
      for (const page of project.pages) {
        if (page.activity.kind !== "count-match" && page.activity.kind !== "count-circle") continue;
        const items =
          page.activity.kind === "count-match" ? page.activity.groups : page.activity.rows;
        for (const item of items) {
          const answer = page.answerKey.find((a) => a.groupId === item.id)?.answer;
          expect(answer).toBe(item.renderedObjects.length);
        }
      }
    });
  }
});

describe("countable categories vs non-countable themes", () => {
  it("accepts a category instruction when the rendered objects belong to it", () => {
    expect(categoryCoversAssets("insects", ["butterfly", "bee", "ladybug"])).toBe(true);
    expect(categoryCoversAssets("animals", ["cow", "frog", "bird"])).toBe(true);
    expect(categoryCoversAssets("fruits", ["apple"])).toBe(true);
    expect(categoryCoversAssets("space objects", ["star", "planet", "rocket", "moon"])).toBe(true);
  });

  it("rejects a category instruction when the artwork does not belong to it", () => {
    expect(categoryCoversAssets("insects", ["rocket"])).toBe(false);
    expect(categoryCoversAssets("fruits", ["car"])).toBe(false);
  });

  it("rejects non-countable themes", () => {
    for (const noun of ["space", "ocean", "weather", "farm"]) {
      expect(categoryCoversAssets(noun, ["star"])).toBe(false);
    }
  });
});

describe("page-level semantic validator", () => {
  const page = () => buildValidWorksheetProject(specFor("Insects"), 3).pages[0]!;

  it('does not flag "Count the insects in each group."', () => {
    const p = {
      ...page(),
      instruction: "Count the insects in each group.",
      title: "Count the Insects",
    };
    const codes = validateWorksheetPage(p, { level: "Ages 4–5" }).map((i) => i.code);
    expect(codes).not.toContain("abstract-subject");
  });

  it.each(["Count the space.", "Count the ocean.", "Circle the weather.", "Count the farm."])(
    "flags %s",
    (instruction) => {
      const p = { ...page(), instruction };
      const codes = validateWorksheetPage(p, { level: "Ages 4–5" }).map((i) => i.code);
      expect(codes).toContain("abstract-subject");
    },
  );

  it("flags an answer that does not match the rendered object count", () => {
    const p = page();
    const broken = {
      ...p,
      answerKey: p.answerKey.map((a, i) => (i === 0 ? { ...a, answer: a.answer + 3 } : a)),
    };
    const codes = validateWorksheetPage(broken, { level: "Ages 4–5" }).map((i) => i.code);
    expect(codes).toContain("answer-mismatch");
  });
});

describe("final preview/PDF worksheet payload", () => {
  const assets: VisualAssetKey[] = [
    "butterfly",
    "ladybug",
    "bee",
    "dragonfly",
    "cow",
    "apple",
    "star",
  ];

  for (const asset of assets) {
    it(`derives answers and unique choices from final ${asset} arrays for counts 1–10`, () => {
      for (let count = 1; count <= 10; count++) {
        const base = buildValidWorksheetProject(
          specFor("Insects", { level: "Grade 1", difficulty: "Challenge" }),
          count,
        );
        const page = base.pages.find((candidate) => candidate.activity.kind === "count-circle");
        expect(page?.activity.kind).toBe("count-circle");
        if (!page || page.activity.kind !== "count-circle") continue;

        const source = page.activity.rows[0]!;
        const renderedObjects = Array.from({ length: count }, (_, i) => ({
          id: `e2e-${asset}-${count}-${i + 1}`,
          asset,
        }));
        const finalPage = {
          ...page,
          activity: {
            ...page.activity,
            rows: [{ ...source, renderedObjects, choices: [99, 99, 99] }],
          },
          answerKey: [{ groupId: source.id, answer: 99 }],
        };
        const final = buildValidWorksheetProject(
          specFor("Insects", { level: "Grade 1", difficulty: "Challenge" }),
          count + 100,
        );
        const normalized = {
          ...final,
          pages: [finalPage],
        };
        const spec = specFor("Insects", {
          level: "Grade 1",
          difficulty: "Challenge",
          pages: "1",
        });
        const previewAndPdf = finalizeWorksheetProject(normalized, spec);
        const item = previewAndPdf.pages[0]!.activity;
        expect(item.kind).toBe("count-circle");
        if (item.kind !== "count-circle") continue;
        expect(item.rows[0]!.renderedObjects).toHaveLength(count);
        expect(previewAndPdf.pages[0]!.answerKey[0]!.answer).toBe(count);
        expect(item.rows[0]!.choices.filter((choice) => choice === count)).toHaveLength(1);
        expect(new Set(item.rows[0]!.choices).size).toBe(item.rows[0]!.choices.length);
      }
    });
  }
});

describe("Idea Lab objective preservation", () => {
  const cases = [
    ["compare-quantity", "compare", "compare-quantity", "pick-one"],
    ["sorting-size", "sort", "compare-size", "pick-one"],
    ["visual-attention", "visual-discrimination", "same-different", "pick-one"],
    ["beginning-sounds", "match", "beginning-sound", "pick-one"],
    ["patterns-ab", "pattern", "pattern-complete", "pick-one"],
    ["life-cycle", "sequence", "sequence-order", "order-sequence"],
    ["count-10", "count-circle", "count-circle", "count-circle"],
  ] as const;

  function ideaFor(objectiveId: string, mechanicId: string) {
    const objective = objectiveMap[objectiveId];
    const mechanic = mechanicMap[mechanicId];
    expect(objective).toBeDefined();
    expect(mechanic).toBeDefined();
    if (!objective || !mechanic) throw new Error("Missing regression fixture");
    return composeIdea({
      objective,
      mechanic,
      theme: "Insects",
      level: "Ages 4–5",
      difficulty: "Standard",
      duration: "10 minutes",
      pages: "2",
    });
  }

  it.each(cases)(
    "preserves %s through %s and renders %s",
    (objectiveId, mechanicId, expectedMechanic, expectedKind) => {
      const idea = ideaFor(objectiveId, mechanicId);
      const patch = ideaToSpecPatch(idea);
      const spec = specForIdea(idea);
      const project = buildValidWorksheetProject(spec, 9);

      expect(patch.objectiveId).toBe(objectiveId);
      expect(patch.mechanicId).toBe(mechanicId);
      expect(project.intent).toMatchObject({
        objectiveId,
        mechanicId,
        objective: idea.objective,
        skill: idea.skill,
        level: idea.level,
        theme: idea.theme,
        difficulty: idea.difficulty,
        printableFormat: idea.format,
      });
      expect(project.pages).toHaveLength(2);
      for (const page of project.pages) {
        expect(page.activity.kind).toBe(expectedKind);
        const actualMechanic =
          page.activity.kind === "count-match" || page.activity.kind === "count-circle"
            ? page.activity.kind
            : page.activity.mechanic;
        expect(actualMechanic).toBe(expectedMechanic);
      }
      expect(checkWorksheetProject(project, spec).valid).toBe(true);
    },
  );

  it("renders real MORE and FEWER comparisons with two unequal groups", () => {
    const spec = specForIdea(ideaFor("compare-quantity", "count-circle"));
    const project = buildValidWorksheetProject(spec, 13);
    for (const page of project.pages) {
      expect(page.activity.kind).toBe("pick-one");
      if (page.activity.kind !== "pick-one") continue;
      expect(new Set(page.activity.rows.map((row) => row.promptLabel))).toEqual(
        new Set(["MORE", "FEWER"]),
      );
      for (const row of page.activity.rows) {
        expect(row.options).toHaveLength(2);
        const counts = row.options.map((option) => option.renderedObjects.length);
        expect(counts[0]).not.toBe(counts[1]);
        const answer = row.options.find((option) => option.id === row.answerOptionId);
        expect(answer?.renderedObjects.length).toBe(
          row.promptLabel === "FEWER" ? Math.min(...counts) : Math.max(...counts),
        );
      }
    }
  });

  it("blocks a final worksheet whose mechanic contradicts its objective", () => {
    const comparisonSpec = specForIdea(ideaFor("compare-quantity", "compare"));
    const generic = buildValidWorksheetProject(
      { ...defaultSpec, activityType: "Matching", prompt: "Count and match insects." },
      4,
    );
    const result = checkWorksheetProject(generic, comparisonSpec);
    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("objective-vs-mechanic");
  });
});

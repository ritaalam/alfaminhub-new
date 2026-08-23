import { describe, expect, it } from "vitest";
import { defaultSpec, type WorksheetSpec } from "./creator-options";
import { parsePageDirectives } from "./page-directives";
import {
  buildValidWorksheetProject,
  checkWorksheetProject,
  validateFinalizedPageData,
} from "./worksheet-service";
import {
  shapeOfObject,
  shapeMatchIssues,
  composedShapeMatchIssues,
  categorySortIssues,
  basicShapes,
  isVisuallyCorrectShapeMatch,
  preschoolVisualShapeWhitelist,
} from "./object-semantics";

/**
 * CONTENT INTEGRITY INVARIANTS (general, not tied to one prompt)
 *
 *   A. object → shape matches are semantically correct
 *   B. a requested item count is rendered exactly
 *   C. requested per-category counts are rendered exactly
 *   D. rendered content and the answer key always agree
 */
const specFor = (prompt: string, pages: string): WorksheetSpec => ({
  ...defaultSpec,
  prompt,
  level: "Ages 4-5",
  pages,
});

const shapePrompt = [
  "Create a 2-page worksheet pack for Ages 4–5 about everyday shapes.",
  "",
  "Page 1: Match familiar objects to their basic shapes.",
  "Page 2: Sort 6 pictures — 3 animals and 3 things that go.",
].join("\n");

describe("object → shape matching integrity", () => {
  const project = buildValidWorksheetProject(specFor(shapePrompt, "2"));
  const activity = project.pages[0]!.activity;

  it("A — every object is paired with its one correct shape", () => {
    expect(activity.kind).toBe("match-pairs");
    if (activity.kind !== "match-pairs") return;
    for (const object of activity.left) {
      const expected = shapeOfObject[object.asset];
      expect(expected).toBeDefined();
      // the correct shape is actually printed on the page
      expect(activity.right.some((card) => card.asset === expected)).toBe(true);
      // and it is the card this object is paired with
      const partner = activity.right.find((card) => card.pairId === object.pairId);
      expect(partner?.asset).toBe(expected);
    }
    // no shape answers two different objects
    const shapes = activity.right.map((card) => card.asset);
    expect(new Set(shapes).size).toBe(shapes.length);
    expect(shapes.every((shape) => basicShapes.includes(shape as never))).toBe(true);
  });

  it("D — the answer key names the printed pairing", () => {
    if (activity.kind !== "match-pairs") return;
    for (const object of activity.left) {
      const keyed = project.pages[0]!.answerKey.find((entry) => entry.groupId === object.id);
      const expected = shapeOfObject[object.asset];
      const partner = activity.right.find((card) => card.pairId === object.pairId);
      expect(keyed?.answerText).toBe(expected);
      expect(partner).toBeDefined();
      expect(keyed?.answer).toBe(partner ? activity.right.indexOf(partner) + 1 : 0);
    }
    expect(shapeMatchIssues(activity.left, activity.right, project.pages[0]!.answerKey)).toEqual(
      [],
    );
  });

  it("rejects an arbitrary match that a target shape merely makes available", () => {
    const issues = shapeMatchIssues(
      [{ id: "l1", pairId: "p1", asset: "ball" }],
      [
        { id: "r1", pairId: "p1", asset: "triangle" },
        { id: "r2", pairId: "p2", asset: "circle" },
      ],
    );
    expect(issues.join(" ")).toMatch(/correct shape is a circle/i);
  });

  it.each([
    ["ball", "square", "circle"],
    ["tree", "circle", undefined],
    ["book", "triangle", undefined],
  ] as const)("rejects invalid association %s → %s", (object, wrongShape, approvedShape) => {
    const issues = shapeMatchIssues(
      [{ id: "left", pairId: "pair", asset: object }],
      [{ id: "right", pairId: "pair", asset: wrongShape }],
      [{ groupId: "left", answer: 1, answerText: wrongShape }],
    );
    expect(issues.length).toBeGreaterThan(0);
    if (approvedShape) expect(issues.join(" ")).toContain(approvedShape);
    else expect(issues.join(" ")).toMatch(/no clear basic shape/i);
  });

  it.each([
    ["ball", "square"],
    ["tree", "circle"],
    ["book", "triangle"],
  ] as const)("the finalized runtime/export guard rejects %s → %s", (object, wrongShape) => {
    const page = project.pages[0]!;
    if (page.activity.kind !== "match-pairs") throw new Error("Expected an object-to-shape page");
    const first = page.activity.left[0];
    if (!first) throw new Error("Expected at least one object-to-shape pair");
    const corrupted = {
      ...page,
      activity: {
        ...page.activity,
        left: page.activity.left.map((item, index) =>
          index === 0 ? { ...item, asset: object } : item,
        ),
        right: page.activity.right.map((item) =>
          item.pairId === first.pairId ? { ...item, asset: wrongShape } : item,
        ),
      },
      answerKey: page.answerKey.map((entry) =>
        entry.groupId === first.id ? { ...entry, answerText: wrongShape } : entry,
      ),
    };
    expect(validateFinalizedPageData(corrupted).join(" ")).toMatch(
      /approved|correct shape|clear basic shape/i,
    );
  });

  it("rejects invalid associations in the composed fallback representation", () => {
    const issues = composedShapeMatchIssues(
      [{ id: "ball-card", targetId: "wrong-target", object: { asset: "ball" } }],
      [{ id: "wrong-target", object: { asset: "square" } }],
      [{ groupId: "ball-card", answer: 1, answerText: "square" }],
    );
    expect(issues.join(" ")).toMatch(/approved circle/i);
  });

  it("validates the exact rendered illustration variant, not only a semantic label", () => {
    expect(isVisuallyCorrectShapeMatch("ball", "circle")).toBe(true);
    expect(isVisuallyCorrectShapeMatch("gift", "square")).toBe(false);
    expect(isVisuallyCorrectShapeMatch("book", "rectangle")).toBe(false);
    expect(isVisuallyCorrectShapeMatch("closedBook", "rectangle")).toBe(true);
    expect(isVisuallyCorrectShapeMatch("triangularRoadSign", "triangle")).toBe(true);
  });

  it("contains only exact renderer assets in the visual-shape whitelist", () => {
    expect(preschoolVisualShapeWhitelist.gift).toBeUndefined();
    expect(preschoolVisualShapeWhitelist.book).toBeUndefined();
    expect(Object.entries(preschoolVisualShapeWhitelist)).toHaveLength(4);
    for (const [asset, association] of Object.entries(preschoolVisualShapeWhitelist)) {
      expect(association?.illustration).toBe(asset);
      expect(shapeOfObject[asset as keyof typeof shapeOfObject]).toBe(association?.shape);
    }
  });

  it.each([
    ["gift", "square"],
    ["book", "rectangle"],
  ] as const)(
    "rejects visually ambiguous rendered variant %s → %s even when the key agrees",
    (object, shape) => {
      const issues = shapeMatchIssues(
        [{ id: "left", pairId: "pair", asset: object }],
        [{ id: "right", pairId: "pair", asset: shape }],
        [{ groupId: "left", answer: 1, answerText: shape }],
      );
      expect(issues.join(" ")).toMatch(/no clear basic shape|illustration variant/i);
    },
  );
});

describe("category sorting quantity integrity", () => {
  const project = buildValidWorksheetProject(specFor(shapePrompt, "2"));
  const page = project.pages[1]!;

  it("B/C — renders exactly the requested totals per category", () => {
    expect(page.activity.kind).toBe("sort-groups");
    if (page.activity.kind !== "sort-groups") return;
    expect(page.activity.items).toHaveLength(6);
    for (const bin of page.activity.bins) {
      const rendered = page.activity.items.filter((item) => bin.members?.includes(item.asset));
      expect(rendered).toHaveLength(3);
    }
  });

  it("D — every item belongs to one box and the key matches the artwork", () => {
    if (page.activity.kind !== "sort-groups") return;
    expect(categorySortIssues(page.activity.bins, page.activity.items, page.answerKey)).toEqual([]);
    for (const bin of page.activity.bins) {
      const rendered = page.activity.items.filter((item) =>
        bin.members?.includes(item.asset),
      ).length;
      expect(page.answerKey.find((entry) => entry.groupId === bin.id)?.answer).toBe(rendered);
    }
  });

  it("flags metadata that claims more pictures than are drawn", () => {
    const issues = categorySortIssues(
      [
        { id: "b1", label: "Things We Eat", members: ["apple", "banana", "carrot", "egg"] },
        { id: "b2", label: "Things We Play With", members: ["ball", "balloon", "bicycle", "boat"] },
      ],
      [
        { id: "i1", asset: "apple" },
        { id: "i2", asset: "ball" },
      ],
      [
        { groupId: "b1", answer: 4 },
        { groupId: "b2", answer: 4 },
      ],
    );
    expect(issues).toHaveLength(2);
    expect(issues.join(" ")).toMatch(/says 4 pictures but 1 are drawn/i);
  });

  it("flags duplicated pictures used to pad a requested count", () => {
    const issues = categorySortIssues(
      [{ id: "b1", label: "Things We Eat", members: ["apple", "banana"] }],
      [
        { id: "i1", asset: "apple" },
        { id: "i2", asset: "apple" },
      ],
    );
    expect(issues.join(" ")).toMatch(/drawn twice/i);
  });
});

describe("the original 4-page pack keeps its exact quantities", () => {
  const prompt = [
    "Create a 4-page worksheet pack for Ages 4–5 about shapes and thinking skills.",
    "",
    "Page 1: Circle all the triangles from a mixed group of shapes.",
    "Page 2: Match familiar objects to their basic shapes.",
    "Page 3: Sort 8 pictures — 4 food items and 4 things we play with.",
    "Page 4: Count a group of objects and draw the same number of circles.",
  ].join("\n");
  const spec = specFor(prompt, "4");

  it("parses the requested totals", () => {
    const directive = parsePageDirectives(spec)[2]!;
    expect(directive.semanticRequirements.requiredItemCount).toBe(8);
    expect(directive.semanticRequirements.categoryGroups?.map((group) => group.count)).toEqual([
      4, 4,
    ]);
  });

  it("renders 8 sortable pictures with a consistent answer key and no errors", () => {
    const project = buildValidWorksheetProject(spec);
    const sort = project.pages[2]!;
    expect(sort.activity.kind).toBe("sort-groups");
    if (sort.activity.kind === "sort-groups") {
      expect(sort.activity.items).toHaveLength(8);
      // no writing required at this age
      expect(sort.instruction).toMatch(/draw a line/i);
      expect(categorySortIssues(sort.activity.bins, sort.activity.items, sort.answerKey)).toEqual(
        [],
      );
    }
    expect(
      checkWorksheetProject(project, spec).issues.filter((issue) => issue.severity === "error"),
    ).toEqual([]);
  });
});

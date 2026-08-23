import { describe, expect, it } from "vitest";
import { defaultSpec, type WorksheetSpec } from "@/lib/creator-options";
import { buildValidWorksheetProject } from "@/lib/worksheet-service";
import { validatePatternRow } from "@/lib/worksheet-patterns";

const prompt = `Create a 2-page pattern worksheet for ages 4-5.
Page 1: Complete the pattern. Show exactly 6 AB patterns. Each pattern has exactly one missing item at the end and exactly 3 answer choices.
Page 2: Complete the pattern. Show exactly 6 ABB patterns. Each pattern has exactly one missing item at the end and exactly 3 answer choices.`;

const spec: WorksheetSpec = { ...defaultSpec, level: "Ages 4–5", pages: "2", prompt };

describe("2-page AB / ABB pattern pack (Ages 4–5)", () => {
  const project = buildValidWorksheetProject(spec, 3);

  it("accepts the request and builds both pages", () => {
    expect(project.pages).toHaveLength(2);
  });

  for (const [index, rule] of [
    [0, "AB"],
    [1, "ABB"],
  ] as const) {
    it(`page ${index + 1} shows exactly 6 ${rule} patterns with 3 choices and one missing item`, () => {
      const activity = project.pages[index]!.activity;
      expect(activity.kind).toBe("pick-one");
      if (activity.kind !== "pick-one") return;
      expect(activity.rows).toHaveLength(6);
      for (const row of activity.rows) {
        expect(row.patternRule).toBe(rule);
        expect(row.promptGap).toBe(true);
        expect(row.options).toHaveLength(3);
        expect(row.options.filter((o) => o.id === row.answerOptionId)).toHaveLength(1);
        const answer = row.options.find((o) => o.id === row.answerOptionId)!.renderedObjects[0]!
          .asset;
        expect(
          validatePatternRow({
            rule: row.patternRule,
            unit: row.patternUnit,
            sequence: (row.promptObjects ?? []).map((o) => o.asset),
            answer,
            choices: row.options.map((o) => o.renderedObjects[0]!.asset),
          }),
        ).toEqual([]);
      }
    });
  }
});

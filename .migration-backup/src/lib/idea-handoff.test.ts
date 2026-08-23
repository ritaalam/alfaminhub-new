/**
 * Idea Lab → Creator → Generator handoff.
 *
 * The mechanic decides what the child does; the theme only decides what the
 * pictures show. These tests reproduce the real Idea Lab flow and assert the
 * printable that comes out is still the activity the teacher chose.
 */

import { describe, expect, it } from "vitest";
import { generateIdeas, ideaToSpecPatch, type IdeaSpec } from "@/lib/ideas/engine";
import { defaultSpec, type WorksheetSpec } from "@/lib/creator-options";
import { buildValidWorksheetProject, checkWorksheetProject } from "@/lib/worksheet-service";
import { validateMemoryPairs } from "@/lib/worksheet-memory";
import { resolveObjectiveProfile } from "@/lib/worksheet-objectives";
import { validateHandoffContract } from "@/lib/activity-spec";

function specFor(idea: IdeaSpec): WorksheetSpec {
  return { ...defaultSpec, ...ideaToSpecPatch(idea) } as WorksheetSpec;
}

function findIdea(constraints: Parameters<typeof generateIdeas>[0], mechanicId: string) {
  for (let seed = 1; seed < 40; seed++) {
    const match = generateIdeas(constraints, 24, seed).find((i) => i.mechanicId === mechanicId);
    if (match) return match;
  }
  return undefined;
}

describe("Idea Lab handoff", () => {
  it("keeps Memory Pairs vocabulary an actual memory card game, not counting", () => {
    const idea = findIdea(
      { subject: "Early Literacy", theme: "Animals", level: "Ages 4–5" },
      "memory",
    );
    expect(idea, "Idea Lab should compose a memory-pairs literacy idea").toBeTruthy();

    const spec = specFor(idea!);
    expect(spec.subjectDomain).toBe("Early Literacy");
    expect(spec.activityMechanic).toBe("memory-pairs");
    expect(resolveObjectiveProfile(spec).mechanic).toBe("memory-pairs");

    const project = buildValidWorksheetProject(spec, 1);
    for (const page of project.pages) {
      expect(page.activity.kind).toBe("memory-pairs");
      expect(validateMemoryPairs(page)).toEqual([]);
      if (page.activity.kind !== "memory-pairs") continue;
      const cards = page.activity.cards;
      expect(cards.length % 2).toBe(0);
      const counts = new Map<string, number>();
      for (const card of cards) counts.set(card.pairId, (counts.get(card.pairId) ?? 0) + 1);
      expect([...counts.values()].every((n) => n === 2)).toBe(true);
      expect(counts.size).toBeGreaterThanOrEqual(3);
    }
    expect(validateHandoffContract(spec, project)).toEqual([]);
    expect(checkWorksheetProject(project, spec).valid).toBe(true);
  });

  it("never substitutes counting for a non-maths mechanic", () => {
    const cases: Array<[string, string, string]> = [
      ["Early Literacy", "Animals", "memory"],
      ["Science", "Nature", "sort"],
      ["Early Literacy", "Food", "trace"],
    ];
    for (const [subject, theme, mechanicId] of cases) {
      const idea = findIdea({ subject, theme, level: "Ages 4–5" }, mechanicId);
      if (!idea) continue;
      const spec = specFor(idea);
      const project = buildValidWorksheetProject(spec, 3);
      for (const page of project.pages) {
        expect(page.activity.kind, `${subject}/${mechanicId}`).not.toBe("count-match");
        expect(page.activity.kind, `${subject}/${mechanicId}`).not.toBe("count-circle");
      }
      expect(validateHandoffContract(spec, project)).toEqual([]);
    }
  });

  it("still routes genuine counting ideas to counting", () => {
    const idea = findIdea(
      { subject: "Early Math", skill: "Counting", level: "Ages 4–5" },
      "count-circle",
    );
    if (!idea) return;
    const spec = specFor(idea);
    const project = buildValidWorksheetProject(spec, 1);
    expect(project.pages[0]!.activity.kind).toBe("count-circle");
  });

  it("reports mechanic drift as a hard handoff failure", () => {
    const idea = findIdea(
      { subject: "Early Literacy", theme: "Animals", level: "Ages 4–5" },
      "memory",
    );
    const spec = specFor(idea!);
    const project = buildValidWorksheetProject(spec, 1);
    const counting = {
      ...project,
      pages: project.pages.map((page) => ({
        ...page,
        activity: {
          kind: "count-match" as const,
          mechanic: "count-match" as const,
          groups: [],
          numberChoices: [],
        },
      })),
    };
    const issues = validateHandoffContract(spec, counting);
    expect(issues.map((i) => i.code)).toContain("handoff-mechanic-drift");
  });
});

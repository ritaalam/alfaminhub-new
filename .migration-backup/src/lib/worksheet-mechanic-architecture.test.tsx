/**
 * GENERIC MECHANIC ARCHITECTURE.
 *
 * These tests are deliberately cross-mechanic: they assert that the pipeline
 * (prompt → mechanic → content model → renderer → validation) behaves the same
 * way for EVERY mechanic, so no single activity needs its own patch.
 */

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PrintablePage } from "@/components/studio/PrintablePage";
import { defaultSpec, type WorksheetSpec } from "@/lib/creator-options";
import { buildValidWorksheetProject } from "@/lib/worksheet-service";
import { validateStageSequence, orderedProcesses } from "@/lib/worksheet-sequence";
import {
  assertActivityContract,
  contentTypeOfActivity,
  expectedContentTypeForMechanic,
  mechanicRegistry,
} from "@/lib/mechanic-registry";
import { mechanicOfActivity } from "@/lib/worksheet-objectives";
import type { WorksheetMechanicId } from "@/lib/worksheet-model";

function specFor(prompt: string, pages = "2"): WorksheetSpec {
  return { ...defaultSpec, prompt, level: "Ages 4–5", pages } as WorksheetSpec;
}

const LIFE_CYCLE =
  "Create an activity for ages 4–5 about the butterfly life cycle. Children must put these four stages in the correct order: 1. egg, 2. caterpillar, 3. chrysalis, 4. butterfly. This must be a sequencing activity, not counting.";

describe("mechanic architecture", () => {
  it("turns a butterfly life-cycle request into real sequencing, never counting", () => {
    const spec = specFor(LIFE_CYCLE);
    const project = buildValidWorksheetProject(spec, 1);

    expect(project.title).toBe("Butterfly Life Cycle");
    expect(project.title.toLowerCase()).not.toContain("counting");
    expect(project.meta.skill).toBe("Sequencing");
    expect(project.pages).toHaveLength(2);

    for (const page of project.pages) {
      expect(page.activity.kind).toBe("sequence-stages");
      if (page.activity.kind !== "sequence-stages") continue;
      const activity = page.activity;

      // ordered stages, each exactly once — no quantities anywhere
      expect(activity.cards.map((c) => c.stageId).sort()).toEqual([
        "butterfly",
        "caterpillar",
        "chrysalis",
        "egg",
      ]);
      expect(activity.slots).toHaveLength(4);
      expect(page.instruction.toLowerCase()).toContain("order");
      expect(page.instruction.toLowerCase()).not.toContain("count");

      // scientific correctness
      const order = Object.fromEntries(activity.cards.map((c) => [c.stageId, c.order]));
      expect(order["egg"]).toBe(1);
      expect(order["caterpillar"]).toBe(2);
      expect(order["chrysalis"]).toBe(3);
      expect(order["butterfly"]).toBe(4);
      expect(validateStageSequence(page)).toEqual([]);
    }
  });

  it("generates every known life cycle from the same generic path", () => {
    for (const process of orderedProcesses) {
      const spec = specFor(`Put the stages of the ${process.noun} in the correct order.`, "1");
      const project = buildValidWorksheetProject(spec, 1);
      const page = project.pages[0]!;
      expect(page.activity.kind, process.id).toBe("sequence-stages");
      if (page.activity.kind !== "sequence-stages") continue;
      expect(page.activity.processId, process.id).toBe(process.id);
      expect(page.activity.cards.map((c) => c.stageId).sort()).toEqual(
        [...process.stages.map((s) => s.id)].sort(),
      );
      expect(validateStageSequence(page)).toEqual([]);
    }
  });

  it("keeps the requested mechanic on every page of a pack", () => {
    const cases: Array<[string, WorksheetMechanicId]> = [
      [LIFE_CYCLE, "sequence-order"],
      ["A memory pairs game with farm animals for ages 4-5.", "memory-pairs"],
      [
        "Sort the pictures into two groups: things that fly and things that swim.",
        "sort-attribute",
      ],
      ["Count the bees in each group and draw a line to the correct number.", "count-match"],
      ["Complete the pattern with flowers and leaves.", "pattern-complete"],
    ];
    for (const [prompt, mechanic] of cases) {
      const project = buildValidWorksheetProject(specFor(prompt, "3"), 1);
      expect(project.pages).toHaveLength(3);
      for (const page of project.pages) {
        // a locked pack may vary inside one content model (Count & Match →
        // Count & Circle) but never across educational activity types
        expect(contentTypeOfActivity(page.activity), `${mechanic} / ${page.id}`).toBe(
          expectedContentTypeForMechanic(mechanic),
        );
        const actual = mechanicOfActivity(page.activity);
        expect(() => assertActivityContract(actual, page.activity)).not.toThrow();
        if (expectedContentTypeForMechanic(mechanic) !== "quantityGroups") {
          expect(actual, `${mechanic} / ${page.id}`).toBe(mechanic);
        }
      }
    }
  });

  it("every registered mechanic declares a renderer and a matching content model", () => {
    for (const entry of Object.values(mechanicRegistry)) {
      expect(entry.kinds.length, entry.mechanic).toBeGreaterThan(0);
      expect(entry.contentType).toBe(expectedContentTypeForMechanic(entry.mechanic));
      expect(entry.title("Butterflies")).toBeTruthy();
    }
  });

  it("prints numbered slots and one cut-out card per stage", () => {
    const project = buildValidWorksheetProject(specFor(LIFE_CYCLE, "1"), 1);
    const page = project.pages[0]!;
    const html = renderToStaticMarkup(
      <PrintablePage project={project} page={page} index={0} mode="premium" />,
    );
    expect(html.match(/data-sequence-slot="/g) ?? []).toHaveLength(4);
    for (const stage of ["egg", "caterpillar", "chrysalis", "butterfly"]) {
      expect(html).toContain(`data-stage-id="${stage}"`);
    }
    expect(html).not.toMatch(/data-group-id|data-number-card/);
  });

  it("fails loudly instead of printing the wrong activity", () => {
    const project = buildValidWorksheetProject(specFor(LIFE_CYCLE, "1"), 1);
    const activity = project.pages[0]!.activity;
    expect(() => assertActivityContract("count-match", activity)).toThrow(/mechanic/i);
  });

  it("flags an unscientific stage order", () => {
    const project = buildValidWorksheetProject(specFor(LIFE_CYCLE, "1"), 1);
    const page = project.pages[0]!;
    if (page.activity.kind !== "sequence-stages") throw new Error("expected sequencing");
    const broken = {
      ...page,
      activity: {
        ...page.activity,
        cards: page.activity.cards.map((card) =>
          card.stageId === "butterfly" ? { ...card, order: 1 } : card,
        ),
      },
    };
    expect(validateStageSequence(broken).join(" ")).toMatch(/butterfly/i);
  });
});

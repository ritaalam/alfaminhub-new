/**
 * REAL PIPELINE REGRESSION — Quick Create → "Generate My Worksheet".
 *
 * This mirrors the production handler in `WorksheetCreator.handleGenerate`
 * exactly (prompt state → applyPromptIntent → generateWorksheetProject →
 * finalizeWorksheetProject → Studio renderer), so a divergence between the
 * unit tests and the live preview fails here instead of only in the browser.
 */

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { defaultSpec } from "@/lib/creator-options";
import { applyPromptIntent, canonicalQuickCreateRequest } from "@/lib/learning-domains";
import { finalizeWorksheetProject, generateWorksheetProject } from "@/lib/worksheet-service";
import { planWorksheetSpec } from "@/lib/worksheet-ai-planner";
import type { WorksheetProject } from "@/lib/worksheet-model";
import { PrintablePage } from "@/components/studio/PrintablePage";

const PROMPT =
  "Create a beginning phonics activity for ages 4–5 teaching the letter B and the /b/ sound. Children identify uppercase B and lowercase b, trace B and b, and circle pictures whose names begin with /b/. Use ball, banana, bear, bird and book as correct examples and include some non-B distractors. This is a phonics activity, not counting.";
const DETAILED_COUNTING_PROMPT =
  "Create a 1-page A4 counting worksheet for ages 4–5 with exactly 3 groups: 2 apples, 4 stars, and 5 fish. Each group must visually contain exactly the requested number of objects. Give exactly 3 number choices for each group, including exactly one correct answer. Do not replace, merge, or omit any group. The answer key must match the visible objects exactly.";

/** byte-for-byte what the Generate My Worksheet button does */
async function generateLikeTheButton(prompt: string, level: string, pages: string) {
  const activeSpec = applyPromptIntent({ ...defaultSpec, prompt, level, pages });
  const structured = await generateWorksheetProject(activeSpec);
  return finalizeWorksheetProject(structured, activeSpec);
}

describe("Quick Create production pipeline — Letter B", () => {
  let project: WorksheetProject;

  it("produces a phonics pack, never a counting pack", async () => {
    project = await generateLikeTheButton(PROMPT, "Ages 4–5", "2");
    expect(project.title).toBe("Letter B Phonics Pack");
    expect(project.title).not.toMatch(/Tractors/i);
    expect(project.pages).toHaveLength(2);
    const mechanics = project.pages.map((p) => (p.activity as { mechanic?: string }).mechanic);
    expect(mechanics).not.toContain("count-match");
    expect(mechanics).not.toContain("count-circle");
  });

  it("stamps the current engine signature and covers every requested skill", () => {
    expect(project.generation?.generationEngineVersion).toBe(
      "alfa-engine-8-production-diagnostics",
    );
    expect(project.generation?.requestedSkills.slice().sort()).toEqual(
      ["beginning-sound-discrimination", "letter-recognition", "letter-trace"].sort(),
    );
    for (const skill of project.generation!.requestedSkills) {
      expect(project.generation!.coveredSkills).toContain(skill);
    }
  });

  it("page 1 traces B/b and page 2 is picture sound discrimination", () => {
    expect(project.pages[0]!.activity.kind).toBe("letter-trace");
    const page2 = project.pages[1]!;
    expect(page2.activity.kind).toBe("sound-hunt");
    const items = (page2.activity as { items: Array<{ word: string; isTarget: boolean }> }).items;
    expect(items.filter((i) => i.isTarget).length).toBeGreaterThanOrEqual(3);
    expect(items.filter((i) => !i.isTarget).length).toBeGreaterThanOrEqual(3);
  });

  it("renders both pages with real B pictures and non-B distractors", () => {
    const html = project.pages
      .map((page, index) =>
        renderToStaticMarkup(
          <PrintablePage page={page} project={project} index={index} mode={project.printMode} />,
        ),
      )
      .join("\n");

    expect(html).toContain("Trace the Letter B");
    expect(html).toContain("Which Pictures Begin with B?");
    const items = (
      project.pages[1]!.activity as { items: Array<{ word: string; isTarget: boolean }> }
    ).items;
    for (const item of items) expect(html).toContain(item.word);
    expect(html).not.toMatch(/Trace the Tractors/);
  });
});

describe("Quick Create production pipeline — detailed count groups", () => {
  it("reaches a valid per-group choice worksheet without losing object/count pairs", async () => {
    let plannerCalled = false;
    const initialSpec = applyPromptIntent({
      ...defaultSpec,
      prompt: DETAILED_COUNTING_PROMPT,
      level: "Ages 4–5",
      pages: "1",
      paper: "A4",
    });
    // This is the same first stage as WorksheetCreator.handleGenerate. The
    // fully specified contract must stay local rather than let a provider patch
    // alter the deterministic counting plan.
    const planning = await planWorksheetSpec(initialSpec, "quick", async () => {
      plannerCalled = true;
      throw new Error("The count contract should not call the planner.");
    });
    expect(plannerCalled).toBe(false);
    expect(planning.source).toBe("local");
    const project = finalizeWorksheetProject(
      await generateWorksheetProject(planning.spec),
      planning.spec,
    );

    expect(project.pages).toHaveLength(1);
    const page = project.pages[0]!;
    expect(page.activity.kind).toBe("count-circle");
    if (page.activity.kind !== "count-circle") throw new Error("Expected a count-circle page.");

    expect(
      page.activity.rows.map((row) => ({
        asset: row.renderedObjects[0]?.asset,
        count: row.renderedObjects.length,
        answer: row.correctAnswer,
        choices: row.choices,
      })),
    ).toEqual([
      { asset: "apple", count: 2, answer: 2, choices: expect.any(Array) },
      { asset: "star", count: 4, answer: 4, choices: expect.any(Array) },
      { asset: "fish", count: 5, answer: 5, choices: expect.any(Array) },
    ]);
    for (const row of page.activity.rows) {
      expect(row.choices).toHaveLength(3);
      expect(row.choices.filter((choice) => choice === row.correctAnswer)).toHaveLength(1);
    }
    expect(page.answerKey).toEqual(
      page.activity.rows.map((row) => ({ groupId: row.id, answer: row.renderedObjects.length })),
    );

    const html = renderToStaticMarkup(
      <PrintablePage page={page} project={project} index={0} mode={project.printMode} />,
    );
    expect(html).toContain("How Many Can You Find?");
    expect(html).toContain("Apples");
    expect(html).toContain("Stars");
    expect(html).toContain("Fish");
  });
});

describe("Quick Create production pipeline — mixed sea creatures", () => {
  it("infers Sea Creatures before generation instead of retaining the Insects default", async () => {
    const request = canonicalQuickCreateRequest({
      ...defaultSpec,
      prompt: "Count fish and starfish, then circle the correct number.",
      level: "Ages 4–5",
      pages: "1",
    });

    expect(request.theme).toBe("Sea Creatures");
    expect(request.theme).not.toBe("Insects");
    expect(request.promptRequirements?.exactObjects).toEqual(["fish", "starfish"]);

    const project = finalizeWorksheetProject(
      await generateWorksheetProject(request),
      request,
    );
    expect(project.pages[0]?.activity.kind).toBe("count-circle");
    if (project.pages[0]?.activity.kind !== "count-circle") {
      throw new Error("Expected the mixed sea-creature request to produce Count & Circle.");
    }
    expect(new Set(project.pages[0].activity.rows.map((row) => row.renderedObjects[0]?.asset))).toEqual(
      new Set(["fish", "starfish"]),
    );
  });
});

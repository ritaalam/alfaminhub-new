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
import { applyPromptIntent } from "@/lib/learning-domains";
import { finalizeWorksheetProject, generateWorksheetProject } from "@/lib/worksheet-service";
import type { WorksheetProject } from "@/lib/worksheet-model";
import { PrintablePage } from "@/components/studio/PrintablePage";

const PROMPT =
  "Create a beginning phonics activity for ages 4–5 teaching the letter B and the /b/ sound. Children identify uppercase B and lowercase b, trace B and b, and circle pictures whose names begin with /b/. Use ball, banana, bear, bird and book as correct examples and include some non-B distractors. This is a phonics activity, not counting.";

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

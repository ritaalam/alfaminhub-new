/**
 * FINAL REGRESSION — full 3-page Letter B phonics pack (Ages 4–5).
 *
 * Exact teacher-authored quantities, written as ordinary prompt text (no
 * structured fields), must survive the real Creator pipeline and the
 * production renderer:
 *   Page 1 — 15 pictures, 5 × 3, exactly 6 B and 9 non-B, no duplicates
 *   Page 2 — 6 pictures, each with its first letter missing, no duplicates
 *   Page 3 — 8 pictures, letter choices drawn only from those 8 pictures
 */

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { defaultSpec } from "@/lib/creator-options";
import { applyPromptIntent } from "@/lib/learning-domains";
import { finalizeWorksheetProject, generateWorksheetProject } from "@/lib/worksheet-service";
import { PrintablePage } from "@/components/studio/PrintablePage";

const plainPrompt = [
  "Create a 3 page Letter B phonics pack for Ages 4-5.",
  "Page 1: circle the pictures that begin with B, 15 different pictures in a 5 x 3 grid, exactly 6 B pictures and 9 non-B pictures.",
  "Page 2: write the first letter activity with 6 different pictures, each word shown with the first letter missing.",
  "Page 3: match each picture to its beginning letter with 8 different pictures.",
].join("\n");

async function buildPack(prompt: string) {
  const request = applyPromptIntent({ ...defaultSpec, prompt, pages: "3", level: "Ages 4-5" });
  const project = finalizeWorksheetProject(await generateWorksheetProject(request), request);
  const markup = project.pages.map((page, index) =>
    renderToStaticMarkup(
      <PrintablePage page={page} project={project} index={index} mode={project.printMode} />,
    ),
  );
  return { project, markup };
}

function all(markup: string, re: RegExp) {
  return [...markup.matchAll(re)].map((m) => m[1]!);
}

describe("3-page Letter B pack honours plain-text quantities", () => {
  it("renders 15 / 6 / 8 pictures with correct composition", async () => {
    const { project, markup } = await buildPack(plainPrompt);
    markup.forEach((m) => expect(m).not.toContain("data-worksheet-runtime-error"));

    // ---- Page 1: 15 pictures, 6 B / 9 non-B, unique
    const p1Words = all(markup[0]!, /data-sound-word="([^"]+)"/g);
    const p1Targets = all(markup[0]!, /data-sound-target-item="(\d)"/g);
    expect(p1Words).toHaveLength(15);
    expect(new Set(p1Words).size).toBe(15);
    expect(p1Words.filter((w) => w.toLowerCase().startsWith("b"))).toHaveLength(6);
    expect(p1Words.filter((w) => !w.toLowerCase().startsWith("b"))).toHaveLength(9);
    expect(p1Targets.filter((t) => t === "1")).toHaveLength(6);

    // ---- Page 2: 6 pictures with a missing first letter, unique
    const p2Words = all(markup[1]!, /data-complete-word="([^"]+)"/g);
    expect(project.pages[1]!.activity.kind).toBe("word-complete");
    expect(p2Words).toHaveLength(6);
    expect(new Set(p2Words).size).toBe(6);
    const items = (
      project.pages[1]!.activity as { items: Array<{ word: string; missingLetter: string }> }
    ).items;
    expect(items).toHaveLength(6);
    for (const item of items) {
      expect(item.missingLetter.toLowerCase()).toBe(item.word[0]!.toLowerCase());
    }

    // ---- Page 3: 8 pictures, letter choices only from those pictures
    const p3Words = all(markup[2]!, /data-match-picture-word="([^"]+)"/g);
    const p3Letters = all(markup[2]!, /data-match-letter-card="([^"]+)"/g);
    expect(project.pages[2]!.activity.kind).toBe("picture-letter-match");
    expect(p3Words).toHaveLength(8);
    expect(new Set(p3Words).size).toBe(8);
    const initials = new Set(p3Words.map((w) => w[0]!.toUpperCase()));
    expect(new Set(p3Letters.map((l) => l.toUpperCase()))).toEqual(initials);
    expect(p3Letters).toHaveLength(initials.size);
  }, 30000);
});

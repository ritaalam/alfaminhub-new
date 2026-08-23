/**
 * REAL UI-PATH REGRESSION — "Write the First Letter" (Page 2).
 *
 * Runs the exact Creator handler pipeline (applyPromptIntent →
 * generateWorksheetProject → finalizeWorksheetProject) and then renders the
 * finalized page with the production renderer the Studio uses, asserting the
 * DOM really contains six picture cards: three B words and three non-B words.
 * A page that quietly falls back to the age default of three cards fails here.
 */

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { defaultSpec } from "@/lib/creator-options";
import { applyPromptIntent } from "@/lib/learning-domains";
import { finalizeWorksheetProject, generateWorksheetProject } from "@/lib/worksheet-service";
import { PrintablePage } from "@/components/studio/PrintablePage";

const markdownPrompt = [
  "Create a 3-page worksheet pack about beginning sounds for Ages 4–5.",
  "**Page 1.** Create a circle beginning-sound activity. Show exactly **15 different pictures** in exactly a **5 × 3 grid**. Mix B and non-B words.",
  "**Page 2.** Create a write-the-first-letter activity. Show exactly **6 different pictures** with a blank line under each picture. Include exactly **3 B pictures and 3 non-B pictures**.",
  "**Page 3.** Create a different activity from Pages 1 and 2. Show exactly **8 different pictures** and ask children to **match each picture to its beginning letter**.",
].join("\n\n");

const plainPrompt = [
  "Create a 3 page beginning sounds pack for Ages 4-5.",
  "Page 1: circle the pictures that begin with B, 15 different pictures in a 5 x 3 grid.",
  "Page 2: write the first letter activity with six different pictures and a blank line under each picture, three B pictures and three non-B pictures.",
  "Page 3: match each picture to its beginning letter with 8 different pictures.",
].join("\n");

async function renderPageTwo(prompt: string) {
  const request = applyPromptIntent({ ...defaultSpec, prompt, pages: "3", level: "Ages 4-5" });
  const project = finalizeWorksheetProject(await generateWorksheetProject(request), request);
  const page = project.pages[1]!;
  const markup = renderToStaticMarkup(
    <PrintablePage page={page} project={project} index={1} mode={project.printMode} />,
  );
  const words = [...markup.matchAll(/data-complete-word="([^"]+)"/g)].map((m) => m[1]!);
  return { page, markup, words };
}

describe("Write the First Letter renders every requested card", () => {
  for (const [label, prompt] of [
    ["markdown prompt", markdownPrompt],
    ["plain-text prompt", plainPrompt],
  ] as const) {
    it(`renders six cards, 3 B and 3 non-B (${label})`, async () => {
      const { page, markup, words } = await renderPageTwo(prompt);

      expect(page.activity.kind).toBe("word-complete");
      expect(markup).not.toContain("data-worksheet-runtime-error");
      expect((markup.match(/data-complete-item-id=/g) ?? []).length).toBe(6);
      expect(words).toHaveLength(6);
      expect(new Set(words).size).toBe(6);
      expect(words.filter((w) => w.toLowerCase().startsWith("b"))).toHaveLength(3);
      expect(words.filter((w) => !w.toLowerCase().startsWith("b"))).toHaveLength(3);
    }, 30000);
  }
});

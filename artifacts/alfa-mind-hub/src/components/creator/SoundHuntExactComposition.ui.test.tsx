/**
 * REGRESSION — Page 1 beginning-sound hunt must honour BOTH the requested
 * total and the requested number of target-letter pictures, with every
 * remaining slot filled by non-target distractors only.
 */

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { defaultSpec } from "@/lib/creator-options";
import { applyPromptIntent } from "@/lib/learning-domains";
import { finalizeWorksheetProject, generateWorksheetProject } from "@/lib/worksheet-service";
import { PrintablePage } from "@/components/studio/PrintablePage";

async function renderFirstPage(prompt: string) {
  const request = applyPromptIntent({ ...defaultSpec, prompt, pages: "1", level: "Ages 4-5" });
  const project = finalizeWorksheetProject(await generateWorksheetProject(request), request);
  const markup = renderToStaticMarkup(
    <PrintablePage page={project.pages[0]!} project={project} index={0} mode={project.printMode} />,
  );
  const words = [...markup.matchAll(/data-sound-word="([^"]+)"/g)].map((m) => m[1]!);
  return { markup, words };
}

const prompts: Array<{ label: string; prompt: string; total: number; targets: number }> = [
  {
    label: "explicit B / non-B counts",
    prompt:
      "Circle the pictures that begin with B. Use 15 different pictures in a 5 x 3 grid, exactly 6 B pictures and 9 non-B pictures.",
    total: 15,
    targets: 6,
  },
  {
    label: "complement phrasing only",
    prompt:
      "Circle the pictures that begin with B. Show 15 different pictures, and 9 of the pictures must not begin with B.",
    total: 15,
    targets: 6,
  },
  {
    label: "smaller explicit split",
    prompt:
      "Circle the pictures that begin with B. Use 12 different pictures, exactly 5 B pictures and 7 non-B pictures.",
    total: 12,
    targets: 5,
  },
];

describe("sound-hunt exact composition", () => {
  for (const { label, prompt, total, targets } of prompts) {
    it(`renders ${targets} target and ${total - targets} non-target pictures (${label})`, async () => {
      const { markup, words } = await renderFirstPage(prompt);
      expect(markup).not.toContain("data-worksheet-runtime-error");
      expect(words).toHaveLength(total);
      expect(new Set(words.map((w) => w.toLowerCase())).size).toBe(total);
      expect(words.filter((w) => w.toLowerCase().startsWith("b"))).toHaveLength(targets);
      expect(words.filter((w) => !w.toLowerCase().startsWith("b"))).toHaveLength(total - targets);
    }, 30000);
  }
});

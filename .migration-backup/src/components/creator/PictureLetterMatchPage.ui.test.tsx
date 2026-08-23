/**
 * REAL UI-PATH REGRESSION — "Match Each Picture to Its Beginning Letter".
 *
 * An explicit page quantity is a hard constraint: a matching page asked for N
 * pictures must render exactly N picture rows in the production renderer, for
 * several different values of N and for both markdown and plain wording.
 */

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { defaultSpec } from "@/lib/creator-options";
import { applyPromptIntent } from "@/lib/learning-domains";
import { finalizeWorksheetProject, generateWorksheetProject } from "@/lib/worksheet-service";
import { PrintablePage } from "@/components/studio/PrintablePage";

function pack(pageThree: string) {
  return [
    "Create a 3-page worksheet pack about beginning sounds for Ages 4–5.",
    "**Page 1.** Create a circle beginning-sound activity. Show exactly **15 different pictures** in exactly a **5 × 3 grid**. Mix B and non-B words.",
    "**Page 2.** Create a write-the-first-letter activity. Show exactly **6 different pictures** with a blank line under each picture. Include exactly **3 B pictures and 3 non-B pictures**.",
    pageThree,
  ].join("\n\n");
}

async function renderPageThree(prompt: string) {
  const request = applyPromptIntent({ ...defaultSpec, prompt, pages: "3", level: "Ages 4-5" });
  const project = finalizeWorksheetProject(await generateWorksheetProject(request), request);
  const page = project.pages[2]!;
  const markup = renderToStaticMarkup(
    <PrintablePage page={page} project={project} index={2} mode={project.printMode} />,
  );
  const words = [...markup.matchAll(/data-match-picture-word="([^"]+)"/g)].map((m) => m[1]!);
  return { page, markup, words };
}

describe("matching page renders exactly the requested number of pictures", () => {
  const cases: Array<[string, number, string]> = [
    [
      "markdown, 8 pictures",
      8,
      "**Page 3.** Create a different activity from Pages 1 and 2. Show exactly **8 different pictures** and ask children to **match each picture to its beginning letter**.",
    ],
    [
      "plain text, 8 pictures",
      8,
      "Page 3: match each picture to its beginning letter with 8 different pictures.",
    ],
    [
      "plain text, 6 pictures",
      6,
      "Page 3: match each picture to its beginning letter with 6 different pictures.",
    ],
  ];

  for (const [label, expected, pageThree] of cases) {
    it(`renders ${expected} picture rows (${label})`, async () => {
      const { page, markup, words } = await renderPageThree(pack(pageThree));

      expect(page.activity.kind).toBe("picture-letter-match");
      expect(markup).not.toContain("data-worksheet-runtime-error");
      expect(words).toHaveLength(expected);
      expect(new Set(words).size).toBe(expected);
      expect((page.activity as { pictures: unknown[] }).pictures).toHaveLength(expected);
    }, 30000);
  }
});

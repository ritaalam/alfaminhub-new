/**
 * REAL UI-PATH REGRESSION — Page 3 letter column of the beginning-sounds pack.
 *
 * The matching page must print exactly 8 pictures, one letter card per letter
 * actually needed by those pictures (shared letters share a single card), no
 * unrelated letters and no duplicates. The answer key must point every picture
 * at that single card.
 */

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { defaultSpec } from "@/lib/creator-options";
import { applyPromptIntent } from "@/lib/learning-domains";
import { finalizeWorksheetProject, generateWorksheetProject } from "@/lib/worksheet-service";
import { PrintablePage } from "@/components/studio/PrintablePage";

const PROMPT = [
  "Create a 3-page worksheet pack about beginning sounds for Ages 4–5.",
  "Page 1: circle beginning-sound activity with 15 different pictures in a 5 x 3 grid.",
  "Page 2: write-the-first-letter activity with 6 different pictures.",
  "Page 3: match each picture to its beginning letter with 8 different pictures.",
].join("\n\n");

describe("Page 3 letter cards mirror the displayed pictures", () => {
  it("prints one card per needed letter, shared letters included", async () => {
    const request = applyPromptIntent({
      ...defaultSpec,
      prompt: PROMPT,
      pages: "3",
      level: "Ages 4-5",
    });
    const project = finalizeWorksheetProject(await generateWorksheetProject(request), request);
    const page = project.pages[2]!;
    expect(page.activity.kind).toBe("picture-letter-match");

    const markup = renderToStaticMarkup(
      <PrintablePage page={page} project={project} index={2} mode={project.printMode} />,
    );
    expect(markup).not.toContain("data-worksheet-runtime-error");

    const pictureLetters = [...markup.matchAll(/data-match-picture-letter="([^"]+)"/g)].map((m) =>
      m[1]!.toUpperCase(),
    );
    const cardLetters = [...markup.matchAll(/data-match-letter-card="([^"]+)"/g)].map((m) =>
      m[1]!.toUpperCase(),
    );

    // exactly 8 pictures
    expect(pictureLetters).toHaveLength(8);

    const needed = [...new Set(pictureLetters)].sort();
    // one card per needed letter — no unrelated letters, no duplicates
    expect([...cardLetters].sort()).toEqual(needed);
    expect(new Set(cardLetters).size).toBe(cardLetters.length);

    // several pictures may share one card
    expect(cardLetters.length).toBeLessThan(pictureLetters.length);

    // every picture has exactly one correct card, and the key points at it
    const activity = page.activity as {
      pictures: Array<{ id: string; word: string; letter: string }>;
      letterCards: Array<{ letter: string }>;
    };
    for (const picture of activity.pictures) {
      const matches = activity.letterCards.filter(
        (card) => card.letter.toUpperCase() === picture.letter.toUpperCase(),
      );
      expect(matches).toHaveLength(1);
      const entry = page.answerKey?.find((item) => item.groupId === picture.id);
      expect(entry).toBeDefined();
      expect(activity.letterCards[entry!.answer - 1]!.letter.toUpperCase()).toBe(
        picture.letter.toUpperCase(),
      );
    }
  }, 30000);
});

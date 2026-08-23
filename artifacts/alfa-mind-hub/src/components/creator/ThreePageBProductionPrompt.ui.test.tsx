/**
 * REGRESSION — the exact 3-page Letter B production prompt that was rejected.
 *
 * The pack must be accepted (no unsupported/blanked pages) and every stated
 * quantity must survive to the rendered page.
 */

import { describe, expect, it } from "vitest";
import { defaultSpec } from "@/lib/creator-options";
import { applyPromptIntent } from "@/lib/learning-domains";
import { finalizeWorksheetProject, generateWorksheetProject } from "@/lib/worksheet-service";

const prompt = [
  "Create a 3-page Letter B phonics pack for ages 4–5.",
  'Page 1: "Which Pictures Begin with B?" Show exactly 15 unique pictures: exactly 6 pictures beginning with B and exactly 9 pictures NOT beginning with B. Children circle the B pictures.',
  'Page 2: "Write the First Letter." Show exactly 6 unique pictures with the first letter missing from each word.',
  'Page 3: "Match Each Picture to Its Beginning Letter." Show exactly 8 unique pictures. Show only the beginning-letter choices needed for those 8 pictures, with one letter card per unique beginning letter.',
  "Keep the worksheet clean, printable and age-appropriate.",
].join("\n");

describe("exact 3-page Letter B production prompt", () => {
  it("is accepted and honours every stated quantity", async () => {
    const request = applyPromptIntent({ ...defaultSpec, prompt, pages: "3", level: "Ages 4-5" });
    const project = finalizeWorksheetProject(await generateWorksheetProject(request), request);

    expect(project.pages).toHaveLength(3);
    expect(project.unsupportedPages ?? []).toHaveLength(0);

    // Page 1 — beginning-sound picture selection, 15 total / 6 B / 9 non-B
    const p1 = project.pages[0]!.activity as {
      kind: string;
      items: Array<{ word: string; isTarget?: boolean }>;
    };
    expect(p1.kind).toBe("sound-hunt");
    expect(p1.items).toHaveLength(15);
    expect(new Set(p1.items.map((i) => i.word.toLowerCase())).size).toBe(15);
    expect(p1.items.filter((i) => i.word.toLowerCase().startsWith("b"))).toHaveLength(6);
    expect(p1.items.filter((i) => !i.word.toLowerCase().startsWith("b"))).toHaveLength(9);

    // Page 2 — write the first letter, exactly 6 pictures
    const p2 = project.pages[1]!.activity as {
      kind: string;
      items: Array<{ word: string; missingLetter: string }>;
    };
    expect(p2.kind).toBe("word-complete");
    expect(p2.items).toHaveLength(6);
    expect(new Set(p2.items.map((i) => i.word.toLowerCase())).size).toBe(6);
    for (const item of p2.items) {
      expect(item.missingLetter.toLowerCase()).toBe(item.word[0]!.toLowerCase());
    }

    // Page 3 — picture-to-letter matching, 8 pictures, unique needed letters only
    const p3 = project.pages[2]!.activity as {
      kind: string;
      pictures: Array<{ word: string; letter: string }>;
      letterCards: Array<{ letter: string }>;
    };
    expect(p3.kind).toBe("picture-letter-match");
    expect(p3.pictures).toHaveLength(8);
    expect(new Set(p3.pictures.map((p) => p.word.toLowerCase())).size).toBe(8);
    const needed = [...new Set(p3.pictures.map((p) => p.letter.toUpperCase()))].sort();
    expect(p3.letterCards.map((c) => c.letter.toUpperCase()).sort()).toEqual(needed);
  }, 60000);
});

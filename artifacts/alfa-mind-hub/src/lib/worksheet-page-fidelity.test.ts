import { describe, expect, it } from "vitest";
import { buildValidWorksheetProject, checkWorksheetProject } from "./worksheet-service";
import { parsePageDirectives } from "./page-directives";
import { mechanicOfActivity } from "./worksheet-objectives";
import type { WorksheetSpec } from "./creator-options";

/**
 * EXACT PAGE FIDELITY
 * A page-by-page prompt is a hard contract: the specified mechanic, concept
 * and page order must survive generation, and no unrequested concept may be
 * introduced.
 */

function spec(prompt: string, pages: string): WorksheetSpec {
  return {
    prompt,
    theme: "Letters",
    skill: "Phonics",
    level: "Ages 4–5",
    difficulty: "Just right",
    duration: "10 minutes",
    approach: "Montessori",
    palette: "Sage",
    language: "English",
    printing: "Full color",
    pages,
  } as WorksheetSpec;
}

const fivePagePrompt = `Create a 5-page early phonics pack for ages 4–5 about the letter S.
Page 1: Trace uppercase S and lowercase s.
Page 2: Circle pictures beginning with /s/.
Page 3: Find and circle S/s among distractor letters.
Page 4: Match pictures beginning with S to the letter S.
Page 5: Complete a simple picture activity using words beginning with S.`;

describe("page directives", () => {
  it("parses every specified page in order with its mechanic", () => {
    const directives = parsePageDirectives(spec(fivePagePrompt, "5"));
    expect(directives.map((d) => d.page)).toEqual([1, 2, 3, 4, 5]);
    expect(directives.map((d) => d.mechanic)).toEqual([
      "letter-trace",
      "beginning-sound-discrimination",
      "letter-recognition",
      "picture-letter-match",
      "word-initial-complete",
    ]);
  });

  it("honours all five specified pages exactly", () => {
    const s = spec(fivePagePrompt, "5");
    const project = buildValidWorksheetProject(s);
    expect(project.pages).toHaveLength(5);
    expect(project.pages.map((page) => mechanicOfActivity(page.activity))).toEqual([
      "letter-trace",
      "beginning-sound-discrimination",
      "letter-recognition",
      "picture-letter-match",
      "word-initial-complete",
    ]);
    expect(checkWorksheetProject(project, s).issues.filter((i) => i.severity === "error")).toEqual(
      [],
    );
  });

  it("page 4 is real matching and page 5 is real completion", () => {
    const project = buildValidWorksheetProject(spec(fivePagePrompt, "5"));
    const match = project.pages[3]!.activity;
    expect(match.kind).toBe("picture-letter-match");
    if (match.kind === "picture-letter-match") {
      expect(match.pictures.length).toBeGreaterThanOrEqual(3);
      expect(match.letterCards.some((card) => card.letter === "S")).toBe(true);
      for (const picture of match.pictures) {
        expect(match.letterCards.some((card) => card.letter === picture.letter)).toBe(true);
      }
    }
    const complete = project.pages[4]!.activity;
    expect(complete.kind).toBe("word-complete");
    if (complete.kind === "word-complete") {
      expect(complete.items.length).toBeGreaterThanOrEqual(3);
      for (const item of complete.items) {
        expect(item.missingLetter.toLowerCase()).toBe("s");
        expect((item.missingLetter + item.remainder).toLowerCase()).toBe(item.word.toLowerCase());
      }
    }
  });

  it("introduces no second taught letter", () => {
    const project = buildValidWorksheetProject(spec(fivePagePrompt, "5"));
    for (const page of project.pages) {
      const activity = page.activity as { targetLetter?: string };
      if (activity.targetLetter) expect(activity.targetLetter.toLowerCase()).toBe("s");
      expect(page.title.toLowerCase()).not.toContain("s or a");
    }
  });

  it("keeps directive order in a 10-page pack and recycles only requested activities", () => {
    const prompt = `Create a 10-page letter M pack for ages 4–5.
Page 1: Trace uppercase M and lowercase m.
Page 2: Match pictures beginning with M to the letter M.
Page 3: Circle pictures beginning with /m/.
Page 4: Find and circle M/m among distractor letters.
Page 5: Complete words beginning with M.`;
    const s = spec(prompt, "10");
    const project = buildValidWorksheetProject(s);
    const mechanics = project.pages.map((page) => mechanicOfActivity(page.activity));
    expect(project.pages).toHaveLength(10);
    expect(mechanics.slice(0, 5)).toEqual([
      "letter-trace",
      "picture-letter-match",
      "beginning-sound-discrimination",
      "letter-recognition",
      "word-initial-complete",
    ]);
    const requested = new Set(mechanics.slice(0, 5));
    for (const mechanic of mechanics.slice(5)) expect(requested.has(mechanic)).toBe(true);
    expect(checkWorksheetProject(project, s).issues.filter((i) => i.severity === "error")).toEqual(
      [],
    );
  });

  it("holds exact page fidelity across a 20-page pack", () => {
    const prompt = `Create a 20-page counting pack for ages 4–5 about bees.
Page 1: Count the bees and match each group to a number.
Page 2: Count the bees and circle how many.
Page 3: Find and count the bees hidden in the picture.
Page 4: Circle the group with more bees.`;
    const s = {
      ...spec(prompt, "20"),
      theme: "Insects",
      skill: "Counting",
    } as WorksheetSpec;
    const project = buildValidWorksheetProject(s);
    const mechanics = project.pages.map((page) => mechanicOfActivity(page.activity));
    expect(project.pages).toHaveLength(20);
    expect(mechanics.slice(0, 4)).toEqual([
      "count-match",
      "count-circle",
      "find-and-count",
      "compare-quantity",
    ]);
    const requested = new Set(mechanics.slice(0, 4));
    for (const mechanic of mechanics.slice(4)) expect(requested.has(mechanic)).toBe(true);
  });
});

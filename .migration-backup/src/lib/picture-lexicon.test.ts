/**
 * REGRESSION — universal picture → word → beginning-letter rule.
 *
 * The reported failure: a space page showed star, planet, moon and astronaut
 * while the answer cards read A, M, P, S with no semantic link to the picture
 * they belonged to. Answers must be DERIVED from the artwork:
 *
 *      star -> S, planet -> P, moon -> M, astronaut -> A
 *
 * The rule is proved on several unrelated themes and letters so it cannot be a
 * hard-coded Space / Letter-S patch.
 */

import { describe, expect, it } from "vitest";
import { answerSemanticIssues, repairAnswerSemantics } from "./answer-semantics";
import { pictureInitial, pictureWord } from "./picture-lexicon";
import { defaultSpec } from "./creator-options";
import { buildValidWorksheetProject, validateFinalizedPageData } from "./worksheet-service";
import type { WorksheetPageModel } from "./worksheet-model";

function matchPage(assets: string[], letters: string[], targetLetter: string): WorksheetPageModel {
  return {
    id: "p1",
    title: `Match the Pictures to ${targetLetter}`,
    instruction: "Say each picture. Draw a line from every picture to the letter it begins with.",
    activityType: "Matching",
    answerKey: [],
    activity: {
      kind: "picture-letter-match",
      mechanic: "picture-letter-match",
      targetLetter,
      targetPhoneme: `/${targetLetter.toLowerCase()}/`,
      pictures: assets.map((asset, index) => ({
        id: `pic-${index}`,
        word: asset,
        asset,
        letter: letters[index]!,
        isTarget: false,
      })),
      letterCards: letters.map((letter, index) => ({ id: `card-${index}`, letter })),
    },
  } as unknown as WorksheetPageModel;
}

describe("picture → word → beginning letter", () => {
  it("resolves the canonical word and initial for every illustration", () => {
    expect(pictureWord("star")).toBe("star");
    expect(pictureInitial("star")).toBe("S");
    expect(pictureInitial("planet")).toBe("P");
    expect(pictureInitial("moon")).toBe("M");
    expect(pictureInitial("astronaut")).toBe("A");
    // a rocket drawing is a rocket, never a "spaceship" /s/ word
    expect(pictureInitial("rocket")).toBe("R");
    expect(pictureWord("not-an-asset")).toBeUndefined();
  });

  it("rejects letters that were positioned arbitrarily (star/planet/moon/astronaut)", () => {
    const page = matchPage(["star", "planet", "moon", "astronaut"], ["A", "M", "P", "S"], "S");
    const issues = answerSemanticIssues(page).join(" ");
    expect(issues).toMatch(/"star" is joined to letter "A"/);
    expect(issues).toMatch(/"planet" is joined to letter "M"/);
  });

  it("repairs the pairs to the true beginning letters", () => {
    const repaired = repairAnswerSemantics(
      matchPage(["star", "planet", "moon", "astronaut"], ["A", "M", "P", "S"], "S"),
    );
    const activity = repaired.activity as unknown as {
      pictures: Array<{ word: string; letter: string; isTarget: boolean }>;
      letterCards: Array<{ letter: string }>;
    };
    expect(activity.pictures.map((p) => [p.word, p.letter])).toEqual([
      ["star", "S"],
      ["planet", "P"],
      ["moon", "M"],
      ["astronaut", "A"],
    ]);
    expect(activity.pictures.filter((p) => p.isTarget).map((p) => p.word)).toEqual(["star"]);
    // every letter card answers exactly one picture — no arbitrary letters
    expect([...activity.letterCards.map((c) => c.letter)].sort()).toEqual(["A", "M", "P", "S"]);
    expect(answerSemanticIssues(repaired)).toEqual([]);
  });

  it.each([
    ["farm / letter C", ["cow", "pig", "tractor", "egg"], "C", ["C", "P", "T", "E"]],
    ["ocean / letter W", ["whale", "crab", "shell", "fish"], "W", ["W", "C", "S", "F"]],
    ["jungle / letter M", ["monkey", "lion", "bird", "turtle"], "M", ["M", "L", "B", "T"]],
    ["weather / letter U", ["umbrella", "cloud", "sun", "raindrop"], "U", ["U", "C", "S", "R"]],
  ])("is a universal rule — %s", (_label, assets, target, expected) => {
    const scrambled = [...expected].reverse();
    const repaired = repairAnswerSemantics(matchPage(assets, scrambled, target));
    const activity = repaired.activity as unknown as {
      pictures: Array<{ letter: string }>;
    };
    expect(activity.pictures.map((p) => p.letter)).toEqual(expected);
    expect(answerSemanticIssues(repaired)).toEqual([]);
    // and the unrepaired version is caught
    expect(answerSemanticIssues(matchPage(assets, scrambled, target)).length).toBeGreaterThan(0);
  });

  it("drops a picture whose vocabulary word cannot be resolved", () => {
    const page = matchPage(["star", "mystery-blob"], ["S", "M"], "S");
    expect(answerSemanticIssues(page).join(" ")).toMatch(/no confident vocabulary word/);
    const repaired = repairAnswerSemantics(page);
    const activity = repaired.activity as unknown as { pictures: Array<{ word: string }> };
    expect(activity.pictures.map((p) => p.word)).toEqual(["star"]);
  });
});

describe("generated packs pass both gates", () => {
  const packs: Array<[string, string, string]> = [
    [
      "Space / Letter S",
      "Space",
      "Create a 5-page space pack teaching the letter S and the /s/ sound. Page 1: find and circle S. Page 2: trace S. Page 3: match each picture to the letter it begins with. Page 4: circle the picture that begins with /s/. Page 5: complete the missing first letter.",
    ],
    [
      "Farm / Letter C",
      "Farm",
      "Create a 4-page farm pack teaching the letter C and the /c/ sound. Page 1: trace C. Page 2: match each picture to the letter it begins with. Page 3: circle the picture that begins with /c/. Page 4: complete the missing first letter.",
    ],
    [
      "Ocean / Letter W",
      "Ocean",
      "Create a 4-page ocean pack teaching the letter W and the /w/ sound. Page 1: trace W. Page 2: match each picture to the letter it begins with. Page 3: circle the picture that begins with /w/. Page 4: complete the missing first letter.",
    ],
  ];

  it.each(packs)(
    "%s",
    (_label, theme, prompt) => {
      const project = buildValidWorksheetProject(
        {
          ...defaultSpec,
          level: "Ages 4–5",
          pages: String(prompt.match(/Page \d+/g)?.length ?? 4),
          theme,
          prompt,
        },
        3,
      );
      for (const page of project.pages) {
        expect(answerSemanticIssues(page)).toEqual([]);
        expect(validateFinalizedPageData(page)).toEqual([]);
        const activity = page.activity as unknown as {
          pictures?: Array<{ word: string; asset: string; letter: string }>;
          items?: Array<{ word?: string; asset?: string }>;
        };
        for (const picture of activity.pictures ?? []) {
          expect(picture.word).toBe(pictureWord(picture.asset));
          expect(picture.letter.toUpperCase()).toBe(pictureInitial(picture.asset));
        }
        for (const item of activity.items ?? []) {
          if (item.word && item.asset) expect(item.word).toBe(pictureWord(item.asset));
        }
      }
    },
    30_000,
  );
});

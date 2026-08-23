/**
 * REGRESSION — semantic answer validation.
 *
 * Instruction → displayed content → possible answers → answer key must agree.
 * These are the exact reported failures:
 *   1. arbitrary letters (A, M, P) printed beside pictures they do not belong to
 *   2. a "Which One Is Different?" title over a beginning-sound question
 */

import { describe, expect, it } from "vitest";
import { answerSemanticIssues, repairAnswerSemantics } from "./answer-semantics";
import { defaultSpec } from "./creator-options";
import { buildValidWorksheetProject } from "./worksheet-service";
import { validateFinalizedPageData } from "./worksheet-service";
import type { WorksheetPageModel } from "./worksheet-model";

const base = {
  id: "p1",
  title: "Match the Pictures",
  instruction:
    "Say each picture name out loud and match it with the letter it begins with. Listen for the /s/ sound.",
  activityType: "Matching",
  answerKey: [],
} as unknown as WorksheetPageModel;

function soundMatchPage(letters: string[], words = ["star", "sun", "moon"]): WorksheetPageModel {
  return {
    ...base,
    activity: {
      kind: "match-pairs",
      mechanic: "match-pairs",
      subtype: "sound-to-picture",
      // the asset IS the picture the child sees, so the label must name it
      left: words.map((word, i) => ({ id: `l${i}`, pairId: `p${i}`, asset: word, label: word })),
      right: letters.map((letter, i) => ({
        id: `r${i}`,
        pairId: `p${i}`,
        asset: words[i],
        letter,
      })),
    },
  } as unknown as WorksheetPageModel;
}

describe("semantic answer validation", () => {
  it("rejects arbitrary letters beside pictures in a sound-matching page", () => {
    const issues = answerSemanticIssues(soundMatchPage(["A", "M", "P"]));
    expect(issues.join(" ")).toMatch(/not the beginning sound of "star"/);
    expect(issues.join(" ")).toMatch(/not the beginning sound of "sun"/);
    expect(issues.length).toBeGreaterThanOrEqual(3);
  });

  it("repairs the letter column so every pair is educationally correct", () => {
    const repaired = repairAnswerSemantics(soundMatchPage(["A", "M", "P"]));
    const activity = repaired.activity as { right: Array<{ letter: string }> };
    expect(activity.right.map((card) => card.letter)).toEqual(["S", "S", "M"]);
    expect(answerSemanticIssues(repaired)).toEqual([]);
  });

  it("accepts a correct target/distractor relationship for letter S", () => {
    expect(answerSemanticIssues(soundMatchPage(["S", "S", "M"]))).toEqual([]);
  });

  it("flags a phonics page with no picture beginning with the taught sound", () => {
    const page = soundMatchPage(["M", "T", "F"], ["moon", "tree", "fish"]);
    expect(answerSemanticIssues(page).join(" ")).toMatch(/teaches \/s\/ but no picture/);
  });

  it("rejects a letter card that answers no picture in picture-letter-match", () => {
    const page = {
      ...base,
      title: "Match Pictures to Letters",
      activity: {
        kind: "picture-letter-match",
        mechanic: "picture-letter-match",
        targetLetter: "S",
        targetPhoneme: "/s/",
        pictures: [
          { id: "a", word: "sun", asset: "star", letter: "S", isTarget: true },
          { id: "b", word: "moon", asset: "star", letter: "M", isTarget: false },
        ],
        letterCards: [
          { id: "c1", letter: "S" },
          { id: "c2", letter: "M" },
          { id: "c3", letter: "P" },
        ],
      },
    } as unknown as WorksheetPageModel;
    expect(answerSemanticIssues(page).join(" ")).toMatch(/Letter card "P" is not the answer/);
    expect(answerSemanticIssues(repairAnswerSemantics(page))).toEqual([]);
  });

  it("retitles an odd-one-out page that actually asks a beginning-sound question", () => {
    const page = {
      ...base,
      title: "Which One Is Different?",
      instruction:
        "Say each picture name out loud. Circle the picture in every row that begins with the /s/ sound.",
      activity: { kind: "pick-one", mechanic: "pick-one", subtype: "sound-choice", rows: [] },
    } as unknown as WorksheetPageModel;
    expect(answerSemanticIssues(page).join(" ")).toMatch(/promises an odd-one-out task/);
    const repaired = repairAnswerSemantics(page);
    expect(repaired.title).toBe("Which Picture Begins with S?");
    expect(answerSemanticIssues(repaired)).toEqual([]);
  });

  it("leaves a genuine odd-one-out page alone", () => {
    const page = {
      ...base,
      title: "Which One Is Different?",
      instruction: "Look at each row. Circle the picture that is DIFFERENT.",
      activity: { kind: "pick-one", mechanic: "pick-one", rows: [] },
    } as unknown as WorksheetPageModel;
    expect(answerSemanticIssues(page)).toEqual([]);
    expect(repairAnswerSemantics(page).title).toBe("Which One Is Different?");
  });

  it("a generated 5-page Letter S space pack passes the final answer gate", () => {
    const project = buildValidWorksheetProject(
      {
        ...defaultSpec,
        level: "Ages 4–5",
        pages: "5",
        theme: "Space",
        prompt:
          "Create a 5-page space pack teaching the letter S and the /s/ sound. Page 1: find and circle S. Page 2: trace S. Page 3: match each picture to the letter it begins with. Page 4: circle the picture that begins with /s/. Page 5: complete the missing first letter.",
      },
      3,
    );
    expect(project.pages).toHaveLength(5);
    for (const page of project.pages) {
      expect(answerSemanticIssues(page)).toEqual([]);
      expect(validateFinalizedPageData(page)).toEqual([]);
    }
  }, 20_000);
});

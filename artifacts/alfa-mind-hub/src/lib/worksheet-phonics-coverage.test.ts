/**
 * PHONICS MULTI-SKILL REGRESSION.
 *
 * A prompt that asks for three skills must teach three skills: the pack may
 * never quietly drop beginning-sound discrimination (or any other explicitly
 * requested skill), and it may never drift into counting.
 */

import { describe, expect, it } from "vitest";
import { defaultSpec, type WorksheetSpec } from "@/lib/creator-options";
import { buildWorksheetProject } from "@/lib/worksheet-builder";
import { parseRequestedSkills, uncoveredSkills } from "@/lib/activity-spec";
import { validateWorksheetProject } from "@/lib/worksheet-validation";

const PROMPT =
  "Create a beginning phonics activity for ages 4–5 teaching the letter B and the /b/ sound. Children identify uppercase B and lowercase b, trace B and b, and circle pictures whose names begin with /b/. Use ball, banana, bear, bird and book as correct examples and include some non-B distractors. This is a phonics activity, not counting.";

const spec = {
  ...defaultSpec,
  level: "Preschool (4-5)",
  pages: "2",
  prompt: PROMPT,
} as WorksheetSpec;

describe("letter B phonics pack", () => {
  const project = buildWorksheetProject(spec, 1);

  it("parses all three requested skills", () => {
    expect(parseRequestedSkills(spec).sort()).toEqual(
      ["beginning-sound-discrimination", "letter-recognition", "letter-trace"].sort(),
    );
  });

  it("covers every requested skill", () => {
    expect(uncoveredSkills(spec, project)).toEqual([]);
  });

  it("stays in literacy and never renders counting", () => {
    const mechanics = project.pages.map(
      (page) => (page.activity as { mechanic?: string }).mechanic,
    );
    expect(mechanics).not.toContain("count-match");
    expect(mechanics).not.toContain("count-circle");
    for (const page of project.pages) {
      expect(["letter-trace", "letter-search", "sound-hunt"]).toContain(page.activity.kind);
    }
  });

  it("prints upper and lower case B and gives real tracing rows", () => {
    const trace = project.pages.find((page) => page.activity.kind === "letter-trace");
    expect(trace).toBeTruthy();
    const activity = trace!.activity as { rows: Array<{ glyph: string; repeats: number }> };
    expect(activity.rows.map((row) => row.glyph)).toEqual(["B", "b"]);
    for (const row of activity.rows) expect(row.repeats).toBeGreaterThanOrEqual(4);
  });

  it("teaches beginning-sound discrimination with mixed pictures", () => {
    const page = project.pages.find((p) => p.activity.kind === "sound-hunt");
    expect(page).toBeTruthy();
    const activity = page!.activity as {
      targetLetter: string;
      targetPhoneme: string;
      items: Array<{ word: string; asset: string; initialPhoneme: string; isTarget: boolean }>;
    };
    expect(activity.targetLetter).toBe("B");
    expect(activity.targetPhoneme).toBe("/b/");
    const targets = activity.items.filter((item) => item.isTarget);
    const distractors = activity.items.filter((item) => !item.isTarget);
    expect(targets.length).toBeGreaterThanOrEqual(3);
    expect(distractors.length).toBeGreaterThanOrEqual(3);
    // vocabulary and illustration always describe the same concept
    for (const item of activity.items) {
      expect(item.asset).toBe(item.word);
      expect(item.initialPhoneme).toBe(`/${item.word[0]}/`);
      expect(item.isTarget).toBe(item.word.startsWith("b"));
    }
    // the answer key is derived from isTarget, not from position
    expect(page!.answerKey.map((entry) => entry.answerText).sort()).toEqual(
      targets.map((item) => item.word).sort(),
    );
  });

  it("uses an objective-based title, never concatenated vocabulary", () => {
    expect(project.title).toBe("Letter B Phonics Pack");
    expect(project.title).not.toMatch(/&/);
  });

  it("passes the print-safety quality gate", () => {
    const report = validateWorksheetProject(project, { level: spec.level });
    expect(report.issues.filter((issue) => issue.severity === "error")).toEqual([]);
  });
});

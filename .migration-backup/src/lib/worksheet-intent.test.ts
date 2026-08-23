import { describe, expect, it } from "vitest";
import { defaultSpec, type WorksheetSpec } from "./creator-options";
import { applyPromptIntent, domainForSpec, parsePromptIntent } from "./learning-domains";
import { buildValidWorksheetProject, checkWorksheetProject } from "./worksheet-service";
import { mechanicOfActivity } from "./worksheet-objectives";
import { validateFinalizedPageData } from "./worksheet-service";

const spec = (patch: Partial<WorksheetSpec>): WorksheetSpec => ({ ...defaultSpec, ...patch });

const literacyMechanics = [
  "letter-recognition",
  "letter-trace",
  "letter-write",
  "beginning-sound",
  "beginning-sound-discrimination",
  "letter-sort",
  "picture-letter-match",
  "word-initial-complete",
];

describe("prompt intent", () => {
  it("classifies a phonics prompt as literacy and extracts the letter", () => {
    const intent = parsePromptIntent("5 page Letter B phonics pack for 4 year olds");
    expect(intent.domain).toBe("literacy");
    expect(intent.letter).toBe("b");
    expect(intent.pages).toBe(5);
    expect(intent.level).toBe("Ages 4–5");
  });

  it("keeps counting prompts in the math domain", () => {
    expect(parsePromptIntent("count butterflies 1-5").domain).toBe("math");
  });

  it("clears the stale Counting/Insects defaults for a literacy prompt", () => {
    const normalized = applyPromptIntent(spec({ prompt: "Letter B beginning sounds" }));
    expect(normalized.skill).not.toBe("Counting");
    expect(normalized.theme).toBe("Letter B");
    expect(domainForSpec(normalized)).toBe("literacy");
  });

  it("never overrides a page count the teacher selected in the UI", () => {
    const normalized = applyPromptIntent(spec({ prompt: "3 page letter B pack", pages: "6" }));
    expect(normalized.pages).toBe("6");
  });
});

describe("5-page Letter B phonics pack", () => {
  const request = spec({
    prompt: "Create a 5 page Letter B phonics pack for 4 year olds",
    pages: "5",
  });
  const project = buildValidWorksheetProject(request, 3);

  it("renders exactly the requested number of pages", () => {
    expect(project.pages).toHaveLength(5);
  });

  it("never falls back to counting and never inherits the insect theme", () => {
    for (const page of project.pages) {
      expect(literacyMechanics).toContain(mechanicOfActivity(page.activity));
      expect(page.title.toLowerCase()).not.toMatch(/count|insect|butterfl|ladybug/);
      expect(page.instruction.toLowerCase()).not.toMatch(/count|how many/);
    }
  });

  it("passes the Alfa quality gate", () => {
    const result = checkWorksheetProject(project, request);
    expect(result.issues.filter((i) => i.severity === "error")).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it("keeps every phonics page internally consistent", () => {
    for (const page of project.pages) {
      expect(validateFinalizedPageData(page)).toEqual([]);
    }
  });

  it("only uses pictures that really start with the target letter", () => {
    for (const page of project.pages) {
      if (page.activity.kind === "letter-trace") {
        for (const word of page.activity.words) {
          expect(word.word.charAt(0).toLowerCase()).toBe("b");
        }
      }
      if (page.activity.kind === "pick-one") {
        for (const row of page.activity.rows) {
          const answer = row.options.find((o) => o.id === row.answerOptionId)!;
          expect(answer.label?.charAt(0).toLowerCase()).toBe("b");
          const others = row.options.filter((o) => o.id !== row.answerOptionId);
          for (const other of others) {
            expect(other.label?.charAt(0).toLowerCase()).not.toBe("b");
          }
        }
      }
    }
  });
});

describe("cross-subject routing", () => {
  it("still produces counting work for a counting prompt", () => {
    const request = spec({ prompt: "Count the butterflies 1 to 5", pages: "2" });
    const project = buildValidWorksheetProject(request, 2);
    expect(project.pages).toHaveLength(2);
    expect(checkWorksheetProject(project, request).valid).toBe(true);
    expect(mechanicOfActivity(project.pages[0]!.activity)).toMatch(
      /count|find|pattern|sort|compare|same/,
    );
  });

  it("does not turn a science prompt into a counting pack", () => {
    const request = spec({ prompt: "Weather sorting activity for preschool", pages: "2" });
    const project = buildValidWorksheetProject(request, 4);
    expect(project.pages).toHaveLength(2);
    for (const page of project.pages) {
      expect(literacyMechanics).not.toContain(mechanicOfActivity(page.activity));
    }
    expect(checkWorksheetProject(project, request).valid).toBe(true);
  });

  it("respects the requested page count on every domain", () => {
    for (const prompt of [
      "Letter B tracing practice",
      "Count the ladybugs up to 5",
      "Weather sorting activity",
    ]) {
      const request = spec({ prompt, pages: "4" });
      expect(buildValidWorksheetProject(request, 1).pages).toHaveLength(4);
    }
  });
});

describe("reported cross-subject regression", () => {
  const PROMPT =
    "Create a 5-page beginning phonics pack for ages 4–5 teaching the letter B and its /b/ sound. Include letter recognition, picture sorting, tracing, beginning-sound identification, and a final review.";

  it("routes the reported prompt to a 5-page Letter B phonics pack", () => {
    const spec = applyPromptIntent({ ...defaultSpec, prompt: PROMPT });
    expect(domainForSpec(spec)).toBe("literacy");
    expect(spec.pages).toBe("5");

    const project = buildValidWorksheetProject(spec, 1);
    expect(project.pages).toHaveLength(5);
    expect(project.title).toMatch(/Letter B|B\b/);

    const kinds = project.pages.map((p) => p.activity.kind);
    expect(kinds).toContain("letter-search");
    expect(kinds).toContain("letter-trace");
    expect(kinds).toContain("pick-one");
    // phonemic discrimination is a distinct skill from letter recognition
    expect(kinds).toContain("sound-hunt");
    expect(new Set(kinds).size).toBeGreaterThanOrEqual(4);

    for (const kind of kinds) {
      expect(["count-match", "count-circle", "find-count"]).not.toContain(kind);
    }

    // no inherited counting theme anywhere the child reads
    const copy = [
      project.title,
      project.meta.theme,
      ...project.pages.flatMap((p) => [p.title, p.instruction, p.activityType]),
    ]
      .join(" ")
      .toLowerCase();
    expect(copy).not.toMatch(/insect|butterfl|count/);
    expect(checkWorksheetProject(project, spec).valid).toBe(true);
  });

  it("still builds the butterfly counting pack", () => {
    const spec = applyPromptIntent({
      ...defaultSpec,
      pages: "2",
      prompt: "Count the butterflies 1 to 5",
    });
    expect(domainForSpec(spec)).toBe("math");
    const project = buildValidWorksheetProject(spec, 1);
    expect(project.pages).toHaveLength(2);
    expect(JSON.stringify(project)).toMatch(/butterfly/i);
    expect(checkWorksheetProject(project, spec).valid).toBe(true);
  });
});

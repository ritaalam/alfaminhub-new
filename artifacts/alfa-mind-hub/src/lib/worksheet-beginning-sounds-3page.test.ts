import { describe, expect, it } from "vitest";
import { defaultSpec } from "@/lib/creator-options";
import { applyPromptIntent } from "@/lib/learning-domains";
import { parsePageDirectives, pageDirectiveIssues } from "@/lib/page-directives";
import { planWorksheetPages } from "@/lib/worksheet-page-plan";
import {
  checkWorksheetProject,
  finalizeWorksheetProject,
  generateWorksheetProject,
  validateFinalizedPageData,
} from "@/lib/worksheet-service";
import { mechanicOfActivity } from "@/lib/worksheet-objectives";
import { pictureWord } from "@/lib/picture-lexicon";
import { isPhoneticallyClear } from "@/lib/phonics-vocabulary";

/**
 * EXACT FAILED PROMPT — three DIFFERENT beginning-sound activities.
 *
 * The pack collapsed into three copies of the same "circle the pictures that
 * begin with B" page. These tests fail if any requested activity, response
 * mode or quantity is lost again.
 */
const prompt = [
  "Create a 3-page beginning sounds worksheet pack for Ages 4-5.",
  "Page 1: Match 6 familiar pictures to their correct beginning letters.",
  "Page 2: Circle the picture that begins with the target letter in each of 5 rows, with 3 choices per row.",
  "Page 3: Look at 6 pictures and write the first letter.",
].join("\n");

const spec = () =>
  structuredClone(applyPromptIntent({ ...defaultSpec, prompt, pages: "3", level: "Ages 4-5" }));

describe("3-page beginning-sounds pack", () => {
  it("parses every page into its own activity, quantity and response mode", () => {
    const directives = parsePageDirectives(spec());
    expect(directives.map((directive) => directive.page)).toEqual([1, 2, 3]);
    expect(directives.map((directive) => directive.mechanic)).toEqual([
      "picture-letter-match",
      "beginning-sound",
      "word-initial-complete",
    ]);
    expect(directives.map((d) => d.semanticRequirements.responseMode)).toEqual([
      "draw-line",
      "circle",
      "write",
    ]);
    expect(directives[0]?.semanticRequirements.requiredItemCount).toBe(6);
    expect(directives[1]?.semanticRequirements.requiredRowCount).toBe(5);
    expect(directives[1]?.semanticRequirements.requiredChoiceCount).toBe(3);
    expect(directives[2]?.semanticRequirements.requiredItemCount).toBe(6);
  });

  it("plans three distinct activities, never three copies of one", () => {
    const plan = planWorksheetPages(spec(), 3);
    expect(plan).toHaveLength(3);
    expect(new Set(plan).size).toBe(3);
  });

  it("generates exactly the three requested activities with exact quantities", async () => {
    const request = spec();
    const project = finalizeWorksheetProject(await generateWorksheetProject(request), request);

    expect(project.pages).toHaveLength(3);
    expect(project.pages.map((page) => mechanicOfActivity(page.activity))).toEqual([
      "picture-letter-match",
      "beginning-sound",
      "word-initial-complete",
    ]);
    // no "Practise Again" / "Review" repeat headings
    expect(new Set(project.pages.map((page) => page.title)).size).toBe(3);
    for (const page of project.pages) {
      expect(page.title).not.toMatch(/Practise Again|One More Round|Review/i);
    }

    const [match, circle, write] = project.pages;
    expect(match?.activity.kind).toBe("picture-letter-match");
    if (match?.activity.kind === "picture-letter-match") {
      expect(match.activity.pictures).toHaveLength(6);
      // beginning-sound answers derive from the canonical picture word
      for (const picture of match.activity.pictures) {
        const word = pictureWord(picture.asset);
        expect(word).toBeDefined();
        expect(isPhoneticallyClear(word!)).toBe(true);
        expect(picture.letter.toLowerCase()).toBe(word!.charAt(0));
      }
      // Preview Key uses the same validated answer data as the worksheet
      for (const picture of match.activity.pictures) {
        const key = match.answerKey.find((entry) => entry.groupId === picture.id);
        expect(key?.answerText).toBe(`${picture.word} → ${picture.letter}`);
      }
    }

    expect(circle?.activity.kind).toBe("pick-one");
    if (circle?.activity.kind === "pick-one") {
      expect(circle.activity.rows).toHaveLength(5);
      for (const row of circle.activity.rows) expect(row.options).toHaveLength(3);
    }

    expect(write?.activity.kind).toBe("word-complete");
    if (write?.activity.kind === "word-complete") {
      expect(write.activity.items).toHaveLength(6);
      // the write page practises several first sounds, not one letter six times
      expect(new Set(write.activity.items.map((item) => item.missingLetter)).size).toBeGreaterThan(
        1,
      );
      for (const item of write.activity.items) {
        const word = pictureWord(item.asset)!;
        expect(item.missingLetter).toBe(word.charAt(0));
        expect(isPhoneticallyClear(word)).toBe(true);
      }
    }

    // deterministic gates
    expect(pageDirectiveIssues(request, project)).toEqual([]);
    expect(checkWorksheetProject(project, request).issues).toEqual([]);
    expect(project.pages.flatMap(validateFinalizedPageData)).toEqual([]);
  });

  it("rejects a pack whose pages all collapse into one activity", () => {
    const request = spec();
    const collapsed = {
      pages: [1, 2, 3].map((page) => ({
        id: `page-${page}`,
        activity: {
          kind: "sound-hunt" as const,
          mechanic: "beginning-sound-discrimination" as const,
          targetLetter: "B",
          targetPhoneme: "/b/",
          items: [],
        },
      })),
    };
    const issues = pageDirectiveIssues(request, collapsed as never);
    expect(issues.length).toBeGreaterThanOrEqual(3);
    expect(issues.every((issue) => issue.code.startsWith("page-directive"))).toBe(true);
  });
});

const exactCreatorPrompt = [
  "Create a 3-page beginning sounds worksheet pack for Ages 4-5.",
  "PAGE 1: Circle beginning-sound pictures",
  "Exactly 15 different pictures",
  "Exactly 5 × 3 grid",
  "Mix B and non-B words",
  "PAGE 2: Write the first letter",
  "Exactly 6 different pictures",
  "Blank line under each picture",
  "Exactly 3 B pictures and 3 non-B pictures",
  "PAGE 3: Match pictures to beginning letters",
  "Exactly 8 different pictures",
  "Must be different from Pages 1 and 2",
].join("\n");

describe("Creator runtime path — exact multiline 3-page request", () => {
  it("preserves every multiline page plan through preview finalization", async () => {
    const request = structuredClone(
      applyPromptIntent({
        ...defaultSpec,
        prompt: exactCreatorPrompt,
        pages: "3",
        level: "Ages 4-5",
      }),
    );
    const directives = parsePageDirectives(request);
    expect(directives.map((directive) => directive.mechanic)).toEqual([
      "beginning-sound-discrimination",
      "word-initial-complete",
      "picture-letter-match",
    ]);
    expect(directives[0]?.semanticRequirements).toMatchObject({
      requiredItemCount: 15,
      requiredGrid: { columns: 5, rows: 3 },
    });
    expect(directives[1]?.semanticRequirements).toMatchObject({
      requiredItemCount: 6,
      requiredTargetCount: 3,
    });
    expect(directives[2]?.semanticRequirements.requiredItemCount).toBe(8);

    // Exact production path used by WorksheetCreator then WorksheetStudio.
    const generated = await generateWorksheetProject(request);
    const project = finalizeWorksheetProject(generated, request);
    expect(project.pages).toHaveLength(3);
    expect(project.pages.map((page) => mechanicOfActivity(page.activity))).toEqual([
      "beginning-sound-discrimination",
      "word-initial-complete",
      "picture-letter-match",
    ]);
    expect(project.pages[0]?.activity.kind).toBe("sound-hunt");
    if (project.pages[0]?.activity.kind === "sound-hunt") {
      expect(project.pages[0].activity.items).toHaveLength(15);
    }
    expect(project.pages[1]?.activity.kind).toBe("word-complete");
    if (project.pages[1]?.activity.kind === "word-complete") {
      expect(project.pages[1].activity.items).toHaveLength(6);
      expect(
        project.pages[1].activity.items.filter((item) => item.missingLetter === "b"),
      ).toHaveLength(3);
    }
    expect(project.pages[2]?.activity.kind).toBe("picture-letter-match");
    if (project.pages[2]?.activity.kind === "picture-letter-match") {
      expect(project.pages[2].activity.pictures).toHaveLength(8);
      const earlierWords = new Set(
        project.pages
          .slice(0, 2)
          .flatMap((page) =>
            page.activity.kind === "sound-hunt" || page.activity.kind === "word-complete"
              ? page.activity.items.map((item) => item.word)
              : [],
          ),
      );
      expect(
        project.pages[2].activity.pictures.every((picture) => !earlierWords.has(picture.word)),
      ).toBe(true);
    }
    expect(pageDirectiveIssues(request, project)).toEqual([]);
    expect(checkWorksheetProject(project, request).issues).toEqual([]);
    expect(project.pages.flatMap(validateFinalizedPageData)).toEqual([]);
  });

  it("derives page count from a plain numbered page plan instead of the stale two-page default", () => {
    const numberedPrompt = [
      "Create a beginning sounds worksheet pack for Ages 4-5.",
      "1. Circle pictures beginning with B.",
      "2. Write the first letter under 6 pictures.",
      "3. Match 8 pictures to their beginning letters.",
    ].join("\n");
    const request = applyPromptIntent({ ...defaultSpec, prompt: numberedPrompt });
    expect(request.pages).toBe("3");
    expect(planWorksheetPages(request, Number(request.pages))).toHaveLength(3);
    expect(parsePageDirectives(request)).toHaveLength(3);
  });
});

const productionMarkdownPrompt = [
  "Create a 3-page worksheet pack about beginning sounds for Ages 4–5.",
  "",
  "**Page 1.** Create a circle beginning-sound activity. Show exactly **15 different pictures** in exactly a **5 × 3 grid**. Mix B and non-B words.",
  "",
  "**Page 2.** Create a write-the-first-letter activity. Show exactly **6 different pictures** with a blank line under each picture. Include exactly **3 B pictures and 3 non-B pictures**.",
  "",
  "**Page 3.** Create a different activity from Pages 1 and 2. Show exactly **8 different pictures** and ask children to **match each picture to its beginning letter**.",
  "",
  "Requirements:",
  "* All 3 pages must be clearly different activities.",
  "* Use familiar, age-appropriate vocabulary.",
  "* Every picture must clearly represent the intended word.",
  "* No duplicate pictures.",
  "* No missing images.",
  "* No empty pages.",
  "* Instructions must match the activity.",
  "* Exact requested quantities must be respected.",
  "* Printable professional kindergarten worksheet design",
].join("\n");

describe("production-equivalent markdown page plan", () => {
  it("preserves hyphenated write-the-first-letter and passes the real preview path", async () => {
    const request = structuredClone(
      applyPromptIntent({
        ...defaultSpec,
        prompt: productionMarkdownPrompt,
        pages: "3",
        level: "Ages 4-5",
      }),
    );
    expect(parsePageDirectives(request).map((directive) => directive.mechanic)).toEqual([
      "beginning-sound-discrimination",
      "word-initial-complete",
      "picture-letter-match",
    ]);

    const project = finalizeWorksheetProject(await generateWorksheetProject(request), request);
    expect(project.pages.map((page) => mechanicOfActivity(page.activity))).toEqual([
      "beginning-sound-discrimination",
      "word-initial-complete",
      "picture-letter-match",
    ]);
    expect(project.pages[0]?.activity.kind).toBe("sound-hunt");
    expect(project.pages[1]?.activity.kind).toBe("word-complete");
    expect(project.pages[2]?.activity.kind).toBe("picture-letter-match");
    if (project.pages[0]?.activity.kind === "sound-hunt") {
      expect(project.pages[0].activity.items).toHaveLength(15);
      expect(project.pages[0].semanticRequirements?.requiredGrid).toEqual({ columns: 5, rows: 3 });
    }
    if (project.pages[1]?.activity.kind === "word-complete") {
      expect(project.pages[1].activity.items).toHaveLength(6);
    }
    if (project.pages[2]?.activity.kind === "picture-letter-match") {
      expect(project.pages[2].activity.pictures).toHaveLength(8);
    }
    expect(pageDirectiveIssues(request, project)).toEqual([]);
    expect(checkWorksheetProject(project, request).issues).toEqual([]);
    expect(project.pages.flatMap(validateFinalizedPageData)).toEqual([]);
  });
});

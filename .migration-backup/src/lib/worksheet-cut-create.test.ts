import { describe, expect, it } from "vitest";
import { domainForSpec, parsePromptIntent } from "./learning-domains";
import { buildWorksheetProject } from "./worksheet-builder";
import { defaultSpec } from "./creator-options";
import { validateWorksheetProject } from "./worksheet-validation";
import type { WorksheetActivity } from "./worksheet-model";

const specFor = (prompt: string) => ({ ...defaultSpec, prompt });

describe("intent routing — explicit activity mechanics beat inferred domains", () => {
  const craft = [
    "Build your own aquarium with fish and sea animals.",
    "Design your own pizza with toppings.",
    "Decorate your own cupcake.",
    "Create a monster by cutting and gluing eyes, mouths, arms and horns.",
    "Build a rocket by cutting and pasting the pieces.",
  ];
  it.each(craft)("routes %s to cut_create", (prompt) => {
    expect(parsePromptIntent(prompt).domain).toBe("craft");
    expect(domainForSpec(specFor(prompt))).toBe("craft");
  });

  const phonics = [
    "Find all the letter B pictures.",
    "Trace uppercase and lowercase B.",
    "Which pictures begin with B?",
  ];
  it.each(phonics)("keeps %s in phonics", (prompt) => {
    expect(parsePromptIntent(prompt).domain).toBe("literacy");
    expect(domainForSpec(specFor(prompt))).toBe("literacy");
  });

  it("ignores a stale phonics skill when the prompt asks for Cut & Create", () => {
    const stale = {
      ...defaultSpec,
      skill: "Letter Recognition",
      theme: "Letter B",
      prompt: craft[0]!,
    };
    expect(domainForSpec(stale)).toBe("craft");
  });
});

const AQUARIUM =
  "Create a 3-page Cut & Create Build Your Own Aquarium printable pack for children ages 4–6. Include a large empty aquarium and separate cut-out pieces such as colorful fish, an octopus, starfish, seahorse, shells, rocks, bubbles, seaweed and a treasure chest.";

describe("the aquarium pack", () => {
  const spec = { ...defaultSpec, prompt: AQUARIUM, level: "Ages 4–5", pages: "3" };
  const project = buildWorksheetProject(spec);

  it("builds exactly three Cut & Create pages", () => {
    expect(project.pages).toHaveLength(3);
    for (const page of project.pages) {
      expect(page.activity?.kind).toBe("cut-create");
    }
    expect(project.pages.map((page) => (page.activity as { mechanic: string }).mechanic)).toEqual([
      "cut-create-build",
      "cut-create-scene",
      "cut-create-count",
    ]);
  });

  it("never mentions phonics or letters", () => {
    const text = JSON.stringify(project).toLowerCase();
    expect(text).not.toContain("phonic");
    expect(text).not.toContain("letter b");
    expect(text).not.toContain("beginning sound");
  });

  it("prints a big aquarium plus distinct, well-identified cut-out pieces", () => {
    const [one, two, three] = project.pages;
    const a1 = one!.activity as Extract<WorksheetActivity, { kind: "cut-create" }>;
    const a2 = two!.activity as typeof a1;
    const a3 = three!.activity as typeof a1;
    expect(a1.base.shape).toBe("aquarium");
    expect(a1.pieces.length).toBeGreaterThanOrEqual(4);
    // page 2 offers a DIFFERENT selection
    expect(new Set(a2.pieces.map((p) => p.asset))).not.toEqual(
      new Set(a1.pieces.map((p) => p.asset)),
    );
    // page 3 is a counting challenge that still cuts
    expect(a3.targets?.length).toBeGreaterThan(0);
    for (const target of a3.targets ?? []) {
      const printed = a3.pieces.filter((p) => p.asset === target.asset).length;
      expect(printed).toBe(target.quantity);
      expect(three!.answerKey.find((e) => e.groupId === target.id)?.answer).toBe(target.quantity);
    }
    const ids = project.pages.flatMap((page) =>
      (page.activity as typeof a1).pieces.map((p) => p.id),
    );
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("passes Alfa quality validation", () => {
    const report = validateWorksheetProject(project);
    expect(report.issues.filter((issue) => issue.severity === "error")).toEqual([]);
  });
});

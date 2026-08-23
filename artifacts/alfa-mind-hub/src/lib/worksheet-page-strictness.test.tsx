/**
 * STRICT PAGE PLAN — every requested page activity is a hard requirement.
 *
 * The pack below is the teacher's exact five-step Letter S progression. It
 * proves that: no page substitutes another activity, no page duplicates an
 * earlier one, the pattern page really contains a solvable repeating pattern,
 * and the closing page really offers blank handwriting space.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PrintablePage } from "@/components/studio/PrintablePage";
import type { WorksheetSpec } from "./creator-options";
import { parsePageDirectives } from "./page-directives";
import { explicitMechanicBreaches, structuralContractIssues } from "./worksheet-page-contract";
import { mechanicOfActivity } from "./worksheet-objectives";
import { buildValidWorksheetProject } from "./worksheet-service";

const prompt = `Create a 5-page Letter S phonics pack for ages 4-5 with a space theme.
Page 1: Trace uppercase S and lowercase s with guided arrows.
Page 2: Identify and circle pictures that begin with S.
Page 3: Match pictures beginning with S to the letter S.
Page 4: Complete a simple repeating picture pattern using objects beginning with S.
Page 5: Progress from guided tracing to independent writing of S and s.`;

const spec = {
  prompt,
  theme: "Space",
  skill: "Phonics",
  level: "Ages 4–5",
  difficulty: "Just right",
  duration: "10 minutes",
  approach: "Montessori",
  palette: "Sage",
  language: "English",
  printing: "Full color",
  pages: "5",
} as WorksheetSpec;

const expected = [
  "letter-trace",
  "beginning-sound-discrimination",
  "picture-letter-match",
  "pattern-complete",
  "letter-write",
] as const;

describe("5-page Letter S pack — strict page-plan validation", () => {
  const project = buildValidWorksheetProject(spec, 1);

  it("parses each written page into the activity it names", () => {
    expect(parsePageDirectives(spec).map((d) => d.mechanic)).toEqual([...expected]);
  });

  it("renders exactly the requested activity on every page", () => {
    expect(project.pages.map((page) => mechanicOfActivity(page.activity))).toEqual([...expected]);
  });

  it("uses five genuinely different activities — no repeats behind new titles", () => {
    const mechanics = project.pages.map((page) => mechanicOfActivity(page.activity));
    expect(new Set(mechanics).size).toBe(5);
    expect(explicitMechanicBreaches(project.pagePlanContract, project)).toEqual([]);
  });

  it("gives the pattern page a real, child-solvable repeating sequence", () => {
    const page = project.pages[3]!;
    expect(structuralContractIssues("pattern-complete", page, 4)).toEqual([]);
    const rows = page.activity.kind === "pick-one" ? page.activity.rows : [];
    const solvable = rows.find((row) => (row.patternUnit ?? []).length >= 2);
    expect(solvable).toBeDefined();
    const unit = solvable!.patternUnit!;
    (solvable!.promptObjects ?? []).forEach((item, index) => {
      expect(item.asset).toBe(unit[index % unit.length]);
    });
  });

  it("gives the closing page blank handwriting space instead of more tracing", () => {
    const page = project.pages[4]!;
    expect(structuralContractIssues("letter-write", page, 5)).toEqual([]);
    expect(page.activity.kind === "letter-trace" && page.activity.mode).toBe("independent");
    const html = renderToStaticMarkup(
      <PrintablePage project={project} page={page} index={4} mode="premium" />,
    );
    const blanks = [...html.matchAll(/data-blank-slots="(\d+)"/g)].map((m) => Number(m[1]));
    expect(html).toContain('data-writing-mode="independent"');
    expect(blanks.length).toBeGreaterThan(0);
    for (const count of blanks) expect(count).toBeGreaterThanOrEqual(3);
  });

  it("does not reprint the identical pictures on both handwriting pages", () => {
    const first = project.pages[0]!.activity;
    const last = project.pages[4]!.activity;
    const firstWords = first.kind === "letter-trace" ? first.words.map((w) => w.asset) : [];
    const lastWords = last.kind === "letter-trace" ? last.words.map((w) => w.asset) : [];
    expect(firstWords.join(",")).not.toBe(lastWords.join(","));
  });
});

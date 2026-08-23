/**
 * LEARNING-OBJECTIVE FIDELITY ACROSS A PACK
 * -----------------------------------------
 * Two things must hold on EVERY page of a pack:
 *   1. the requested activity mechanic is preserved (page-plan contract), and
 *   2. the page still teaches the pack's learning objective.
 * Theme is decoration: space visuals may dress the page, but a Letter S pack
 * practises /s/ on page 5 just as much as on page 1.
 */

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { defaultSpec } from "@/lib/creator-options";
import { applyPromptIntent } from "@/lib/learning-domains";
import { finalizeWorksheetProject, generateWorksheetProject } from "@/lib/worksheet-service";
import {
  assetPractisesObjective,
  isObjectiveNative,
  objectiveFidelityIssues,
  pageContentAssets,
  resolveLearningObjective,
} from "@/lib/learning-objective";
import { packQualityIssues } from "@/lib/theme-fidelity";
import { inTheme, resolveThemeScope } from "@/lib/theme-scope";
import { mechanicOfActivity } from "@/lib/worksheet-objectives";
import { PrintablePage } from "@/components/studio/PrintablePage";
import type { WorksheetProject } from "@/lib/worksheet-model";

const LETTER_S =
  "Create a 5-page Letter S phonics pack for ages 4–5 with a space theme. Use five different mechanics: letter hunt, same/different, matching, pattern completion, trace path.";

/** exactly what the Generate My Worksheet button does */
async function quickCreate(prompt: string, pages: string) {
  const spec = applyPromptIntent({ ...defaultSpec, prompt, level: "Ages 4–5", pages });
  return finalizeWorksheetProject(await generateWorksheetProject(spec), spec);
}

describe("Letter S space pack — objective fidelity on every page", () => {
  let project: WorksheetProject;
  const spec = applyPromptIntent({
    ...defaultSpec,
    prompt: LETTER_S,
    level: "Ages 4–5",
    pages: "5",
  });

  it("generates five pages with five different requested mechanics", async () => {
    project = await quickCreate(LETTER_S, "5");
    expect(project.pages).toHaveLength(5);
    const rendered = project.pages.map((page) => mechanicOfActivity(page.activity));
    expect(new Set(rendered).size).toBe(5);
    const contract = project.pagePlanContract ?? [];
    for (const entry of contract) {
      expect(rendered[entry.page - 1]).toBe(entry.requestedMechanic);
    }
  });

  it("resolves Letter S as the pack objective", () => {
    const objective = resolveLearningObjective(spec);
    expect(objective.kind).toBe("phonics-letter");
    expect(objective.letter).toBe("s");
  });

  it("practises the /s/ objective on every page, not only page 1", () => {
    expect(objectiveFidelityIssues(spec, project)).toEqual([]);
    const objective = resolveLearningObjective(spec);
    for (const page of project.pages) {
      // phonics-native pages (letter hunt, sound discrimination…) carry the
      // objective in their task and legitimately show contrast pictures
      if (isObjectiveNative(page)) continue;
      const assets = pageContentAssets(page);
      if (!assets.length) continue;
      const practising = assets.filter((asset) => assetPractisesObjective(objective, asset));
      expect(practising.length).toBeGreaterThanOrEqual(Math.ceil(assets.length / 2));
    }
  });

  it("names the letter in the wording of every page", () => {
    for (const page of project.pages) {
      expect(`${page.title} ${page.instruction}`).toMatch(/\bs\b|\/s\//i);
    }
  });

  it("renders all five pages with S vocabulary", () => {
    const html = project.pages
      .map((page, index) =>
        renderToStaticMarkup(
          <PrintablePage page={page} project={project} index={index} mode={project.printMode} />,
        ),
      )
      .join("\n");
    expect(html).toMatch(/star|sun|spaceship/i);
  });

  it("stays inside the SPACE theme — no sheep, snails or shells", () => {
    const scope = resolveThemeScope(spec);
    expect(scope.id).toBe("space");
    for (const page of project.pages) {
      for (const asset of pageContentAssets(page)) {
        expect(inTheme(scope, asset)).toBe(true);
      }
    }
    expect(packQualityIssues(spec, project)).toEqual([]);
  });

  it("makes the child's action practise phonics, not looks", () => {
    const match = project.pages.find((page) => page.activity.kind === "match-pairs");
    expect((match!.activity as { subtype?: string }).subtype).toBe("sound-to-picture");
    expect(
      (match!.activity as { right: Array<{ letter?: string }> }).right.every((item) => item.letter),
    ).toBe(true);
    const trace = project.pages.find((page) => page.activity.kind === "trace-draw");
    expect(trace!.instruction).toMatch(/letter S/i);
  });
});

describe("objective fidelity never fires for non-objective packs", () => {
  it("leaves a counting pack's theme content untouched", async () => {
    const prompt = "Create a 3-page butterfly counting worksheet for ages 4–5.";
    const spec = applyPromptIntent({ ...defaultSpec, prompt, level: "Ages 4–5", pages: "3" });
    expect(resolveLearningObjective(spec).constrainsContent).toBe(false);
    const project = await quickCreate(prompt, "3");
    expect(objectiveFidelityIssues(spec, project)).toEqual([]);
    expect(project.pages).toHaveLength(3);
  });
});

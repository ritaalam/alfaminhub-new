import { describe, expect, it } from "vitest";
import { defaultSpec } from "./creator-options";
import { applyPromptIntent } from "./learning-domains";
import {
  finalizeWorksheetProject,
  generateWorksheetProject,
  checkWorksheetProject,
  validateFinalizedPageData,
} from "./worksheet-service";
import { isVisuallyCorrectShapeMatch } from "./object-semantics";

/**
 * REAL CREATOR RUNTIME PATH.
 *
 * Mirrors exactly what WorksheetCreator + WorksheetStudio do at runtime:
 *   spec = applyPromptIntent(defaultSpec + prompt)
 *   project = await generateWorksheetProject(spec)   (async service entry)
 *   project = finalizeWorksheetProject(project, spec) (Creator re-finalizes)
 *   Studio gate = checkWorksheetProject(...).valid && validateFinalizedPageData(...)
 *
 * The earlier fixture test only exercised buildValidWorksheetProject and so
 * never touched the Studio's runtime data gate, which is what actually blanked
 * the pack in the app.
 */
const prompt = [
  "Create a 4-page worksheet pack for Ages 4–5 about shapes and thinking skills.",
  "",
  "Page 1: Circle all the triangles from a mixed group of shapes.",
  "Page 2: Match familiar objects to their basic shapes.",
  "Page 3: Sort 8 pictures — 4 food items and 4 things we play with.",
  "Page 4: Count a group of objects and draw the same number of circles.",
].join("\n");

describe("Creator runtime path — 4-page shapes & thinking skills", () => {
  it("passes the Studio production gate", async () => {
    const spec = structuredClone(applyPromptIntent({ ...defaultSpec, prompt }));
    const generated = await generateWorksheetProject(spec);
    const project = finalizeWorksheetProject(generated, spec);

    expect(project.pages).toHaveLength(4);
    // Studio gate #1 — full quality validation (valid, not just error-free)
    const validation = checkWorksheetProject(project, spec);
    expect(validation.issues).toEqual([]);
    expect(validation.valid).toBe(true);
    // Studio gate #2 — finalized runtime page data (this is what failed live)
    expect(project.pages.flatMap(validateFinalizedPageData)).toEqual([]);
  });
});

const visualShapePrompt = [
  "Create a 2-page worksheet pack for Ages 4–5 about early thinking skills.",
  "Page 1: Match four familiar everyday objects to the basic shapes they clearly look like.",
  "Page 2: Count the pictures in three rows and circle the correct number.",
].join("\n");

describe("Creator runtime path — exact 2-page visual-shape test", () => {
  it("renders only visually whitelisted object silhouettes and passes both Studio gates", async () => {
    const spec = structuredClone(
      applyPromptIntent({
        ...defaultSpec,
        prompt: visualShapePrompt,
        pages: "2",
        level: "Ages 4-5",
      }),
    );
    const generated = await generateWorksheetProject(spec);
    const project = finalizeWorksheetProject(generated, spec);

    expect(project.pages).toHaveLength(2);
    expect(checkWorksheetProject(project, spec).issues).toEqual([]);
    expect(project.pages.flatMap(validateFinalizedPageData)).toEqual([]);

    const shapePage = project.pages[0];
    expect(shapePage?.activity.kind).toBe("match-pairs");
    if (!shapePage || shapePage.activity.kind !== "match-pairs") return;
    for (const object of shapePage.activity.left) {
      const target = shapePage.activity.right.find(
        (candidate) => candidate.pairId === object.pairId,
      );
      expect(target).toBeDefined();
      expect(isVisuallyCorrectShapeMatch(object.asset, target?.asset ?? "")).toBe(true);
    }
  });
});

import { describe, expect, it } from "vitest";
import { defaultSpec, type WorksheetSpec } from "./creator-options";
import { localIllustrationAssetsForSpec, selectLocalIllustrations } from "./illustration-library";
import { visualAssetKeys } from "./semantic-topics";
import { buildValidWorksheetProject, checkWorksheetProject } from "./worksheet-service";

function spec(prompt: string, theme: string): WorksheetSpec {
  return {
    ...defaultSpec,
    prompt,
    theme,
    level: "Ages 4–5",
    activityType: "Count & Match",
    printing: "Ink Saving",
  };
}

describe("local illustration library", () => {
  it("uses sea animals rather than transport props for an ocean-animal worksheet", () => {
    const assets = localIllustrationAssetsForSpec(
      spec("Create a count-and-match worksheet about sea animals.", "Ocean"),
      "count-match",
    );
    expect(assets).toContain("dolphin");
    expect(assets).toContain("seahorse");
    expect(assets).not.toContain("boat");
    expect(assets.every((asset) => visualAssetKeys.includes(asset))).toBe(true);
  });

  it("keeps explicitly named objects locked instead of replacing them with a theme collection", () => {
    const selection = selectLocalIllustrations(
      spec("Count 1–5 dolphins and circle the correct number.", "Ocean"),
      "count-circle",
    );
    expect(selection.assets).toEqual(["dolphin"]);
    expect(selection.source).toBe("alfa-local");
  });

  it("normalizes a stable, print-aware external lookup intent without requesting it", () => {
    const selection = selectLocalIllustrations(
      spec("Create a count worksheet about sea animals.", "Ocean"),
      "count-circle",
    );
    expect(selection.intent.topic).toBe("sea-animals");
    expect(selection.intent.printStyle).toBe("Ink Saving");
    expect(selection.intent.cacheKey).toContain("sea-animals");
    expect(selection.intent.terms.length).toBeGreaterThan(0);
  });

  it("preserves renderer and answer-key integrity after semantic asset selection", () => {
    const project = buildValidWorksheetProject(
      spec("Count groups from 1–5 of friendly sea animals and match each group to a number.", "Ocean"),
    );
    expect(checkWorksheetProject(project)).toEqual([]);
    for (const page of project.pages) {
      if (page.activity.kind !== "count-match") continue;
      for (const group of page.activity.groups) {
        expect(group.correctAnswer).toBe(group.renderedObjects.length);
        expect(group.renderedObjects.every((object) => visualAssetKeys.includes(object.asset))).toBe(true);
      }
    }
  });
});
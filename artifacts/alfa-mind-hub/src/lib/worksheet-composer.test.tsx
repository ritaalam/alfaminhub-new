import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { composePage } from "./worksheet-composer";
import { defaultSpec } from "./creator-options";
import { resolveAgeTokens } from "./age-tokens";
import { resolvePalette, flattenComponents } from "./worksheet-model";
import { resolveVisualDirection, resolveIllustrationStyle } from "./visual-directions";
import { ComposedRenderer } from "@/components/studio/ComposedRenderer";
import type { PageSemanticRequirements } from "./worksheet-model";

const spec = {
  ...defaultSpec,
  prompt: "shapes and thinking skills",
  level: "Ages 4-5",
  pages: "5",
};

function requirements(partial: Partial<PageSemanticRequirements>): PageSemanticRequirements {
  return {
    pageIntent: "test",
    requiredEntities: [],
    requiredCategories: [],
    requiredRelationships: [],
    patternRules: [],
    ...partial,
  };
}

function renderComposed(page: ReturnType<typeof composePage>) {
  if (page.activity.kind !== "composed") throw new Error("expected a composed page");
  return renderToStaticMarkup(
    <ComposedRenderer
      activity={page.activity}
      palette={resolvePalette("Montessori Neutrals", "premium")}
      style={resolveIllustrationStyle({
        direction: resolveVisualDirection(undefined),
        purpose: "counting",
        ageId: "Ages 4-5",
      })}
      tokens={resolveAgeTokens("Ages 4-5")}
      answerKey={page.answerKey}
      widthMm={186}
    />,
  );
}

describe("dynamic page composer", () => {
  it("keeps the requested mechanic and specification instead of substituting a template", () => {
    const page = composePage({
      spec,
      mechanic: "match-pairs",
      requirements: requirements({
        activitySubtype: "object-to-shape",
        studentAction: "match",
        responseMode: "draw-line",
        contentDomain: "shapes",
      }),
      page: 2,
      seed: 42,
      range: [1, 10],
    });
    expect(page.activity.kind).toBe("composed");
    if (page.activity.kind !== "composed") return;
    expect(page.activity.mechanic).toBe("match-pairs");
    expect(page.activity.specification.subtype).toBe("object-to-shape");
    expect(page.activity.specification.responseMode).toBe("draw-line");
  });

  it("pairs every object with its own shape, after shuffling the answer column", () => {
    const page = composePage({
      spec,
      mechanic: "match-pairs",
      requirements: requirements({ activitySubtype: "object-to-shape", studentAction: "match" }),
      page: 2,
      seed: 7,
      range: [1, 10],
    });
    if (page.activity.kind !== "composed") throw new Error("not composed");
    const columns = flattenComponents(page.activity.components).find(
      (c) => c.type === "match-columns",
    );
    expect(columns?.type).toBe("match-columns");
    if (columns?.type !== "match-columns") return;
    for (const entry of columns.left) {
      expect(entry.targetId).toBeTruthy();
      expect(columns.right.some((r) => r.id === entry.targetId)).toBe(true);
    }
    // every answer card is used exactly once
    const targets = columns.left.map((entry) => entry.targetId);
    expect(new Set(targets).size).toBe(targets.length);
  });

  it("composes a draw-the-answer counting page whose key matches the printed pictures", () => {
    const page = composePage({
      spec,
      mechanic: "count-circle",
      requirements: requirements({ studentAction: "count", responseMode: "draw" }),
      page: 5,
      seed: 11,
      range: [1, 10],
    });
    if (page.activity.kind !== "composed") throw new Error("not composed");
    const groups = flattenComponents(page.activity.components).filter(
      (c) => c.type === "counting-group",
    );
    expect(groups.length).toBeGreaterThanOrEqual(3);
    for (const group of groups) {
      if (group.type !== "counting-group") continue;
      expect(group.items).toHaveLength(group.answer);
      expect(page.answerKey.find((entry) => entry.groupId === group.id)?.answer).toBe(group.answer);
    }
  });

  it("renders composed pages with real printed components", () => {
    const shapes = renderComposed(
      composePage({
        spec,
        mechanic: "match-pairs",
        requirements: requirements({ activitySubtype: "object-to-shape" }),
        page: 2,
        seed: 3,
        range: [1, 10],
      }),
    );
    expect((shapes.match(/data-match-entry/g) ?? []).length).toBeGreaterThanOrEqual(6);

    const drawing = renderComposed(
      composePage({
        spec,
        mechanic: "count-circle",
        requirements: requirements({ studentAction: "count", responseMode: "draw" }),
        page: 5,
        seed: 4,
        range: [1, 10],
      }),
    );
    expect((drawing.match(/data-drawing-area/g) ?? []).length).toBeGreaterThanOrEqual(3);
  });

  it("locks composed content so theme repair cannot swap its pictures", () => {
    const page = composePage({
      spec,
      mechanic: "sort-attribute",
      requirements: requirements({
        studentAction: "sort",
        categoryGroups: [
          { label: "Things We Eat", members: ["apple", "banana", "carrot", "egg"] },
          { label: "Things We Play With", members: ["ball", "balloon", "boat", "bicycle"] },
        ],
      }),
      page: 3,
      seed: 5,
      range: [1, 10],
    });
    expect(page.contentLocked).toBe(true);
    expect(page.answerKey.map((entry) => entry.answerText)).toEqual([
      "Things We Eat",
      "Things We Play With",
    ]);
  });
});

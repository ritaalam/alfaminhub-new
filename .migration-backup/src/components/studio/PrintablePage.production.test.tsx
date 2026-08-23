import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { defaultSpec, type WorksheetSpec } from "@/lib/creator-options";
import { buildValidWorksheetProject } from "@/lib/worksheet-service";
import type { VisualAssetKey } from "@/lib/worksheet-model";
import { PrintablePage } from "./PrintablePage";

const scenarios: Array<{ theme: string; prompt: string }> = [
  { theme: "Insects", prompt: "Count butterflies from 1 to 10." },
  { theme: "Insects", prompt: "Count ladybugs from 1 to 10." },
  { theme: "Insects", prompt: "Count bees from 1 to 10." },
  { theme: "Insects", prompt: "Count dragonflies from 1 to 10." },
  { theme: "Animals", prompt: "Count animals from 1 to 10." },
  { theme: "Fruits", prompt: "Count fruits from 1 to 10." },
  { theme: "Space", prompt: "Count stars from 1 to 10." },
  { theme: "Insects", prompt: "Count mixed insects from 1 to 10." },
];

function specFor(scenario: (typeof scenarios)[number]): WorksheetSpec {
  return {
    ...defaultSpec,
    level: "Grade 1",
    difficulty: "Challenge",
    pages: "2",
    activityType: "Counting",
    theme: scenario.theme,
    prompt: scenario.prompt,
  };
}

function exercisesFromMarkup(markup: string) {
  const starts = [
    ...markup.matchAll(/data-count-exercise-id="([^"]+)" data-correct-answer="(\d+)"/g),
  ];
  return starts.map((match, index) => {
    const start = match.index ?? 0;
    const end = starts[index + 1]?.index ?? markup.length;
    const section = markup.slice(start, end);
    return {
      id: match[1]!,
      answer: Number(match[2]),
      renderedCount: (section.match(/data-rendered-object-id=/g) ?? []).length,
    };
  });
}

describe("production PrintablePage counting integrity", () => {
  it("renders 100+ fresh exercises from the exact finalized arrays used by answers and keys", () => {
    let checked = 0;
    const seenAssets = new Set<VisualAssetKey>();

    for (const scenario of scenarios) {
      const spec = specFor(scenario);
      for (let version = 1; version <= 8; version++) {
        const project = buildValidWorksheetProject(spec, version);
        for (const [index, page] of project.pages.entries()) {
          const markup = renderToStaticMarkup(
            <PrintablePage project={project} page={page} index={index} mode="premium" />,
          );
          expect(markup).not.toContain("data-worksheet-runtime-error");

          const rendered = exercisesFromMarkup(markup);
          if (page.activity.kind !== "count-match" && page.activity.kind !== "count-circle")
            continue;
          const activity = page.activity;
          const groups = activity.kind === "count-match" ? activity.groups : activity.rows;
          expect(rendered).toHaveLength(groups.length);

          for (const group of groups) {
            group.renderedObjects.forEach((object) => seenAssets.add(object.asset));
            const dom = rendered.find((exercise) => exercise.id === group.id);
            const key = page.answerKey.find((entry) => entry.groupId === group.id);
            expect(dom?.renderedCount).toBe(group.renderedObjects.length);
            expect(dom?.renderedCount).toBe(group.correctAnswer);
            expect(key?.answer).toBe(group.correctAnswer);
            if (activity.kind === "count-circle") {
              const row = activity.rows.find((candidate) => candidate.id === group.id);
              expect(row?.choices.filter((choice) => choice === group.correctAnswer)).toHaveLength(
                1,
              );
            } else {
              expect(
                activity.numberChoices.filter((choice) => choice === group.correctAnswer),
              ).toHaveLength(1);
            }
            checked++;
          }
        }
      }
    }

    expect(checked).toBeGreaterThanOrEqual(100);
    expect(seenAssets.size).toBeGreaterThanOrEqual(8);
  }, 30_000);

  it("refuses to render a page whose finalized answer is inconsistent", () => {
    const spec = specFor(scenarios[0]!);
    const project = buildValidWorksheetProject(spec, 999);
    const page = project.pages[0]!;
    if (page.activity.kind !== "count-match" && page.activity.kind !== "count-circle") return;
    const first =
      page.activity.kind === "count-match" ? page.activity.groups[0]! : page.activity.rows[0]!;
    const brokenGroup = { ...first, correctAnswer: first.correctAnswer + 1 };
    const brokenPage = (
      page.activity.kind === "count-match"
        ? {
            ...page,
            activity: { ...page.activity, groups: [brokenGroup, ...page.activity.groups.slice(1)] },
          }
        : {
            ...page,
            activity: {
              ...page.activity,
              rows: [
                {
                  ...brokenGroup,
                  choices:
                    page.activity.kind === "count-circle" ? page.activity.rows[0]!.choices : [],
                },
                ...page.activity.rows.slice(1),
              ],
            },
          }
    ) as typeof page;
    const markup = renderToStaticMarkup(
      <PrintablePage project={project} page={brokenPage} index={0} mode="premium" />,
    );
    expect(markup).toContain("data-worksheet-runtime-error");
    expect(markup).not.toContain("data-rendered-object-id");
  });
});

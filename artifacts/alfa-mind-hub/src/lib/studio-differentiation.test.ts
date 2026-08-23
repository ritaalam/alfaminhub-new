import { defaultSpec } from "./creator-options";
import { applyPromptIntent } from "./learning-domains";
import { applyStudioAction } from "./worksheet-actions";
import { buildWorksheetProject } from "./worksheet-builder";
import {
  checkWorksheetProject,
  finalizeWorksheetProject,
  validateFinalizedPageData,
} from "./worksheet-service";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Studio differentiation: ${message}`);
}

function memoryPairsPage(project: ReturnType<typeof buildWorksheetProject>) {
  const page = project.pages[0]!;
  assert(page.activity.kind === "memory-pairs", "expected a Memory Pairs page.");
  return page;
}

function projectIssues(
  project: ReturnType<typeof buildWorksheetProject>,
  spec: typeof defaultSpec,
) {
  return [
    ...checkWorksheetProject(project, spec).issues,
    ...project.pages.flatMap(validateFinalizedPageData),
  ];
}

/** Exercises the same project-update path Worksheet Studio uses for its controls. */
export function runStudioDifferentiationTests() {
  const spec = applyPromptIntent({
    ...defaultSpec,
    prompt: "Theme Vocabulary Memory Pairs. Learn and use new words connected to an insects theme.",
    level: "Ages 4–5",
    pages: "1",
    skill: "Vocabulary",
    activityType: "Memory Pairs",
    difficulty: "Easy",
    theme: "Insects",
    objectiveId: "vocabulary-theme",
    mechanicId: "memory",
    subjectDomain: "Early Literacy",
    activityMechanic: "memory-pairs",
    source: "idea-lab",
  });
  const initial = finalizeWorksheetProject(buildWorksheetProject(spec, 41), spec);
  const initialPage = memoryPairsPage(initial);
  const harder = finalizeWorksheetProject(
    applyStudioAction(initial, spec, { type: "make-harder", pageId: initialPage.id }),
    spec,
  );
  const harderPage = memoryPairsPage(harder);
  const easier = finalizeWorksheetProject(
    applyStudioAction(harder, spec, { type: "make-easier", pageId: harderPage.id }),
    spec,
  );
  const easierPage = memoryPairsPage(easier);

  assert(initialPage.activity.cards.length === 12, "the age-4–5 deck begins with six pairs.");
  assert(
    harderPage.activity.cards.length === 16,
    "Make harder adds two vocabulary pairs instead of only changing copy.",
  );
  assert(!harderPage.activity.showLabels, "Make harder removes the word cue.");
  assert(
    harderPage.activity.cards.length !== initialPage.activity.cards.length,
    "Make harder changes the printable card content.",
  );
  assert(harderPage.activity.kind === initialPage.activity.kind, "the matching activity is retained.");
  assert(harder.meta.level === initial.meta.level, "the selected level is retained.");
  assert(harder.meta.theme === initial.meta.theme, "the selected topic is retained.");
  assert(
    easierPage.activity.cards.length === 12,
    "Make easier removes the additional vocabulary pairs.",
  );
  assert(easierPage.activity.showLabels, "Make easier restores the word cue.");

  for (const [name, project] of [
    ["initial", initial],
    ["harder", harder],
    ["easier", easier],
  ] as const) {
    assert(projectIssues(project, spec).length === 0, `${name} version must remain Studio-valid.`);
  }
}
import { defaultSpec } from "./creator-options";
import { briefTitle } from "../components/creator/WorksheetBrief";
import {
  applyQuickCreatePromptIntent,
  canonicalQuickCreateRequest,
  replaceQuickCreatePrompt,
} from "./learning-domains";
import { buildValidWorksheetProject, checkWorksheetProject } from "./worksheet-service";
import { mechanicOfActivity } from "./worksheet-objectives";
import { planWorksheetSpec } from "./worksheet-ai-planner";
import {
  advancedActivityTypeSupportFor,
  assertPromptActivityTypeSupported,
} from "./worksheet-renderer-support";
import type { WorksheetMechanicId } from "./worksheet-model";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Quick activity-type contract: ${message}`);
}

const cases: Array<{
  prompt: string;
  activityType: string;
  mechanics: WorksheetMechanicId[];
}> = [
  {
    prompt: "Create a counting worksheet for Ages 4–5.",
    activityType: "Counting",
    mechanics: ["count-match", "count-circle"],
  },
  {
    prompt: "Create a matching worksheet for Ages 4–5.",
    activityType: "Matching",
    mechanics: ["match-pairs"],
  },
  {
    prompt: "Create an underwater maze for Ages 4–5.",
    activityType: "Maze",
    mechanics: ["maze-route"],
  },
];

/**
 * Quick Create must use one prompt-derived type through summary metadata,
 * generation and Studio. This catches the former path where preview retained
 * Counting while the prompt asked for Matching.
 */
export async function runQuickActivityTypeContractTests() {
  for (const entry of cases) {
    const spec = applyQuickCreatePromptIntent({
      ...defaultSpec,
      prompt: entry.prompt,
      pages: "1",
      activityType: "Worksheet",
    });
    const support = advancedActivityTypeSupportFor(entry.activityType);
    assert(spec.activityType === entry.activityType, `${entry.prompt} must set ${entry.activityType}.`);
    assert(
      briefTitle(spec).includes(`${entry.activityType} Activity`),
      `${entry.activityType} preview metadata must use the current prompt type.`,
    );
    assert(
      support?.status === "supported" &&
        (support.mechanic === undefined || entry.mechanics.includes(support.mechanic)),
      `${entry.activityType} must have an approved supported renderer.`,
    );

    const project = buildValidWorksheetProject(spec);
    assert(
      project.generationSpecification?.normalizedSpec.activityType === entry.activityType,
      `${entry.activityType} must remain in the frozen generation spec.`,
    );
    assert(
      project.pages.every((page) => entry.mechanics.includes(mechanicOfActivity(page.activity))),
      `${entry.activityType} Studio pages must render only its approved mechanic family.`,
    );
    assert(
      checkWorksheetProject(project, spec).valid,
      `${entry.activityType} Studio project must pass validation.`,
    );
  }

  const changedPrompt = applyQuickCreatePromptIntent({
    ...defaultSpec,
    activityType: "Matching",
    prompt: "Create an underwater maze for Ages 4–5.",
  });
  assert(
    changedPrompt.activityType === "Maze",
    "changing a Quick Create prompt must clear the previous activity type.",
  );

  const transitions: Array<{ prompt: string; type: string; mechanics: WorksheetMechanicId[] }> = [
    { prompt: "Create an underwater maze for Ages 4–5.", type: "Maze", mechanics: ["maze-route"] },
    {
      prompt: "Create a matching worksheet for Ages 4–5.",
      type: "Matching",
      mechanics: ["match-pairs"],
    },
    {
      prompt: "Create a counting worksheet for Ages 4–5.",
      type: "Counting",
      mechanics: ["count-match", "count-circle"],
    },
    { prompt: "Create an underwater maze for Ages 4–5.", type: "Maze", mechanics: ["maze-route"] },
    {
      prompt: "Create a matching worksheet for Ages 4–5.",
      type: "Matching",
      mechanics: ["match-pairs"],
    },
  ];
  let transitionSpec = { ...defaultSpec, pages: "1", activityType: "Maze" };
  for (const transition of transitions) {
    // This models the no-refresh return from Studio: the previous project may
    // still exist in component memory, but it must never participate in the
    // next prompt-derived request.
    transitionSpec = replaceQuickCreatePrompt(transitionSpec, transition.prompt);
    assert(
      transitionSpec.activityType === transition.type,
      `transition to ${transition.type} must replace the previous activity type.`,
    );
    assert(
      briefTitle(transitionSpec).includes(`${transition.type} Activity`),
      `transition preview must show ${transition.type} Activity.`,
    );
    let remotePlannerCalled = false;
    const planning = await planWorksheetSpec(transitionSpec, "quick", async () => {
      remotePlannerCalled = true;
      throw new Error("Named Quick Create activities must not call remote planning.");
    });
    assert(remotePlannerCalled === false, `${transition.type} must not spend a remote planner call.`);
    assert(planning.source === "local", `${transition.type} must use deterministic local planning.`);
    const activeSpec = canonicalQuickCreateRequest({
      ...planning.spec,
      prompt: transitionSpec.prompt,
    });
    assert(
      activeSpec.activityType === transition.type,
      `${transition.type} must remain the current request after planning.`,
    );
    const project = buildValidWorksheetProject(activeSpec);
    assert(
      project.generationSpecification?.normalizedSpec.activityType === transition.type,
      `${transition.type} must remain in the frozen Studio and print specification.`,
    );
    assert(
      project.pages.every((page) => transition.mechanics.includes(mechanicOfActivity(page.activity))),
      `transition to ${transition.type} must generate its matching renderer.`,
    );
  }

  const clearedPrompt = replaceQuickCreatePrompt(transitionSpec, "");
  assert(
    clearedPrompt.activityType === defaultSpec.activityType &&
      !clearedPrompt.promptRequirements?.requestedActivity,
    "clearing a Quick Create prompt must remove the previous activity contract.",
  );
  assert(
    !briefTitle(clearedPrompt).includes("Worksheet Activity"),
    "clearing a Quick Create prompt must not display a generic worksheet type during replacement.",
  );
  const matchingAfterClear = replaceQuickCreatePrompt(
    clearedPrompt,
    "Create a worksheet for matching sea animals for Ages 4–5.",
  );
  assert(
    matchingAfterClear.activityType === "Matching",
    "an explicit activity must immediately replace the blank prompt's neutral state.",
  );

  const unsupported = applyQuickCreatePromptIntent({
    ...defaultSpec,
    prompt: "Create a coloring worksheet for Ages 4–5.",
  });
  assert(unsupported.activityType === "Coloring", "unsupported prompts must retain their named type.");
  let blocked = false;
  try {
    assertPromptActivityTypeSupported(unsupported);
  } catch (error) {
    blocked =
      error instanceof Error &&
      error.message.includes("Coloring is not available yet because Alfa does not have a coloring-page renderer.");
  }
  assert(blocked, "unsupported named activities must stop with a clear renderer message.");
}
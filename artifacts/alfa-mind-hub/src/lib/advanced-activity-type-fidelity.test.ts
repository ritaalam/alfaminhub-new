import { defaultSpec, type WorksheetSpec } from "./creator-options";
import { applyQuickCreatePromptIntent } from "./learning-domains";
import { buildValidWorksheetProject, checkWorksheetProject } from "./worksheet-service";
import {
  advancedActivityMechanicFor,
  advancedActivityTypeAudit,
  assertAdvancedActivityTypeSupported,
  isAdvancedActivityTypeLocked,
  normalizeWorksheetSpecForRenderer,
  withoutAdvancedActivityType,
  type AdvancedActivityTypeSupport,
} from "./worksheet-renderer-support";
import { mechanicOfActivity, resolveObjectiveProfile } from "./worksheet-objectives";
import { mazeIntegrityIssues } from "./worksheet-model";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Advanced activity fidelity: ${message}`);
}

function advancedSpec(activityType: string): WorksheetSpec {
  return {
    ...defaultSpec,
    prompt:
      activityType === "Matching"
        ? "Create a Matching activity with turtle."
        : `Create a ${activityType} activity about ocean animals.`,
    activityType,
    advancedActivityType: activityType,
    pages: "1",
  };
}

function assertSupportedActivity(entry: AdvancedActivityTypeSupport) {
  const spec = advancedSpec(entry.activityType);
  assertAdvancedActivityTypeSupported(spec);
  assert(
    advancedActivityMechanicFor(spec) === entry.mechanic,
    `${entry.activityType} should resolve to its audited mechanic.`,
  );
  const project = buildValidWorksheetProject(spec);
  assert(project.pages.length === 1, `${entry.activityType} should create the requested page count.`);
  if (entry.mechanic) {
    assert(
      mechanicOfActivity(project.pages[0]!.activity) === entry.mechanic,
      `${entry.activityType} must render ${entry.mechanic}, not another mechanic.`,
    );
    assert(
      project.pagePlanContract?.every((page) => page.explicit && page.requestedMechanic === entry.mechanic),
      `${entry.activityType} must be immutable through the generated page contract.`,
    );
  } else {
    assert(
      Boolean(project.pages[0]!.activity.kind),
      `${entry.activityType} must generate a real skill-directed worksheet activity.`,
    );
  }
}

function assertUnsupportedActivity(entry: AdvancedActivityTypeSupport) {
  const spec = advancedSpec(entry.activityType);
  let failure: unknown;
  try {
    buildValidWorksheetProject(spec);
  } catch (error) {
    failure = error;
  }
  assert(
    failure instanceof Error && failure.name === "UnsupportedAdvancedActivityTypeError",
    `${entry.activityType} must block instead of substituting another activity.`,
  );
  assert(
    failure instanceof Error && failure.message.includes("renderer"),
    `${entry.activityType} should explain why it is unavailable.`,
  );
}

/** Covers every Advanced Create menu choice and the Maze no-substitution regression. */
export function runAdvancedActivityTypeFidelityTests() {
  for (const entry of advancedActivityTypeAudit) {
    if (entry.status === "supported") assertSupportedActivity(entry);
    else assertUnsupportedActivity(entry);
  }

  const maze = advancedSpec("Maze");
  assert(
    advancedActivityMechanicFor(maze) === "maze-route",
    "Maze must resolve to its own mechanic, never tracing.",
  );
  const mazeProject = buildValidWorksheetProject(maze);
  const mazePage = mazeProject.pages[0]!;
  assert(mazePage.activity.kind === "maze", "Maze must render a maze activity, not another page kind.");
  if (mazePage.activity.kind === "maze") {
    assert(
      mazeIntegrityIssues(mazePage.activity).length === 0,
      "Maze must have continuous walls, dead ends, and a valid START-to-FINISH route.",
    );
    assert(
      mazePage.answerKey[0]?.answer === mazePage.activity.solution.length,
      "Maze answer key must preserve the verified route length.",
    );
  }
  const multiPageMaze = buildValidWorksheetProject({ ...maze, pages: "2" });
  assert(
    multiPageMaze.pages.length === 2 && multiPageMaze.pages.every((page) => page.activity.kind === "maze"),
    "A multi-page Maze pack must keep every page as a genuine maze.",
  );
  assert(
    resolveObjectiveProfile({ ...defaultSpec, mechanicId: "maze", activityType: "Worksheet" }).mechanic ===
      "maze-route",
    "A structured maze mechanic must resolve to Maze rather than letter tracing.",
  );
  const structuredMaze = buildValidWorksheetProject({
    ...defaultSpec,
    mechanicId: "maze",
    activityType: "Worksheet",
    prompt: "Create a maze about ocean animals.",
    pages: "1",
  });
  assert(
    structuredMaze.pages[0]?.activity.kind === "maze",
    "A structured maze request must generate a maze page, never a tracing page.",
  );

  const underwaterFishMazeSpec: WorksheetSpec = {
    ...defaultSpec,
    prompt: "Create a one-page A4 preschool underwater fish maze for ages 4–5.",
    activityType: "Maze",
    advancedActivityType: "Maze",
    level: "Ages 4–5",
    paper: "A4",
    theme: "Underwater",
    pages: "1",
  };
  const underwaterFishMaze = buildValidWorksheetProject(underwaterFishMazeSpec);
  assert(
    underwaterFishMaze.pages[0]?.activity.kind === "maze",
    "An underwater fish Advanced Maze must remain a playable maze.",
  );
  assert(
    underwaterFishMaze.pages[0]?.title.includes("Underwater") ||
      underwaterFishMaze.pages[0]?.title.includes("Fish"),
    "A themed maze must preserve its requested context in the page title.",
  );
  assert(
    checkWorksheetProject(underwaterFishMaze, underwaterFishMazeSpec).valid,
    "A valid themed Advanced Maze must pass the complete worksheet validation gate.",
  );

  const fishCounting = buildValidWorksheetProject({
    ...defaultSpec,
    prompt: "Create a counting worksheet with fish.",
    activityType: "Worksheet",
    level: "Ages 4–5",
    pages: "1",
  });
  const brokenFishCounting = structuredClone(fishCounting);
  const countPage = brokenFishCounting.pages[0];
  if (countPage?.activity.kind === "count-match") {
    countPage.activity = {
      ...countPage.activity,
      groups: countPage.activity.groups.map((group) => ({
        ...group,
        renderedObjects: group.renderedObjects.map((object) => ({ ...object, asset: "butterfly" })),
      })),
    };
  }
  const brokenFishValidation = checkWorksheetProject(
    brokenFishCounting,
    brokenFishCounting.generationSpecification!.normalizedSpec,
  );
  assert(
    !brokenFishValidation.valid &&
      brokenFishValidation.issues.some((issue) => issue.message.toLowerCase().includes("fish")),
    "Object validation must remain strict for counting activities.",
  );

  const quickAfterAdvanced = applyQuickCreatePromptIntent({
    ...withoutAdvancedActivityType(maze),
    prompt: "Create a matching worksheet.",
  });
  assert(
    !isAdvancedActivityTypeLocked(quickAfterAdvanced),
    "switching to Quick Create must remove a stale Advanced activity contract.",
  );
  assert(
    normalizeWorksheetSpecForRenderer(quickAfterAdvanced).activityType === "Matching",
    "Quick Create must derive a new prompt's activity type instead of retaining a prior Advanced selection.",
  );
}
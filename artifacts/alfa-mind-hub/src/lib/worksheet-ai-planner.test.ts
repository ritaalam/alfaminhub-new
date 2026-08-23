import type { WorksheetPlanningResult } from "@workspace/api-client-react";
import { defaultSpec } from "./creator-options";
import {
  clearWorksheetPlanningCache,
  getWorksheetTelemetry,
  resetWorksheetTelemetry,
  worksheetPlanningCacheKey,
} from "./worksheet-cost-firewall";
import {
  planWorksheetSpec,
  type WorksheetPlannerTransport,
  worksheetPlanningTimeoutMs,
} from "./worksheet-ai-planner";
import {
  GENERATION_ENGINE_VERSION,
  PLANNER_VERSION,
  checkWorksheetProject,
  finalizeWorksheetProject,
  generateWorksheetProject,
  validateFinalizedPageData,
} from "./worksheet-service";

const quickPrompt = "Create an ocean sorting activity for a Grade 1 class.";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Hybrid worksheet planner: ${message}`);
}

async function assertLocalGeneration(spec: typeof defaultSpec) {
  const generated = await generateWorksheetProject(spec);
  const project = finalizeWorksheetProject(generated, spec);
  assert(checkWorksheetProject(project, spec).valid, "the local project must pass Studio validation.");
  assert(
    project.pages.flatMap(validateFinalizedPageData).length === 0,
    "the local project must pass the finalized page data gate.",
  );
}

/**
 * Runs through the existing Vite-based pedagogical test runner. It mirrors
 * Quick Create's AI-success and unavailable-provider paths while asserting
 * that the printable always comes from the local worksheet engine.
 */
export async function runHybridWorksheetPlannerTests() {
  clearWorksheetPlanningCache();
  resetWorksheetTelemetry();

  const cacheSpec = { ...defaultSpec, prompt: "Create a farm sorting activity for Grade 1." };
  let cacheTransportCalls = 0;
  const cachedTransport: WorksheetPlannerTransport = async () => {
    cacheTransportCalls += 1;
    return { source: "ai", patch: { skill: "Sorting", theme: "Farm" } };
  };
  const firstCachedPlan = await planWorksheetSpec(cacheSpec, "quick", cachedTransport);
  const secondCachedPlan = await planWorksheetSpec(cacheSpec, "quick", async () => {
    cacheTransportCalls += 1;
    throw new Error("The cache should prevent this second transport call.");
  });
  assert(firstCachedPlan.source === "ai", "a sanitized AI result should be cacheable.");
  assert(secondCachedPlan.source === "ai", "an equivalent request should reuse the sanitized AI result.");
  assert(cacheTransportCalls === 1, "an equivalent request must not trigger another AI planner call.");
  assert(
    getWorksheetTelemetry().cacheHits === 1,
    "the cost firewall should record the local planning cache hit.",
  );
  const cacheInput = {
    prompt: cacheSpec.prompt,
    baseSpec: {
      level: cacheSpec.level,
      duration: cacheSpec.duration,
      pages: cacheSpec.pages,
      approach: cacheSpec.approach,
      skill: cacheSpec.skill,
      activityType: cacheSpec.activityType,
      difficulty: cacheSpec.difficulty,
      theme: cacheSpec.theme,
      language: cacheSpec.language,
    },
    lockedFields: [],
  };
  assert(
    worksheetPlanningCacheKey(cacheInput, GENERATION_ENGINE_VERSION, PLANNER_VERSION) !==
      worksheetPlanningCacheKey(cacheInput, `${GENERATION_ENGINE_VERSION}-next`, PLANNER_VERSION),
    "a new generation engine version must not reuse an older planning cache entry.",
  );
  assert(
    worksheetPlanningCacheKey(cacheInput, GENERATION_ENGINE_VERSION, PLANNER_VERSION) !==
      worksheetPlanningCacheKey(cacheInput, GENERATION_ENGINE_VERSION, `${PLANNER_VERSION}-next`),
    "a new planner version must not reuse an older planning cache entry.",
  );

  clearWorksheetPlanningCache();
  const transport: WorksheetPlannerTransport = async () =>
    ({
      source: "ai",
      patch: {
        skill: "Counting",
        activityType: "Sorting",
        theme: "Ocean",
        difficulty: "Standard",
      },
    }) satisfies WorksheetPlanningResult;

  const aiPlanned = await planWorksheetSpec({ ...defaultSpec, prompt: quickPrompt }, "quick", transport);
  assert(aiPlanned.source === "ai", "a valid planner response should use the AI path.");
  assert(
    aiPlanned.spec.theme === "Sea Creatures",
    "an AI patch must not replace a theme explicitly derived from the prompt.",
  );
  assert(
    aiPlanned.spec.activityType === "Sorting",
    "an explicit sorting request must retain its supported activity type.",
  );
  assert(aiPlanned.spec.level === "Grade 1", "local prompt parsing should retain the requested level.");
  await assertLocalGeneration({ ...aiPlanned.spec, planningSource: "ai" });

  clearWorksheetPlanningCache();
  const unavailable: WorksheetPlannerTransport = async () => {
    throw new Error("AI provider unavailable");
  };
  const fallback = await planWorksheetSpec({ ...defaultSpec, prompt: quickPrompt }, "quick", unavailable);
  assert(fallback.source === "local", "an unavailable provider should use local planning.");
  assert(fallback.spec.level === "Grade 1", "local planning should retain the requested level.");
  assert(fallback.spec.theme === "Sea Creatures", "local planning should interpret the requested theme.");
  await assertLocalGeneration({ ...fallback.spec, planningSource: "local" });

  clearWorksheetPlanningCache();
  const startedAt = Date.now();
  const timeoutFallback = await planWorksheetSpec(
    { ...defaultSpec, prompt: quickPrompt },
    "quick",
    (_input, _signal) => new Promise<never>(() => undefined),
  );
  assert(timeoutFallback.source === "local", "a hanging AI request should use local planning.");
  assert(
    Date.now() - startedAt < worksheetPlanningTimeoutMs + 500,
    "a hanging AI request should return near the configured timeout.",
  );
  await assertLocalGeneration({ ...timeoutFallback.spec, planningSource: "local" });

  let advancedPlannerCalled = false;
  const advanced = await planWorksheetSpec(
    { ...defaultSpec, prompt: quickPrompt },
    "advanced",
    async () => {
      advancedPlannerCalled = true;
      return { source: "ai", patch: { theme: "Ocean" } };
    },
  );
  assert(!advancedPlannerCalled, "Advanced settings should not spend an AI planning request.");
  assert(advanced.source === "local", "Advanced settings should keep the local normalized specification.");
  assert(
    getWorksheetTelemetry().localGenerations >= 3,
    "every printable still comes from the deterministic local worksheet engine.",
  );
}
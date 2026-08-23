import {
  planWorksheet,
  type WorksheetPlanningInput,
  type WorksheetPlanningPatch,
  type WorksheetPlanningResult,
} from "@workspace/api-client-react";
import {
  defaultSpec,
  type AIWorksheetContent,
  type WorksheetSpec,
} from "./creator-options";
import { applyPromptIntent, canonicalQuickCreateRequest } from "./learning-domains";
import {
  normalizeRendererActivityType,
  normalizeWorksheetSpecForRenderer,
  promptActivityTypeSupportFor,
} from "./worksheet-renderer-support";
import {
  cacheSuccessfulWorksheetPlan,
  getCachedWorksheetPlan,
  recordWorksheetTelemetry,
  worksheetPlanningCacheKey,
  WORKSHEET_PLANNING_CACHE_VERSION,
} from "./worksheet-cost-firewall";
import { GENERATION_ENGINE_VERSION, PLANNER_VERSION } from "./worksheet-service";

const planningFields = [
  "level",
  "duration",
  "pages",
  "approach",
  "skill",
  "activityType",
  "difficulty",
  "theme",
  "language",
] as const;

type PlanningField = (typeof planningFields)[number];
export type PlanningSource = "ai" | "local";
// Keep this slightly above the server-side provider timeout so one allowed AI
// request can complete before the browser falls back. No retry is introduced.
export const worksheetPlanningTimeoutMs = 20_500;
type AIWorksheetPlanningResult = WorksheetPlanningResult & { content?: AIWorksheetContent };
export type WorksheetPlannerTransport = (
  input: WorksheetPlanningInput,
  signal: AbortSignal,
  generationId?: string,
) => Promise<AIWorksheetPlanningResult>;

const remotePlanner: WorksheetPlannerTransport = (input, signal, generationId) =>
  planWorksheet(input, {
    signal,
    headers: {
      "X-Worksheet-Planning-Cache-Version": `${WORKSHEET_PLANNING_CACHE_VERSION}:${GENERATION_ENGINE_VERSION}:${PLANNER_VERSION}`,
      ...(generationId ? { "X-Worksheet-Generation-Id": generationId } : {}),
    },
  }) as Promise<AIWorksheetPlanningResult>;

function isPlanningField(key: string): key is PlanningField {
  return planningFields.includes(key as PlanningField);
}

function lockedFieldsFor(spec: WorksheetSpec, mode: "quick" | "advanced"): PlanningField[] {
  if (mode === "advanced") return [...planningFields];
  const promptFirst = applyPromptIntent(spec);
  // Any fact that the parser pulled from teacher wording is immutable to AI,
  // even if the UI happened to still show a default selection.
  return planningFields.filter(
    (field) => spec[field] !== defaultSpec[field] || promptFirst[field] !== spec[field],
  );
}

function safePatch(
  patch: WorksheetPlanningPatch,
  lockedFields: readonly PlanningField[],
): Partial<Pick<WorksheetSpec, PlanningField>> {
  const locked = new Set(lockedFields);
  const out: Partial<Pick<WorksheetSpec, PlanningField>> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (!isPlanningField(key) || locked.has(key) || typeof value !== "string") continue;
    const text = value.trim();
    if (text && text.length <= 100) {
      out[key] = key === "activityType" ? normalizeRendererActivityType(text) : text;
    }
  }
  return out;
}

function safeContent(value: unknown, pageLimit: number): AIWorksheetContent | undefined {
  if (!value || typeof value !== "object") return undefined;
  const candidate = value as Record<string, unknown>;
  const cleanText = (item: unknown, max: number) =>
    typeof item === "string" && item.trim().length > 0 && item.trim().length <= max
      ? item.trim()
      : undefined;
  const pages = Array.isArray(candidate.pages)
    ? candidate.pages
        .slice(0, pageLimit)
        .flatMap((item) => {
          if (!item || typeof item !== "object") return [];
          const page = item as Record<string, unknown>;
          const number = typeof page.page === "number" ? page.page : Number(page.page);
          if (!Number.isInteger(number) || number < 1 || number > pageLimit) return [];
          const title = cleanText(page.title, 120);
          const instruction = cleanText(page.instruction, 240);
          return title || instruction ? [{ page: number, ...(title ? { title } : {}), ...(instruction ? { instruction } : {}) }] : [];
        })
    : [];
  const teacherNotes = Array.isArray(candidate.teacherNotes)
    ? candidate.teacherNotes
        .slice(0, 4)
        .map((note) => cleanText(note, 240))
        .filter((note): note is string => Boolean(note))
    : [];
  const title = cleanText(candidate.title, 140);
  return title || teacherNotes.length || pages.length
    ? { ...(title ? { title } : {}), ...(teacherNotes.length ? { teacherNotes } : {}), ...(pages.length ? { pages } : {}) }
    : undefined;
}

/**
 * The AI layer is deliberately a best-effort planner. The local intent parser
 * remains the fallback and the local worksheet engine remains the renderer.
 */
export async function planWorksheetSpec(
  spec: WorksheetSpec,
  mode: "quick" | "advanced",
  transport: WorksheetPlannerTransport = remotePlanner,
  generationId?: string,
): Promise<{ spec: WorksheetSpec; source: PlanningSource }> {
  const localSpec = normalizeWorksheetSpecForRenderer(
    mode === "quick" ? canonicalQuickCreateRequest(spec) : applyPromptIntent(spec),
  );
  const prompt = spec.prompt.trim();
  const countContract = localSpec.promptRequirements;
  const namedPromptSupport = promptActivityTypeSupportFor(localSpec);
  const usesDeterministicQuickActivity =
    namedPromptSupport?.status === "supported" &&
    ["Maze", "Matching", "Counting"].includes(namedPromptSupport.activityType);
  const isFullySpecifiedCountContract =
    countContract !== undefined &&
    countContract.countGroups.length > 0 &&
    countContract.requiredGroupCount === countContract.countGroups.length &&
    Boolean(countContract.requiredChoiceCount);
  // Advanced Create already has an explicit teacher-selected planning spec.
  // All planning fields would be locked, so an AI request cannot improve it
  // and would only spend a provider call. Likewise, a fully specified count
  // contract already names every group, quantity, and response requirement;
  // local planning is the authoritative path and avoids mutable AI patches.
  // Maze, Matching, and Counting are fully deterministic Quick activity
  // contracts. Asking the optional planner would cost a provider call while
  // creating a second authority that could only disagree with their renderer.
  if (
    mode === "advanced" ||
    prompt.length < 8 ||
    isFullySpecifiedCountContract ||
    usesDeterministicQuickActivity
  )
    return { spec: localSpec, source: "local" };

  const lockedFields = lockedFieldsFor(spec, mode);
  const request: WorksheetPlanningInput = {
    prompt,
    baseSpec: {
      level: localSpec.level,
      duration: localSpec.duration,
      pages: localSpec.pages,
      approach: localSpec.approach,
      skill: localSpec.skill,
      activityType: localSpec.activityType,
      difficulty: localSpec.difficulty,
      theme: localSpec.theme,
      language: localSpec.language,
    },
    lockedFields,
  };
  const cacheKey = worksheetPlanningCacheKey(request, GENERATION_ENGINE_VERSION, PLANNER_VERSION);
  const cached = getCachedWorksheetPlan(cacheKey, GENERATION_ENGINE_VERSION, PLANNER_VERSION);
  if (cached) {
    recordWorksheetTelemetry("cacheHits");
    const patch = safePatch(cached.patch, lockedFields);
    const content = safeContent(cached.content, Math.max(1, Math.min(Number(localSpec.pages) || 1, 20)));
    if (Object.keys(patch).length > 0 || content) {
      return {
        spec: normalizeWorksheetSpecForRenderer(
          applyPromptIntent({
            ...localSpec,
            ...patch,
            ...(content ? { aiWorksheetContent: content } : {}),
          }),
        ),
        source: "ai",
      };
    }
  }

  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort();
      reject(new Error("AI worksheet planning timed out."));
    }, worksheetPlanningTimeoutMs);
  });
  try {
    recordWorksheetTelemetry("aiCalls");
    const result = await Promise.race([
      transport(request, controller.signal, generationId),
      timeoutPromise,
    ]);
    if (result.source !== "ai") {
      recordWorksheetTelemetry("fallbacks");
      return { spec: localSpec, source: "local" };
    }

    const patch = safePatch(result.patch, lockedFields);
    const content = safeContent(result.content, Math.max(1, Math.min(Number(localSpec.pages) || 1, 20)));
    if (Object.keys(patch).length === 0 && !content) {
      recordWorksheetTelemetry("fallbacks");
      return { spec: localSpec, source: "local" };
    }
    const sanitizedResult: AIWorksheetPlanningResult = {
      source: "ai",
      patch,
      ...(content ? { content } : {}),
    };
    cacheSuccessfulWorksheetPlan(
      cacheKey,
      GENERATION_ENGINE_VERSION,
      PLANNER_VERSION,
      sanitizedResult,
    );
    return {
      spec: normalizeWorksheetSpecForRenderer(
        applyPromptIntent({
          ...localSpec,
          ...patch,
          ...(content ? { aiWorksheetContent: content } : {}),
        }),
      ),
      source: "ai",
    };
  } catch {
    recordWorksheetTelemetry("fallbacks");
    return { spec: localSpec, source: "local" };
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}
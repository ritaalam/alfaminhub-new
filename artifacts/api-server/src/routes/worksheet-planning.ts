import { Router, type IRouter } from "express";
import {
  PlanWorksheetBody,
  type WorksheetPlanningInput,
} from "@workspace/api-zod";
import {
  getWorksheetPlannerTelemetry,
  planWorksheetPatch,
  recordWorksheetPlannerFallback,
  WorksheetPlanningUnavailableError,
} from "../lib/worksheet-planner";

const router: IRouter = Router();
const requestWindowMs = 60_000;
const maxRequestsPerWindow = 8;
const requestCounts = new Map<string, { count: number; startedAt: number }>();
const generationDedupeMs = 2 * 60_000;
const recentGenerationIds = new Map<string, number>();

function hasPlanningCapacity(clientId: string): boolean {
  const now = Date.now();
  const current = requestCounts.get(clientId);
  if (!current || now - current.startedAt >= requestWindowMs) {
    requestCounts.set(clientId, { count: 1, startedAt: now });
    return true;
  }
  if (current.count >= maxRequestsPerWindow) return false;
  current.count += 1;
  return true;
}

function isDuplicateGeneration(clientId: string, generationId: string | undefined): boolean {
  if (!generationId || generationId.length > 120) return false;
  const now = Date.now();
  for (const [key, createdAt] of recentGenerationIds) {
    if (now - createdAt > generationDedupeMs) recentGenerationIds.delete(key);
  }
  const key = `${clientId}:${generationId}`;
  if (recentGenerationIds.has(key)) return true;
  recentGenerationIds.set(key, now);
  return false;
}

router.post("/ai/worksheet-plan", async (req, res): Promise<void> => {
  const parsed = PlanWorksheetBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ issues: parsed.error.issues.length }, "Invalid worksheet planning request");
    res.status(400).json({ error: "Worksheet planning input is invalid." });
    return;
  }

  const clientId = req.ip ?? "unknown";
  if (isDuplicateGeneration(clientId, req.header("x-worksheet-generation-id")?.trim())) {
    // The original request is already responsible for the one permitted AI
    // attempt. This duplicate gets the same safe local path without extra cost.
    recordWorksheetPlannerFallback();
    res.json({ source: "fallback", patch: {} });
    return;
  }

  if (!hasPlanningCapacity(clientId)) {
    req.log.warn("Worksheet planning request rate limited");
    res.status(429).json({ error: "Please wait a moment before planning another worksheet." });
    return;
  }

  try {
    const startedAt = Date.now();
    const result = await planWorksheetPatch(
      parsed.data as WorksheetPlanningInput,
      req.header("x-worksheet-planning-cache-version")?.trim() || "unknown",
    );
    const durationMs = Date.now() - startedAt;
    if (result.source === "fallback") {
      req.log.warn(
        {
          durationMs,
          reason: result.fallbackReason ?? "unknown",
          ...(result.fallbackDiagnostics ? { response: result.fallbackDiagnostics } : {}),
          telemetry: getWorksheetPlannerTelemetry(),
        },
        "Worksheet AI planner returned local fallback",
      );
    } else {
      req.log.info(
        { durationMs, source: result.source, telemetry: getWorksheetPlannerTelemetry() },
        "Worksheet AI planner completed",
      );
    }
    // Content has been server-sanitized by the planner. Do not pass it through
    // the legacy patch-only response schema, which strips structured AI copy.
    const {
      fallbackReason: _fallbackReason,
      fallbackDiagnostics: _fallbackDiagnostics,
      ...clientResult
    } = result;
    res.json(clientResult);
  } catch (error) {
    // Provider errors are converted into the same safe local path in the
    // response, so count them even though planWorksheetPatch had to throw.
    const telemetry = getWorksheetPlannerTelemetry();
    req.log.warn(
      {
        error: error instanceof Error ? error.name : "unknown",
        ...(error instanceof WorksheetPlanningUnavailableError
          ? { providerError: error.providerError }
          : {}),
        telemetry,
      },
      "Worksheet AI planning unavailable; using local planner",
    );
    res.json({ source: "fallback", patch: {} });
  }
});

export default router;
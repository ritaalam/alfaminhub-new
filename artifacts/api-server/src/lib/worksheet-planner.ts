import type {
  WorksheetPlanningInput,
  WorksheetPlanningPatch,
} from "@workspace/api-zod";
import { getOpenAIClient, getWorksheetModel } from "./openai-client";

const plannerCooldownMs = 30_000;
let plannerCooldownUntil = 0;
const successfulPlanCacheTtlMs = 24 * 60 * 60 * 1000;
const successfulPlanCacheMaxEntries = 128;
// Bump this whenever planner instructions or server-side sanitization change.
// Client engine/planner versions are included separately in every cache key.
const serverPlannerCacheVersion = "worksheet-planner-server-cache-v1";
const successfulPlanCache = new Map<string, { storedAt: number; result: WorksheetPlannerResult }>();
export type WorksheetPlannerFallbackReason =
  | "cooldown"
  | "provider-unavailable"
  | "invalid-response";

type WorksheetPlannerResponseDiagnostics = {
  finishReason: string;
  contentLength: number;
  hasRefusal: boolean;
};

export type WorksheetPlannerProviderError = {
  name: string;
  status?: number;
  code?: string;
  type?: string;
};

export class WorksheetPlanningUnavailableError extends Error {
  readonly providerError: WorksheetPlannerProviderError;

  constructor(error: unknown) {
    super("AI worksheet planning unavailable.");
    this.name = "WorksheetPlanningUnavailableError";
    const candidate =
      error && typeof error === "object" ? (error as Record<string, unknown>) : {};
    this.providerError = {
      name: typeof candidate.name === "string" ? candidate.name : "unknown",
      ...(typeof candidate.status === "number" ? { status: candidate.status } : {}),
      ...(typeof candidate.code === "string" ? { code: candidate.code } : {}),
      ...(typeof candidate.type === "string" ? { type: candidate.type } : {}),
    };
  }
}

const patchFields = [
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

type PlanningField = (typeof patchFields)[number];

const allowedValues: Partial<Record<PlanningField, readonly string[]>> = {
  level: [
    "Ages 2–3",
    "Ages 3–4",
    "Ages 4–5",
    "Preschool",
    "Pre-K",
    "Kindergarten",
    "Grade 1",
    "Grade 2",
    "Grade 3",
    "Grade 4",
    "Grade 5",
    "Grade 6",
  ],
  duration: [
    "5 minutes",
    "10 minutes",
    "15 minutes",
    "20 minutes",
    "30 minutes",
    "45 minutes",
    "60 minutes",
  ],
  pages: Array.from({ length: 20 }, (_, index) => String(index + 1)),
  approach: [
    "Montessori",
    "Reggio Emilia",
    "Waldorf-inspired",
    "Traditional Classroom",
    "Play-Based Learning",
    "Inquiry-Based Learning",
    "STEM",
    "Sensory Learning",
    "Project-Based Learning",
  ],
  activityType: [
    "Tracing",
    "Matching",
    "Cut & Paste",
    "I Spy",
    "Flashcards",
    "Sequencing",
    "Worksheet",
  ],
  difficulty: ["Very Easy", "Easy", "Standard", "Challenge", "Mixed/Differentiated"],
  language: ["English", "French", "Arabic", "English/French bilingual", "English/Arabic bilingual"],
};

const safeTextFields = new Set<PlanningField>(["skill", "theme"]);

function parseJsonObject(value: string | null | undefined): Record<string, unknown> | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function sanitizePatch(
  candidate: Record<string, unknown>,
  lockedFields: readonly PlanningField[],
): WorksheetPlanningPatch {
  const locked = new Set(lockedFields);
  const patch: WorksheetPlanningPatch = {};

  for (const field of patchFields) {
    if (locked.has(field)) continue;
    const value = candidate[field];
    if (typeof value !== "string") continue;
    const text = value.trim();
    if (!text || text.length > 100) continue;

    const choices = allowedValues[field];
    if (choices && !choices.includes(text)) continue;
    if (!choices && !safeTextFields.has(field)) continue;
    patch[field] = text;
  }

  return patch;
}

function plannerInstructions(input: WorksheetPlanningInput): string {
  return [
    "You are an expert early-years and elementary worksheet planner. Return JSON only.",
    'Use exactly this envelope: {"patch":{"level?":"","duration?":"","pages?":"","approach?":"","skill?":"","activityType?":"","difficulty?":"","theme?":"","language?":""},"content":{"title":"","teacherNotes":[""],"pages":[{"page":1,"title":"","instruction":""}]}}.',
    "Write concise, child-facing page titles and one instruction per page in the requested language.",
    "Content must honor the exact activity, objects, theme, skill, level, difficulty, quantities, layout, print constraints, and special instructions from the teacher prompt. Keep teacher object names intact even when an exact illustration may not exist; the local renderer will select the closest safe visual representation.",
    "Do not return HTML, Markdown, image prompts, answer keys, object lists, arbitrary layouts, or executable content. The Alfa renderer supplies all activities and answers safely.",
    "Honor every locked field exactly: do not include it in patch.",
    "Use only the listed option values for level, duration, pages, approach, activityType, difficulty, and language. For activityType, use only renderer-ready choices: Tracing, Matching, Cut & Paste, I Spy, Flashcards, Sequencing, or Worksheet. Never choose Sorting, Maze, Bingo, Coloring, Puzzle, Mini Book, Scissor Skills, Find the Difference, or Connect the Dots.",
    "For skill and theme, use a short plain label (100 characters or less).",
    "Return content for every requested page (at most 20). If an activity would not render, use the closest renderer-ready interaction while preserving theme, age/grade, objective, quantities, language, and instructions as closely as possible.",
    `Teacher prompt: ${JSON.stringify(input.prompt)}`,
    `Base specification: ${JSON.stringify(input.baseSpec)}`,
    `Locked fields: ${JSON.stringify(input.lockedFields)}`,
  ].join("\n");
}

type AIWorksheetContent = {
  title?: string;
  teacherNotes?: string[];
  pages?: Array<{ page: number; title?: string; instruction?: string }>;
};

export type WorksheetPlannerResult = {
  source: "ai" | "fallback";
  patch: WorksheetPlanningPatch;
  content?: AIWorksheetContent;
  /** Internal telemetry only; the route intentionally omits it from the client response. */
  fallbackReason?: WorksheetPlannerFallbackReason;
  fallbackDiagnostics?: WorksheetPlannerResponseDiagnostics;
};

export type WorksheetPlannerTelemetry = {
  aiCalls: number;
  cacheHits: number;
  fallbacks: number;
};

const telemetry: WorksheetPlannerTelemetry = {
  aiCalls: 0,
  cacheHits: 0,
  fallbacks: 0,
};

export function getWorksheetPlannerTelemetry(): WorksheetPlannerTelemetry {
  return { ...telemetry };
}

export function recordWorksheetPlannerFallback(): void {
  telemetry.fallbacks += 1;
}

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value as Record<string, unknown>)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableSerialize((value as Record<string, unknown>)[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function hashForCache(value: string): string {
  let hash = 14695981039346656037n;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= BigInt(value.charCodeAt(index));
    hash = BigInt.asUintN(64, hash * 1099511628211n);
  }
  return hash.toString(16).padStart(16, "0");
}

function planningCacheKey(input: WorksheetPlanningInput, clientCacheVersion: string): string {
  return hashForCache(
    stableSerialize({
      cacheVersion: serverPlannerCacheVersion,
      clientCacheVersion,
      model: getWorksheetModel(),
      input: {
        prompt: input.prompt.trim().replace(/\s+/g, " "),
        baseSpec: input.baseSpec,
        lockedFields: [...input.lockedFields].sort(),
      },
    }),
  );
}

function trimSuccessfulPlanCache(now: number): void {
  for (const [key, entry] of successfulPlanCache) {
    if (now - entry.storedAt > successfulPlanCacheTtlMs) successfulPlanCache.delete(key);
  }
  while (successfulPlanCache.size > successfulPlanCacheMaxEntries) {
    const oldestKey = successfulPlanCache.keys().next().value;
    if (typeof oldestKey !== "string") break;
    successfulPlanCache.delete(oldestKey);
  }
}

function cachedSuccessfulPlan(
  key: string,
  now: number,
): WorksheetPlannerResult | undefined {
  trimSuccessfulPlanCache(now);
  const entry = successfulPlanCache.get(key);
  if (!entry) return undefined;
  successfulPlanCache.delete(key);
  successfulPlanCache.set(key, entry);
  telemetry.cacheHits += 1;
  return entry.result;
}

function cacheSuccessfulPlan(key: string, result: WorksheetPlannerResult, now: number): void {
  if (result.source !== "ai") return;
  successfulPlanCache.delete(key);
  successfulPlanCache.set(key, { storedAt: now, result });
  trimSuccessfulPlanCache(now);
}

function fallback(
  reason: WorksheetPlannerFallbackReason,
  fallbackDiagnostics?: WorksheetPlannerResponseDiagnostics,
): WorksheetPlannerResult {
  recordWorksheetPlannerFallback();
  return { source: "fallback", patch: {}, fallbackReason: reason, ...(fallbackDiagnostics ? { fallbackDiagnostics } : {}) };
}

function cleanText(value: unknown, max: number): string | undefined {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= max
    ? value.trim()
    : undefined;
}

function sanitizeContent(value: unknown, pageLimit: number): AIWorksheetContent | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const candidate = value as Record<string, unknown>;
  const teacherNotes = Array.isArray(candidate.teacherNotes)
    ? candidate.teacherNotes
        .slice(0, 4)
        .map((note) => cleanText(note, 240))
        .filter((note): note is string => Boolean(note))
    : [];
  const pages = Array.isArray(candidate.pages)
    ? candidate.pages
        .slice(0, pageLimit)
        .flatMap((entry) => {
          if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
          const page = entry as Record<string, unknown>;
          const number = typeof page.page === "number" ? page.page : Number(page.page);
          if (!Number.isInteger(number) || number < 1 || number > pageLimit) return [];
          const title = cleanText(page.title, 120);
          const instruction = cleanText(page.instruction, 240);
          return title || instruction
            ? [{ page: number, ...(title ? { title } : {}), ...(instruction ? { instruction } : {}) }]
            : [];
        })
    : [];
  const title = cleanText(candidate.title, 140);
  return title || teacherNotes.length || pages.length
    ? {
        ...(title ? { title } : {}),
        ...(teacherNotes.length ? { teacherNotes } : {}),
        ...(pages.length ? { pages } : {}),
      }
    : undefined;
}

export async function planWorksheetPatch(
  input: WorksheetPlanningInput,
  clientCacheVersion = "unknown",
): Promise<WorksheetPlannerResult> {
  const cacheKey = planningCacheKey(input, clientCacheVersion);
  const cached = cachedSuccessfulPlan(cacheKey, Date.now());
  if (cached) return cached;

  if (Date.now() < plannerCooldownUntil) {
    return fallback("cooldown");
  }

  const openai = getOpenAIClient();
  if (!openai) return fallback("provider-unavailable");

  try {
    telemetry.aiCalls += 1;
    const response = await openai.chat.completions.create({
      model: getWorksheetModel(),
      // The model returns only a compact spec patch plus brief teaching copy;
      // page mechanics, answers, and printable content stay local.
      // GPT-5 models count internal reasoning against this budget. Worksheet
      // planning needs no chain-of-thought, so favor immediate JSON and retain
      // enough room for a two-page teaching-copy envelope.
      reasoning_effort: "minimal",
      max_completion_tokens: 2_400,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Create concise, safe worksheet plans and teaching copy. Never expose private information or generate HTML.",
        },
        { role: "user", content: plannerInstructions(input) },
      ],
    });

    const choice = response.choices[0];
    const contentValue = choice?.message.content;
    const responseDiagnostics: WorksheetPlannerResponseDiagnostics = {
      finishReason: choice?.finish_reason ?? "missing",
      contentLength: typeof contentValue === "string" ? contentValue.length : 0,
      hasRefusal: Boolean((choice?.message as { refusal?: unknown } | undefined)?.refusal),
    };
    const parsed = parseJsonObject(contentValue);
    if (!parsed) return fallback("invalid-response", responseDiagnostics);
    const pageLimit = Math.max(1, Math.min(Number(input.baseSpec.pages) || 1, 20));
    const content = sanitizeContent(parsed.content, pageLimit);
    const rawPatch =
      parsed.patch === undefined || parsed.patch === null
        ? {}
        : parseJsonObject(
            typeof parsed.patch === "string" ? parsed.patch : JSON.stringify(parsed.patch),
          );
    // The renderer and answer key are local by design. A model response that
    // only supplies safe teacher copy is still a successful AI plan; only an
    // envelope with neither usable plan data nor usable copy is a fallback.
    if (!rawPatch && !content) return fallback("invalid-response", responseDiagnostics);

    const patch = sanitizePatch(rawPatch ?? {}, input.lockedFields as PlanningField[]);
    if (Object.keys(patch).length === 0 && !content) {
      return fallback("invalid-response", responseDiagnostics);
    }
    const result: WorksheetPlannerResult = {
      source: "ai",
      patch,
      ...(content ? { content } : {}),
    };
    cacheSuccessfulPlan(cacheKey, result, Date.now());
    return result;
  } catch (error) {
    // Do not make every teacher retry the same slow provider. The local
    // generator remains available immediately while the short cooldown runs.
    plannerCooldownUntil = Date.now() + plannerCooldownMs;
    telemetry.fallbacks += 1;
    throw new WorksheetPlanningUnavailableError(error);
  }
}
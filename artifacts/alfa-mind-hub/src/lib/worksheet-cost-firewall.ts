import type {
  WorksheetPlanningInput,
  WorksheetPlanningResult,
} from "@workspace/api-client-react";

export const WORKSHEET_PLANNING_CACHE_VERSION = "worksheet-planning-cache-v1";
const CACHE_STORAGE_KEY = "alfa:worksheet-planning-cache";
const TELEMETRY_STORAGE_KEY = "alfa:worksheet-planning-telemetry-v1";
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 32;

export type WorksheetPlanningCacheResult = WorksheetPlanningResult & {
  content?: WorksheetPlanningResult["content"];
};

export type WorksheetTelemetry = {
  aiCalls: number;
  cacheHits: number;
  fallbacks: number;
  localGenerations: number;
};

type CacheEntry = {
  key: string;
  storedAt: number;
  engineVersion: string;
  plannerVersion: string;
  result: WorksheetPlanningCacheResult;
};

const memoryCache = new Map<string, CacheEntry>();
let cacheHydrated = false;
let telemetryHydrated = false;
let telemetry: WorksheetTelemetry = {
  aiCalls: 0,
  cacheHits: 0,
  fallbacks: 0,
  localGenerations: 0,
};

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

function normalizePrompt(prompt: string): string {
  return prompt.trim().replace(/\s+/g, " ");
}

export function worksheetPlanningCacheKey(
  input: WorksheetPlanningInput,
  engineVersion: string,
  plannerVersion: string,
): string {
  const canonicalInput = {
    prompt: normalizePrompt(input.prompt),
    baseSpec: input.baseSpec,
    lockedFields: [...input.lockedFields].sort(),
  };
  return hashForCache(
    stableSerialize({
      cacheVersion: WORKSHEET_PLANNING_CACHE_VERSION,
      engineVersion,
      plannerVersion,
      input: canonicalInput,
    }),
  );
}

function isCacheResult(value: unknown): value is WorksheetPlanningCacheResult {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return candidate.source === "ai" && Boolean(candidate.patch && typeof candidate.patch === "object");
}

function trimCache(now: number): void {
  for (const [key, entry] of memoryCache) {
    if (now - entry.storedAt > CACHE_TTL_MS) memoryCache.delete(key);
  }
  while (memoryCache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = memoryCache.keys().next().value;
    if (typeof oldestKey !== "string") break;
    memoryCache.delete(oldestKey);
  }
}

function persistCache(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify([...memoryCache.values()]));
  } catch {
    // Storage is an optimization only; local generation remains authoritative.
  }
}

function hydrateCache(now: number): void {
  if (cacheHydrated) return;
  cacheHydrated = true;
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(CACHE_STORAGE_KEY);
    const entries: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(entries)) return;
    for (const entry of entries) {
      if (!entry || typeof entry !== "object") continue;
      const candidate = entry as Partial<CacheEntry>;
      if (
        typeof candidate.key !== "string" ||
        typeof candidate.storedAt !== "number" ||
        typeof candidate.engineVersion !== "string" ||
        typeof candidate.plannerVersion !== "string" ||
        !isCacheResult(candidate.result)
      )
        continue;
      if (now - candidate.storedAt <= CACHE_TTL_MS) memoryCache.set(candidate.key, candidate as CacheEntry);
    }
    trimCache(now);
  } catch {
    window.localStorage.removeItem(CACHE_STORAGE_KEY);
  }
}

export function getCachedWorksheetPlan(
  key: string,
  engineVersion: string,
  plannerVersion: string,
): WorksheetPlanningCacheResult | null {
  const now = Date.now();
  hydrateCache(now);
  const entry = memoryCache.get(key);
  if (
    !entry ||
    entry.engineVersion !== engineVersion ||
    entry.plannerVersion !== plannerVersion ||
    now - entry.storedAt > CACHE_TTL_MS
  ) {
    if (entry) memoryCache.delete(key);
    return null;
  }
  memoryCache.delete(key);
  memoryCache.set(key, entry);
  return entry.result;
}

export function cacheSuccessfulWorksheetPlan(
  key: string,
  engineVersion: string,
  plannerVersion: string,
  result: WorksheetPlanningCacheResult,
): void {
  if (result.source !== "ai") return;
  const now = Date.now();
  hydrateCache(now);
  memoryCache.delete(key);
  memoryCache.set(key, { key, storedAt: now, engineVersion, plannerVersion, result });
  trimCache(now);
  persistCache();
}

export function clearWorksheetPlanningCache(): void {
  memoryCache.clear();
  cacheHydrated = true;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(CACHE_STORAGE_KEY);
    } catch {
      // Ignore unavailable browser storage in tests and private browsing modes.
    }
  }
}

function hydrateTelemetry(): void {
  if (telemetryHydrated) return;
  telemetryHydrated = true;
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(TELEMETRY_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== "object") return;
    const candidate = parsed as Partial<WorksheetTelemetry>;
    telemetry = {
      aiCalls: Number.isFinite(candidate.aiCalls) ? Math.max(0, Number(candidate.aiCalls)) : 0,
      cacheHits: Number.isFinite(candidate.cacheHits) ? Math.max(0, Number(candidate.cacheHits)) : 0,
      fallbacks: Number.isFinite(candidate.fallbacks) ? Math.max(0, Number(candidate.fallbacks)) : 0,
      localGenerations: Number.isFinite(candidate.localGenerations)
        ? Math.max(0, Number(candidate.localGenerations))
        : 0,
    };
  } catch {
    window.localStorage.removeItem(TELEMETRY_STORAGE_KEY);
  }
}

export function recordWorksheetTelemetry(event: keyof WorksheetTelemetry): void {
  hydrateTelemetry();
  telemetry[event] += 1;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(TELEMETRY_STORAGE_KEY, JSON.stringify(telemetry));
    } catch {
      // Counters still remain available in memory for this session.
    }
  }
}

export function getWorksheetTelemetry(): WorksheetTelemetry {
  hydrateTelemetry();
  return { ...telemetry };
}

export function resetWorksheetTelemetry(): void {
  telemetry = { aiCalls: 0, cacheHits: 0, fallbacks: 0, localGenerations: 0 };
  telemetryHydrated = true;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(TELEMETRY_STORAGE_KEY);
    } catch {
      // Ignore unavailable browser storage in tests and private browsing modes.
    }
  }
}
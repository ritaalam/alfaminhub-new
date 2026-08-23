/**
 * Provider-neutral external illustration lookup.
 *
 * This module is intentionally dormant until an operator adds ICONS8_API_KEY
 * through workspace secrets. It stores only result metadata and remote URLs;
 * binaries are never written to Postgres or the filesystem.
 */
export type IllustrationLookup = {
  query: string;
  cacheKey?: string;
  limit?: number;
};

export type LicensedIllustrationMetadata = {
  id: string;
  provider: "icons8";
  label: string;
  previewUrl: string;
  sourceUrl?: string;
  /**
   * A remote provider result is never auto-inserted into a worksheet until its
   * current plan/attribution requirements have been reviewed by the product.
   */
  licensing: "review-required";
};

export type IllustrationLookupResult = {
  source: "disabled" | "cache" | "provider" | "unavailable";
  cacheKey: string;
  results: LicensedIllustrationMetadata[];
  retryAfterMs?: number;
};

export interface IllustrationProvider {
  readonly id: string;
  isConfigured(): boolean;
  search(input: IllustrationLookup): Promise<LicensedIllustrationMetadata[]>;
}

const cacheTtlMs = 24 * 60 * 60 * 1000;
const maxCacheEntries = 120;
const cache = new Map<string, { expiresAt: number; results: LicensedIllustrationMetadata[] }>();

function normalizedQuery(value: string) {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, " ").slice(0, 160);
}

function cacheKeyFor(input: IllustrationLookup) {
  return input.cacheKey?.trim().slice(0, 180) || `icons8:${normalizedQuery(input.query)}`;
}

function boundedLimit(value: number | undefined) {
  return Math.max(1, Math.min(8, Math.floor(value ?? 6)));
}

function safeHttpsUrl(value: unknown) {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function previewUrlFor(value: Record<string, unknown>) {
  const images = Array.isArray(value.images) ? value.images : [];
  const thumbnails = Array.isArray(value.thumbnails) ? value.thumbnails : [];
  const candidates = [
    value.previewUrl,
    value.thumbnailUrl,
    value.url,
    ...images.map((image) => (image && typeof image === "object" ? (image as Record<string, unknown>).url : undefined)),
    ...thumbnails.map((image) =>
      image && typeof image === "object" ? (image as Record<string, unknown>).url : undefined,
    ),
  ];
  return candidates.map(safeHttpsUrl).find(Boolean);
}

class Icons8IllustrationProvider implements IllustrationProvider {
  readonly id = "icons8";

  isConfigured() {
    return Boolean(process.env.ICONS8_API_KEY?.trim());
  }

  async search(input: IllustrationLookup) {
    const token = process.env.ICONS8_API_KEY?.trim();
    if (!token) return [];

    const url = new URL("https://api-illustrations.icons8.com/api/v2/illustrations/search");
    url.searchParams.set("query", normalizedQuery(input.query));
    url.searchParams.set("type", "illustration");
    url.searchParams.set("limit", String(boundedLimit(input.limit)));

    const response = await fetch(url, {
      headers: { "Api-Key": token, Accept: "application/json" },
      signal: AbortSignal.timeout(7_000),
    });
    if (!response.ok) throw new Error(`Icons8 illustration lookup failed (${response.status})`);

    const body: unknown = await response.json();
    const items =
      body && typeof body === "object" && Array.isArray((body as { illustrations?: unknown }).illustrations)
        ? (body as { illustrations: unknown[] }).illustrations
        : [];

    return items
      .map((item): LicensedIllustrationMetadata | undefined => {
        if (!item || typeof item !== "object") return undefined;
        const record = item as Record<string, unknown>;
        const id = typeof record.id === "string" || typeof record.id === "number" ? String(record.id) : "";
        const previewUrl = previewUrlFor(record);
        if (!id || !previewUrl) return undefined;
        return {
          id,
          provider: "icons8",
          label: typeof record.name === "string" ? record.name : normalizedQuery(input.query),
          previewUrl,
          sourceUrl: safeHttpsUrl(record.url),
          licensing: "review-required",
        };
      })
      .filter((item): item is LicensedIllustrationMetadata => Boolean(item));
  }
}

const icons8Provider = new Icons8IllustrationProvider();

/**
 * Performs one cost-controlled provider lookup. Callers should only use this
 * after local Alfa assets cannot express the requested visual value.
 */
export async function lookupExternalIllustrations(input: IllustrationLookup): Promise<IllustrationLookupResult> {
  const query = normalizedQuery(input.query);
  const key = cacheKeyFor({ ...input, query });
  if (!query || !icons8Provider.isConfigured()) return { source: "disabled", cacheKey: key, results: [] };

  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return { source: "cache", cacheKey: key, results: cached.results };
  }

  try {
    const results = await icons8Provider.search({ ...input, query });
    if (cache.size >= maxCacheEntries) {
      const oldest = cache.keys().next().value;
      if (oldest) cache.delete(oldest);
    }
    cache.set(key, { expiresAt: Date.now() + cacheTtlMs, results });
    return { source: "provider", cacheKey: key, results };
  } catch {
    return { source: "unavailable", cacheKey: key, results: [], retryAfterMs: 5 * 60 * 1000 };
  }
}

/** Visible to unit tests without exposing cache internals through HTTP. */
export function clearIllustrationLookupCache() {
  cache.clear();
}
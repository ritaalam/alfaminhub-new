/**
 * Cloud persistence for the teacher workspace.
 *
 * The workspace store speaks a small synchronous `WorkspaceStorage` interface.
 * This adapter keeps an in-memory copy of the signed-in teacher's workspace
 * (hydrated once at sign-in) and pushes every change to Lovable Cloud in the
 * background, so all existing pages keep working untouched while their data
 * now lives in the teacher's private cloud account.
 *
 * Everything the workspace holds travels with it: worksheets and their pages,
 * saved projects, favourites, folders/collections, saved ideas, the weekly
 * plan, class profiles, project metadata and generated-PDF references.
 */

import type { WorkspaceStorage } from "./storage";
import { emptyWorkspace, emptyWeek, weekDays, type WorkspaceState } from "./types";

export type CloudSyncStatus = "idle" | "saving" | "saved" | "error";

let status: CloudSyncStatus = "idle";
let statusMessage: string | null = null;
let lastSavedAt: number | null = null;
const statusListeners = new Set<() => void>();

/** cached snapshot — useSyncExternalStore requires a stable object identity */
let snapshot: {
  status: CloudSyncStatus;
  statusMessage: string | null;
  lastSavedAt: number | null;
} = { status, statusMessage, lastSavedAt };

function setStatus(next: CloudSyncStatus, message: string | null = null) {
  status = next;
  statusMessage = message;
  if (next === "saved") lastSavedAt = Date.now();
  snapshot = { status, statusMessage, lastSavedAt };
  for (const l of statusListeners) l();
}

export function subscribeCloudStatus(listener: () => void) {
  statusListeners.add(listener);
  return () => statusListeners.delete(listener);
}

export function getCloudStatus() {
  return snapshot;
}

export function resetCloudStatus() {
  status = "idle";
  statusMessage = null;
  lastSavedAt = null;
  snapshot = { status, statusMessage, lastSavedAt };
  for (const l of statusListeners) l();
}

/** Older/partial cloud rows are upgraded in memory — never rewritten blindly. */
export function normalizeState(raw: unknown): WorkspaceState {
  const parsed = (raw ?? null) as Partial<WorkspaceState> | null;
  if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.drafts)) {
    return emptyWorkspace;
  }
  const weekly = { ...emptyWeek };
  for (const day of weekDays) weekly[day] = parsed.weekly?.[day] ?? [];
  return {
    ...emptyWorkspace,
    ...parsed,
    version: 1,
    drafts: parsed.drafts ?? [],
    folders: parsed.folders ?? [],
    collections: parsed.collections ?? [],
    classes: parsed.classes ?? [],
    ideas: parsed.ideas ?? [],
    weekly,
  };
}

/** Reads (and creates on first sign-in) the teacher's cloud workspace row. */
export async function fetchCloudWorkspace(userId: string): Promise<WorkspaceState> {
  void userId;
  const response = await fetch("/api/workspace", { credentials: "include" });
  if (!response.ok) throw new Error("Could not load your cloud workspace.");
  const data = (await response.json()) as { state?: unknown };
  return data.state ? normalizeState(data.state) : emptyWorkspace;
}

export async function pushCloudWorkspace(userId: string, state: WorkspaceState) {
  void userId;
  const response = await fetch("/api/workspace", {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state }),
  });
  if (!response.ok) throw new Error("Could not save your cloud workspace.");
}

/** Keeps a rolling history so earlier versions of a workspace are recoverable. */
async function writeRevision(userId: string, state: WorkspaceState) {
  void userId;
  const response = await fetch("/api/workspace/revisions", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state }),
  });
  if (!response.ok) throw new Error("Could not save a workspace revision.");
}

const REVISION_INTERVAL_MS = 5 * 60 * 1000;

export function createCloudWorkspaceStorage(
  userId: string,
  initial: WorkspaceState,
): WorkspaceStorage {
  let cache = initial;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastRevisionAt = 0;

  const flush = async () => {
    const snapshot = cache;
    try {
      await pushCloudWorkspace(userId, snapshot);
      setStatus("saved");
      if (Date.now() - lastRevisionAt > REVISION_INTERVAL_MS) {
        lastRevisionAt = Date.now();
        void writeRevision(userId, snapshot).catch(() => {});
      }
    } catch (err) {
      setStatus("error", err instanceof Error ? err.message : "Could not save to your account.");
    }
  };

  return {
    read: () => cache,
    write(state) {
      cache = state;
      setStatus("saving");
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void flush(), 500);
    },
    subscribeExternal(onChange) {
      // another device may have written while this tab was in the background
      if (typeof window === "undefined") return () => {};
      const refresh = async () => {
        try {
          const fresh = await fetchCloudWorkspace(userId);
          if (JSON.stringify(fresh) === JSON.stringify(cache)) return;
          cache = fresh;
          onChange();
        } catch {
          /* stay on the last known good copy */
        }
      };
      const onFocus = () => void refresh();
      const onVisible = () => {
        if (document.visibilityState === "visible") void refresh();
      };
      window.addEventListener("focus", onFocus);
      document.addEventListener("visibilitychange", onVisible);
      return () => {
        window.removeEventListener("focus", onFocus);
        document.removeEventListener("visibilitychange", onVisible);
      };
    },
  };
}

/** Merges a browser-only workspace into the cloud one without losing either side. */
export function mergeWorkspaces(cloud: WorkspaceState, local: WorkspaceState): WorkspaceState {
  const byId = <T extends { id: string }>(a: T[], b: T[]) => {
    const seen = new Set(a.map((x) => x.id));
    return [...a, ...b.filter((x) => !seen.has(x.id))];
  };
  const weekly = { ...emptyWeek };
  for (const day of weekDays) {
    weekly[day] = byId(cloud.weekly[day] ?? [], local.weekly[day] ?? []);
  }
  return {
    version: 1,
    drafts: byId(cloud.drafts, local.drafts),
    folders: byId(cloud.folders, local.folders),
    collections: byId(cloud.collections, local.collections),
    classes: byId(cloud.classes, local.classes),
    ideas: byId(cloud.ideas, local.ideas),
    weekly,
  };
}

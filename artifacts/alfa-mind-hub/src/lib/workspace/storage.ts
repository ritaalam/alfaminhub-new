/**
 * Storage abstraction for the workspace.
 *
 * Today: browser localStorage (safest persistent option in this project, no
 * accounts required). Later: swap in a cloud adapter (same interface) without
 * changing a single component.
 *
 * `write` MUST throw when the state could not be persisted — the UI only shows
 * "Saved" after a successful, verified write.
 */

import { emptyWeek, emptyWorkspace, weekDays, type WorkspaceState } from "./types";

export interface WorkspaceStorage {
  read(): WorkspaceState;
  /** persists the state; throws when persistence failed */
  write(state: WorkspaceState): void;
  /** notifies when the same store was changed elsewhere (other tab/window) */
  subscribeExternal?(onChange: () => void): () => void;
}

export const WORKSPACE_STORAGE_KEY = "alfa.workspace.v1";

/**
 * Forward-compatible read: older saved workspaces (without ideas / weekly plan)
 * are upgraded in memory. Existing drafts are never dropped or rewritten.
 */
function normalize(parsed: WorkspaceState | null): WorkspaceState {
  if (!parsed || parsed.version !== 1) return emptyWorkspace;
  const weekly = { ...emptyWeek };
  for (const day of weekDays) weekly[day] = parsed.weekly?.[day] ?? [];
  return {
    ...emptyWorkspace,
    ...parsed,
    drafts: parsed.drafts ?? [],
    folders: parsed.folders ?? [],
    collections: parsed.collections ?? [],
    classes: parsed.classes ?? [],
    ideas: parsed.ideas ?? [],
    weekly,
  };
}

export const localWorkspaceStorage: WorkspaceStorage = {
  read() {
    if (typeof window === "undefined") return emptyWorkspace;
    try {
      const raw = window.localStorage.getItem(WORKSPACE_STORAGE_KEY);
      if (!raw) return emptyWorkspace;
      return normalize(JSON.parse(raw) as WorkspaceState);
    } catch {
      return emptyWorkspace;
    }
  },
  write(state) {
    if (typeof window === "undefined") {
      throw new Error("Workspace storage is unavailable on the server.");
    }
    const payload = JSON.stringify(state);
    window.localStorage.setItem(WORKSPACE_STORAGE_KEY, payload);
    // verify: quota / private mode can silently drop the value
    const readBack = window.localStorage.getItem(WORKSPACE_STORAGE_KEY);
    if (readBack !== payload) {
      throw new Error("Workspace could not be saved (storage rejected the write).");
    }
  },
  subscribeExternal(onChange) {
    if (typeof window === "undefined") return () => {};
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === WORKSPACE_STORAGE_KEY) onChange();
    };
    const onFocus = () => onChange();
    const onVisible = () => {
      if (document.visibilityState === "visible") onChange();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  },
};

/** In-memory adapter (SSR + tests). */
export function memoryWorkspaceStorage(initial = emptyWorkspace): WorkspaceStorage {
  let state = initial;
  return {
    read: () => state,
    write: (next) => {
      state = next;
    },
  };
}

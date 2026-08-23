/**
 * Workspace store — tiny observable state on top of the storage adapter.
 *
 * Keeping mutation logic here (rather than in components) means cloud
 * persistence, teacher accounts and version history can be introduced later by
 * changing this file and the storage adapter only.
 */

import { useSyncExternalStore } from "react";
import type { WorksheetSpec } from "@/lib/creator-options";
import type { WorksheetProject } from "@/lib/worksheet-model";
import { localWorkspaceStorage, type WorkspaceStorage } from "./storage";
import {
  emptyWorkspace,
  uid,
  type ClassProfile,
  type Collection,
  type Folder,
  type SavedIdea,
  type WeekDay,
  type WorkspaceState,
  type WorksheetDraft,
} from "./types";
import type { IdeaSpec } from "@/lib/ideas/engine";

let storage: WorkspaceStorage = localWorkspaceStorage;
let state: WorkspaceState = emptyWorkspace;
let hydrated = false;
let externalUnsubscribe: (() => void) | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

/**
 * Persists first and only then commits to memory, so a failed write never
 * leaves the UI claiming a save that did not happen. Throws on failure.
 */
function setState(next: WorkspaceState) {
  storage.write(next);
  state = next;
  emit();
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  state = storage.read();
  // keep every open view (other tabs/windows, background preview frames) on the
  // exact same persisted store
  externalUnsubscribe ??=
    storage.subscribeExternal?.(() => {
      const fresh = storage.read();
      if (JSON.stringify(fresh) === JSON.stringify(state)) return;
      state = fresh;
      emit();
    }) ?? null;
}

/** Re-reads the persisted store before mutating so views never clobber each other. */
function beginMutation() {
  hydrate();
  if (typeof window !== "undefined") state = storage.read();
}

/** Force a re-read of the persisted store (used after external changes). */
export function refreshWorkspace() {
  if (typeof window === "undefined") return;
  hydrated = true;
  state = storage.read();
  emit();
}

/** Swap the persistence adapter (e.g. cloud) — UI stays untouched. */
export function configureWorkspaceStorage(next: WorkspaceStorage) {
  externalUnsubscribe?.();
  externalUnsubscribe = null;
  storage = next;
  hydrated = false;
  hydrate();
  emit();
}

function subscribe(listener: () => void) {
  hydrate();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useWorkspace(): WorkspaceState {
  return useSyncExternalStore(
    subscribe,
    () => {
      hydrate();
      return state;
    },
    () => emptyWorkspace,
  );
}

export function getWorkspace(): WorkspaceState {
  hydrate();
  return state;
}

/* ---------------------------------------------------------------- drafts */

/**
 * Saves (creates or updates) a worksheet project.
 *
 * The draft id is stable: passing an existing id UPDATES that project in place
 * instead of creating a duplicate. Throws when persistence fails.
 */
export function saveDraft(input: {
  id?: string | null;
  title?: string;
  spec: WorksheetSpec;
  project: WorksheetProject;
  classId?: string | null;
  folderId?: string | null;
  ideaId?: string | null;
  studio?: WorksheetDraft["studio"];
}): WorksheetDraft {
  beginMutation();
  const now = Date.now();
  const existing = input.id ? state.drafts.find((d) => d.id === input.id) : undefined;

  const draft: WorksheetDraft = existing
    ? {
        ...existing,
        title: input.title ?? existing.title,
        spec: input.spec,
        project: input.project,
        classId: input.classId ?? existing.classId ?? null,
        folderId: input.folderId ?? existing.folderId ?? null,
        ideaId: input.ideaId ?? existing.ideaId ?? null,
        studio: input.studio ?? existing.studio,
        updatedAt: now,
        sync: { state: "local", updatedAt: now },
      }
    : {
        id: uid("wks"),
        title: input.title ?? input.project.title,
        owner: { kind: "local", id: "local-teacher" },
        createdAt: now,
        updatedAt: now,
        favorite: false,
        archived: false,
        folderId: input.folderId ?? null,
        classId: input.classId ?? null,
        ideaId: input.ideaId ?? null,
        collectionIds: [],
        spec: input.spec,
        project: input.project,
        studio: input.studio,
        revisions: [],
        sync: { state: "local", updatedAt: now },
      };

  setState({
    ...state,
    drafts: [draft, ...state.drafts.filter((d) => d.id !== draft.id)],
  });
  return draft;
}

export function updateDraft(id: string, patch: Partial<WorksheetDraft>) {
  beginMutation();
  setState({
    ...state,
    drafts: state.drafts.map((d) => (d.id === id ? { ...d, ...patch, updatedAt: Date.now() } : d)),
  });
}

export function deleteDraft(id: string) {
  beginMutation();
  setState({
    ...state,
    drafts: state.drafts.filter((d) => d.id !== id),
    weekly: stripFromWeek(state.weekly, "draft", id),
  });
}

export function duplicateDraft(id: string) {
  beginMutation();
  const src = state.drafts.find((d) => d.id === id);
  if (!src) return;
  const now = Date.now();
  const copy: WorksheetDraft = {
    ...src,
    id: uid("wks"),
    title: `${src.title} (copy)`,
    createdAt: now,
    updatedAt: now,
    favorite: false,
    revisions: [],
  };
  setState({ ...state, drafts: [copy, ...state.drafts] });
}

export function toggleFavorite(id: string) {
  beginMutation();
  setState({
    ...state,
    drafts: state.drafts.map((d) => (d.id === id ? { ...d, favorite: !d.favorite } : d)),
  });
}

export function moveDraftToFolder(id: string, folderId: string | null) {
  updateDraft(id, { folderId });
}

export function getDraft(id: string): WorksheetDraft | undefined {
  beginMutation();
  return state.drafts.find((d) => d.id === id);
}

/* --------------------------------------------------------------- folders */

export function createFolder(name: string): Folder {
  beginMutation();
  const folder: Folder = { id: uid("fld"), name, createdAt: Date.now() };
  setState({ ...state, folders: [...state.folders, folder] });
  return folder;
}

export function renameFolder(id: string, name: string) {
  beginMutation();
  setState({
    ...state,
    folders: state.folders.map((f) => (f.id === id ? { ...f, name } : f)),
  });
}

export function deleteFolder(id: string) {
  beginMutation();
  setState({
    ...state,
    folders: state.folders.filter((f) => f.id !== id),
    drafts: state.drafts.map((d) => (d.folderId === id ? { ...d, folderId: null } : d)),
  });
}

/* ----------------------------------------------------------- collections */

export function createCollection(name: string): Collection {
  beginMutation();
  const collection: Collection = { id: uid("col"), name, createdAt: Date.now() };
  setState({ ...state, collections: [...state.collections, collection] });
  return collection;
}

export function deleteCollection(id: string) {
  beginMutation();
  setState({
    ...state,
    collections: state.collections.filter((c) => c.id !== id),
    drafts: state.drafts.map((d) => ({
      ...d,
      collectionIds: d.collectionIds.filter((c) => c !== id),
    })),
  });
}

export function toggleDraftCollection(draftId: string, collectionId: string) {
  beginMutation();
  setState({
    ...state,
    drafts: state.drafts.map((d) =>
      d.id === draftId
        ? {
            ...d,
            collectionIds: d.collectionIds.includes(collectionId)
              ? d.collectionIds.filter((c) => c !== collectionId)
              : [...d.collectionIds, collectionId],
          }
        : d,
    ),
  });
}

/* --------------------------------------------------------------- classes */

export function saveClass(profile: Omit<ClassProfile, "id" | "createdAt"> & { id?: string }) {
  beginMutation();
  if (profile.id) {
    setState({
      ...state,
      classes: state.classes.map((c) => (c.id === profile.id ? { ...c, ...profile, id: c.id } : c)),
    });
    return profile.id;
  }
  const created: ClassProfile = { ...profile, id: uid("cls"), createdAt: Date.now() };
  setState({ ...state, classes: [...state.classes, created] });
  return created.id;
}

export function deleteClass(id: string) {
  beginMutation();
  setState({
    ...state,
    classes: state.classes.filter((c) => c.id !== id),
    drafts: state.drafts.map((d) => (d.classId === id ? { ...d, classId: null } : d)),
  });
}

export function setDraftArchived(id: string, archived: boolean) {
  updateDraft(id, { archived });
}

/** Marks a worksheet as still-in-progress or ready to print. */
export function setDraftStatus(id: string, status: "draft" | "finished") {
  updateDraft(id, { status });
}

/* ---------------------------------------------------------- saved ideas */

/** Saves a composed Educational Activity Specification for later. */
export function saveIdea(idea: IdeaSpec, folderId: string | null = null): SavedIdea {
  beginMutation();
  const existing = state.ideas.find((i) => i.idea.id === idea.id);
  if (existing) return existing;
  const now = Date.now();
  const saved: SavedIdea = { id: uid("idea"), createdAt: now, updatedAt: now, folderId, idea };
  setState({ ...state, ideas: [saved, ...state.ideas] });
  return saved;
}

export function updateSavedIdea(id: string, patch: Partial<SavedIdea>) {
  beginMutation();
  setState({
    ...state,
    ideas: state.ideas.map((i) => (i.id === id ? { ...i, ...patch, updatedAt: Date.now() } : i)),
  });
}

export function deleteSavedIdea(id: string) {
  beginMutation();
  setState({
    ...state,
    ideas: state.ideas.filter((i) => i.id !== id),
    weekly: stripFromWeek(state.weekly, "idea", id),
  });
}

export function duplicateSavedIdea(id: string) {
  beginMutation();
  const src = state.ideas.find((i) => i.id === id);
  if (!src) return;
  const now = Date.now();
  setState({
    ...state,
    ideas: [{ ...src, id: uid("idea"), createdAt: now, updatedAt: now }, ...state.ideas],
  });
}

export function moveIdeaToFolder(id: string, folderId: string | null) {
  updateSavedIdea(id, { folderId });
}

export function isIdeaSaved(ideaId: string) {
  return getWorkspace().ideas.some((i) => i.idea.id === ideaId);
}

/* --------------------------------------------------------- weekly plan */

function stripFromWeek(
  weekly: WorkspaceState["weekly"],
  kind: "draft" | "idea",
  refId: string,
): WorkspaceState["weekly"] {
  const next = { ...weekly };
  for (const day of Object.keys(next) as WeekDay[]) {
    next[day] = next[day].filter((item) => !(item.kind === kind && item.refId === refId));
  }
  return next;
}

export function addToWeek(day: WeekDay, kind: "draft" | "idea", refId: string) {
  beginMutation();
  const items = state.weekly[day];
  if (items.some((i) => i.kind === kind && i.refId === refId)) return;
  setState({
    ...state,
    weekly: {
      ...state.weekly,
      [day]: [...items, { id: uid("plan"), kind, refId, addedAt: Date.now() }],
    },
  });
}

export function removeFromWeek(day: WeekDay, itemId: string) {
  beginMutation();
  setState({
    ...state,
    weekly: { ...state.weekly, [day]: state.weekly[day].filter((i) => i.id !== itemId) },
  });
}

export function moveWeekItem(from: WeekDay, to: WeekDay, itemId: string) {
  beginMutation();
  const item = state.weekly[from].find((i) => i.id === itemId);
  if (!item || from === to) return;
  setState({
    ...state,
    weekly: {
      ...state.weekly,
      [from]: state.weekly[from].filter((i) => i.id !== itemId),
      [to]: [...state.weekly[to], item],
    },
  });
}

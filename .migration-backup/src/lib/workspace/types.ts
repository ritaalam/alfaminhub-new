/**
 * Alfa Mind Hub — workspace data model.
 *
 * This is the persistence layer for the creative teacher studio. It is kept
 * deliberately independent from the worksheet renderer: a worksheet draft
 * simply *carries* a `WorksheetSpec` (educational config) and a
 * `WorksheetProject` (structured worksheet), so cloud sync, teacher accounts
 * and version history can be added later without touching the UI.
 */

import type { WorksheetSpec } from "@/lib/creator-options";
import type { IdeaSpec } from "@/lib/ideas/engine";
import type { WorksheetProject } from "@/lib/worksheet-model";

export type ID = string;

/** Reserved for future teacher accounts / cloud sync. */
export type OwnerRef = {
  /** "local" until authentication is connected */
  kind: "local" | "account";
  id: string;
};

/** Reserved: future worksheet + version history entries. */
export type DraftRevision = {
  id: ID;
  createdAt: number;
  label: string;
};

export type WorksheetDraft = {
  id: ID;
  title: string;
  owner: OwnerRef;
  createdAt: number;
  updatedAt: number;
  favorite: boolean;
  /** teacher-controlled lifecycle: still working on it vs ready to print */
  status?: "draft" | "finished" | undefined;
  /** archived worksheets stay saved but leave the active workspace views */
  archived?: boolean | undefined;
  /** organisation: a draft may live in a folder, a class and collections at once */
  folderId?: ID | null | undefined;
  classId?: ID | null | undefined;
  collectionIds: ID[];
  /** everything needed to resume editing exactly where the teacher left off */
  spec: WorksheetSpec;
  project: WorksheetProject;
  /** structured activity specification this worksheet came from, when any */
  ideaId?: string | null | undefined;
  /** studio view state so Continue Editing restores the exact screen */
  studio?:
    | {
        activePageId?: string | undefined;
        printMode?: string | undefined;
      }
    | undefined;
  /** reserved for future version history — never trimmed by the UI yet */
  revisions: DraftRevision[];
  /** reserved for future cloud synchronisation */
  sync: { state: "local" | "pending" | "synced"; updatedAt: number };
};

/** An idea a teacher kept before (or instead of) creating the worksheet. */
export type SavedIdea = {
  id: ID;
  createdAt: number;
  updatedAt: number;
  folderId?: ID | null | undefined;
  favorite?: boolean | undefined;
  /** the complete Educational Activity Specification */
  idea: IdeaSpec;
};

export type Folder = {
  id: ID;
  name: string;
  createdAt: number;
};

export type Collection = {
  id: ID;
  name: string;
  createdAt: number;
};

export type ClassProfile = {
  id: ID;
  name: string;
  level: string;
  language: string;
  approach: string;
  difficulty: string;
  duration: string;
  visualDirection: string;
  printing: string;
  /** main learning goals for the group (no student data, ever) */
  goals?: string[] | undefined;
  /** preferred activity styles, e.g. "Matching", "Cut & Paste" */
  activityStyles?: string[] | undefined;
  /** general ability level of the group */
  ability?: string | undefined;
  /** free teacher notes — never student-identifying */
  notes?: string | undefined;
  createdAt: number;
};

export const weekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const;
export type WeekDay = (typeof weekDays)[number];

export type WeeklyItem = {
  id: ID;
  /** points at a saved worksheet draft or a saved idea */
  kind: "draft" | "idea";
  refId: ID;
  addedAt: number;
};

export type WeeklyPlan = Record<WeekDay, WeeklyItem[]>;

export const emptyWeek: WeeklyPlan = {
  Monday: [],
  Tuesday: [],
  Wednesday: [],
  Thursday: [],
  Friday: [],
};

export type WorkspaceState = {
  version: 1;
  drafts: WorksheetDraft[];
  folders: Folder[];
  collections: Collection[];
  classes: ClassProfile[];
  ideas: SavedIdea[];
  weekly: WeeklyPlan;
};

export const emptyWorkspace: WorkspaceState = {
  version: 1,
  drafts: [],
  folders: [],
  collections: [],
  classes: [],
  ideas: [],
  weekly: emptyWeek,
};

export function uid(prefix: string): ID {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
}

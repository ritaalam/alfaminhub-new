import type { WorksheetSpec } from "@/lib/creator-options";
import { assetsForSpec, buildWorksheetProject } from "@/lib/worksheet-builder";
import { resolveSubject } from "@/lib/worksheet-subjects";
import type {
  CountGroup,
  VisualAssetKey,
  WorksheetPageModel,
  WorksheetProject,
} from "@/lib/worksheet-model";

/**
 * Reusable, pure worksheet actions.
 *
 * Every studio control maps to one of these functions, so an AI-backed
 * implementation can later replace the body of an action without touching UI.
 */

export type StudioAction =
  | { type: "edit-text"; pageId: string; field: "title" | "instruction"; value: string }
  | { type: "change-activity"; pageId: string }
  | { type: "change-visuals"; pageId: string }
  | { type: "make-easier"; pageId: string }
  | { type: "make-harder"; pageId: string }
  | { type: "change-colors"; palette: string }
  | { type: "duplicate-page"; pageId: string }
  | { type: "delete-page"; pageId: string }
  | { type: "add-page" }
  | { type: "regenerate"; version: number };

const assetCycle = [
  "ladybug",
  "bee",
  "butterfly",
  "ant",
  "dragonfly",
  "beetle",
  "caterpillar",
  "snail",
] as const;

function shiftCounts(page: WorksheetPageModel, delta: number): WorksheetPageModel {
  const resizeGroup = (group: CountGroup): CountGroup => {
    const target = Math.max(1, Math.min(10, group.renderedObjects.length + delta));
    const exemplar = group.renderedObjects[0];
    if (!exemplar) return group;
    const renderedObjects = Array.from({ length: target }, (_, i) => ({
      ...exemplar,
      id: `${group.id}-object-${i + 1}`,
    }));
    return { ...group, renderedObjects, correctAnswer: renderedObjects.length };
  };

  if (page.activity.kind !== "count-match" && page.activity.kind !== "count-circle") return page;

  if (page.activity.kind === "count-match") {
    const groups = page.activity.groups.map(resizeGroup);
    return {
      ...page,
      activity: {
        ...page.activity,
        groups,
        numberChoices: groups.map((g) => g.renderedObjects.length).reverse(),
      },
      answerKey: groups.map((g) => ({ groupId: g.id, answer: g.renderedObjects.length })),
    };
  }

  const rows = page.activity.rows.map((r) => {
    const resized = resizeGroup(r);
    const count = resized.renderedObjects.length;
    const choices = [count, Math.max(1, count - 1), Math.min(10, count + 2)];
    return { ...resized, choices: [...new Set(choices)].sort((a, b) => a - b) };
  });
  return {
    ...page,
    activity: { ...page.activity, rows },
    answerKey: rows.map((r) => ({ groupId: r.id, answer: r.renderedObjects.length })),
  };
}

function cycleVisuals(
  page: WorksheetPageModel,
  allowed: readonly VisualAssetKey[],
): WorksheetPageModel {
  const cycle: readonly VisualAssetKey[] = allowed.length ? allowed : assetCycle;
  const nextAsset = (a: VisualAssetKey): VisualAssetKey => {
    const i = cycle.indexOf(a);
    return cycle[(i + 1 + cycle.length) % cycle.length]!;
  };

  const cycleObject = (object: CountGroup["renderedObjects"][number]) => {
    const { character: _character, ...rest } = object;
    return { ...rest, asset: nextAsset(object.asset) };
  };

  if (page.activity.kind !== "count-match" && page.activity.kind !== "count-circle") return page;
  if (page.activity.kind === "count-match") {
    return {
      ...page,
      activity: {
        ...page.activity,
        groups: page.activity.groups.map((g) => ({
          ...g,
          renderedObjects: g.renderedObjects.map(cycleObject),
        })),
      },
    };
  }
  return {
    ...page,
    activity: {
      ...page.activity,
      rows: page.activity.rows.map((r) => ({
        ...r,
        renderedObjects: r.renderedObjects.map(cycleObject),
      })),
    },
  };
}

function renumber(pages: WorksheetPageModel[]): WorksheetPageModel[] {
  return pages.map((p, i) => ({ ...p, id: `page-${i + 1}` }));
}

export function applyStudioAction(
  project: WorksheetProject,
  spec: WorksheetSpec,
  action: StudioAction,
): WorksheetProject {
  const mapPage = (fn: (p: WorksheetPageModel) => WorksheetPageModel, pageId: string) => ({
    ...project,
    pages: project.pages.map((p) => (p.id === pageId ? fn(p) : p)),
  });

  switch (action.type) {
    case "edit-text":
      return mapPage((p) => ({ ...p, [action.field]: action.value }), action.pageId);

    case "change-activity": {
      const template = buildWorksheetProject(spec, Date.now() % 997);
      return mapPage((p) => {
        const alt =
          template.pages.find((t) => t.activityType !== p.activityType) ?? template.pages[0]!;
        return { ...alt, id: p.id };
      }, action.pageId);
    }

    case "change-visuals": {
      // a locked subject (e.g. "butterflies only") never cycles to another object
      const subject = resolveSubject(spec);
      const allowed = subject.locked ? subject.assets : assetsForSpec(spec);
      return mapPage((p) => cycleVisuals(p, allowed), action.pageId);
    }

    case "make-easier":
      return mapPage((p) => shiftCounts(p, -1), action.pageId);

    case "make-harder":
      return mapPage((p) => shiftCounts(p, 1), action.pageId);

    case "change-colors":
      return { ...project, meta: { ...project.meta, palette: action.palette } };

    case "duplicate-page": {
      const index = project.pages.findIndex((p) => p.id === action.pageId);
      if (index < 0) return project;
      const copy = { ...project.pages[index]!, id: `copy-${Date.now()}` };
      const pages = [...project.pages];
      pages.splice(index + 1, 0, copy);
      return { ...project, pages: renumber(pages) };
    }

    case "delete-page": {
      if (project.pages.length <= 1) return project;
      return { ...project, pages: renumber(project.pages.filter((p) => p.id !== action.pageId)) };
    }

    case "add-page": {
      const fresh = buildWorksheetProject(spec, project.pages.length + 1);
      const template = fresh.pages[project.pages.length % fresh.pages.length] ?? fresh.pages[0]!;
      return { ...project, pages: renumber([...project.pages, { ...template, id: "new" }]) };
    }

    case "regenerate":
      return buildWorksheetProject(spec, action.version);

    default:
      return project;
  }
}

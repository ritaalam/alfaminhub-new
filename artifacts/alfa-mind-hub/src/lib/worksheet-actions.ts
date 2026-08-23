import type { WorksheetSpec } from "@/lib/creator-options";
import { assetsForSpec, buildWorksheetProject, rangeForSpec } from "@/lib/worksheet-builder";
import { applyPromptIntent } from "@/lib/learning-domains";
import { adjustMemoryPairsDifficulty } from "@/lib/worksheet-memory";
import { mechanicOfActivity, promptRequestsMechanic } from "@/lib/worksheet-objectives";
import { resolveSubject } from "@/lib/worksheet-subjects";
import { visualDirections } from "@/lib/visual-directions";
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
  | { type: "set-visual-direction"; directionId: string }
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

function shiftCounts(
  page: WorksheetPageModel,
  delta: number,
  range: readonly [number, number] = [1, 10],
): WorksheetPageModel {
  const resizeGroup = (group: CountGroup): CountGroup => {
    const target = Math.max(range[0], Math.min(range[1], group.renderedObjects.length + delta));
    const exemplar = group.renderedObjects[0];
    if (!exemplar) return group;
    const renderedObjects = Array.from({ length: target }, (_, i) => ({
      ...exemplar,
      id: `${group.id}-object-${i + 1}`,
    }));
    return { ...group, renderedObjects, correctAnswer: renderedObjects.length };
  };

  const activity = page.activity;
  if (activity.kind !== "count-match" && activity.kind !== "count-circle") return page;

  if (activity.kind === "count-match") {
    const groups = activity.groups.map(resizeGroup);
    if (groups.every((group, index) => group === activity.groups[index])) return page;
    return {
      ...page,
      activity: {
        ...activity,
        groups,
        numberChoices: groups.map((g) => g.renderedObjects.length).reverse(),
      },
      answerKey: groups.map((g) => ({ groupId: g.id, answer: g.renderedObjects.length })),
    };
  }

  const rows = activity.rows.map((r) => {
    const resized = resizeGroup(r);
    const count = resized.renderedObjects.length;
    const choices = [count, Math.max(1, count - 1), Math.min(10, count + 2)];
    return { ...resized, choices: [...new Set(choices)].sort((a, b) => a - b) };
  });
  if (rows.every((row, index) => row === activity.rows[index])) return page;
  return {
    ...page,
    activity: { ...activity, rows },
    answerKey: rows.map((r) => ({ groupId: r.id, answer: r.renderedObjects.length })),
  };
}

function adjustDifficulty(
  page: WorksheetPageModel,
  spec: WorksheetSpec,
  direction: "easier" | "harder",
): WorksheetPageModel {
  if (page.activity.kind === "memory-pairs") {
    return adjustMemoryPairsDifficulty(page, spec, direction);
  }
  return shiftCounts(page, direction === "harder" ? 1 : -1, rangeForSpec(spec));
}

const difficultySteps = ["Very Easy", "Easy", "Standard", "Challenge"] as const;

function adjacentDifficulty(spec: WorksheetSpec, direction: "easier" | "harder") {
  const current = Math.max(0, difficultySteps.indexOf(spec.difficulty as (typeof difficultySteps)[number]));
  const index =
    direction === "harder"
      ? Math.min(difficultySteps.length - 1, current + 1)
      : Math.max(0, current - 1);
  return { ...spec, difficulty: difficultySteps[index] };
}

/**
 * Rebuild a page at a neighbouring difficulty while retaining the exact
 * mechanic the teacher chose. This gives non-counting activities a substantive
 * workload change instead of a cosmetic label change.
 */
function difficultyVariant(
  page: WorksheetPageModel,
  spec: WorksheetSpec,
  direction: "easier" | "harder",
  seed: number,
) {
  const mechanic = mechanicOfActivity(page.activity);
  const variation = buildWorksheetProject(adjacentDifficulty(spec, direction), seed);
  const replacement = variation.pages.find(
    (candidate) => mechanicOfActivity(candidate.activity) === mechanic,
  );
  return replacement ? { ...replacement, id: page.id } : page;
}

function cycleVisuals(
  page: WorksheetPageModel,
  allowed: readonly VisualAssetKey[],
  cycleAssets = true,
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

  const directionIndex = visualDirections.findIndex(
    (direction) => direction.id === page.illustrationStyle.directionId,
  );
  const nextDirection =
    visualDirections[(Math.max(0, directionIndex) + 1) % visualDirections.length]!;
  const withStyle = {
    ...page,
    illustrationStyle: { ...page.illustrationStyle, directionId: nextDirection.id },
  };

  // A page with a teacher-authored mechanic contract can still receive a real
  // visual refresh through its illustration direction. Its countable objects
  // stay fixed so a broad theme pool cannot turn "sea creatures" into a mixed
  // scene (for example, by adding a boat) and invalidate the prompt wording.
  if (
    !cycleAssets ||
    (page.activity.kind !== "count-match" && page.activity.kind !== "count-circle")
  )
    return withStyle;
  if (page.activity.kind === "count-match") {
    return {
      ...withStyle,
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
    ...withStyle,
    activity: {
      ...page.activity,
      rows: page.activity.rows.map((r) => ({
        ...r,
        renderedObjects: r.renderedObjects.map(cycleObject),
      })),
    },
  };
}

function withEditedPageCount(
  project: WorksheetProject,
  pages: WorksheetPageModel[],
  newPageContracts: ReadonlyMap<string, NonNullable<WorksheetProject["pagePlanContract"]>[number]> =
    new Map(),
): WorksheetProject {
  const generationSpecification = project.generationSpecification
    ? {
        ...project.generationSpecification,
        requestedPageCount: pages.length,
        normalizedSpec: {
          ...project.generationSpecification.normalizedSpec,
          pages: String(pages.length),
        },
      }
    : undefined;
  return {
    ...project,
    pages,
    ...(project.pagePlanContract
      ? {
          pagePlanContract: pages.map((page, index) => {
            const existingIndex = project.pages.findIndex((candidate) => candidate.id === page.id);
            const existing = existingIndex >= 0 ? project.pagePlanContract?.[existingIndex] : undefined;
            const added = newPageContracts.get(page.id);
            const source = existing ?? added;
            return {
              ...(source ?? project.pagePlanContract?.[0]!),
              page: index + 1,
              // A duplicated practice page inherits the activity/content
              // contract but not a "Page N" directive from the teacher.
              explicit: existing ? existing.explicit : false,
            };
          }),
        }
      : {}),
    ...(generationSpecification ? { generationSpecification } : {}),
  };
}

function sameMechanicVariation(
  page: WorksheetPageModel,
  spec: WorksheetSpec,
  seed: number,
): WorksheetPageModel | null {
  const mechanic = mechanicOfActivity(page.activity);
  const fresh = buildWorksheetProject(spec, seed);
  const candidates = fresh.pages.filter(
    (candidate) => mechanicOfActivity(candidate.activity) === mechanic,
  );
  const varied = candidates.find(
    (candidate) =>
      candidate.title !== page.title ||
      JSON.stringify(candidate.activity) !== JSON.stringify(page.activity),
  );
  return varied ? { ...varied, id: page.id } : null;
}

export function applyStudioAction(
  project: WorksheetProject,
  spec: WorksheetSpec,
  action: StudioAction,
): WorksheetProject {
  const fidelitySpec = applyPromptIntent(spec);
  const mapPage = (fn: (p: WorksheetPageModel) => WorksheetPageModel, pageId: string) => {
    const index = project.pages.findIndex((page) => page.id === pageId);
    if (index < 0) return project;
    const current = project.pages[index]!;
    const replacement = fn(current);
    if (replacement === current) return project;
    const pages = [...project.pages];
    pages[index] = replacement;
    return { ...project, pages };
  };

  switch (action.type) {
    case "edit-text":
      return mapPage((p) => ({ ...p, [action.field]: action.value }), action.pageId);

    case "change-activity": {
      const pageIndex = project.pages.findIndex((page) => page.id === action.pageId);
      if (
        pageIndex < 0 ||
        project.pagePlanContract?.[pageIndex]?.explicit ||
        promptRequestsMechanic(fidelitySpec)
      )
        return project;
      const template = buildWorksheetProject(fidelitySpec, Date.now() % 997);
      return mapPage((p) => {
        const alt =
          template.pages.find(
            (candidate) =>
              candidate.activityType !== p.activityType &&
              mechanicOfActivity(candidate.activity) !== mechanicOfActivity(p.activity),
          ) ?? null;
        return alt ? { ...alt, id: p.id } : p;
      }, action.pageId);
    }

    case "change-visuals": {
      // a locked subject (e.g. "butterflies only") never cycles to another object
      const subject = resolveSubject(fidelitySpec);
      const allowed = subject.locked ? subject.assets : assetsForSpec(fidelitySpec);
      const pageIndex = project.pages.findIndex((page) => page.id === action.pageId);
      const preserveCountAssets =
        subject.locked || Boolean(project.pagePlanContract?.[pageIndex]?.explicit);
      return mapPage((p) => cycleVisuals(p, allowed, !preserveCountAssets), action.pageId);
    }

    case "make-easier":
      return mapPage((p) => {
        const adjusted = adjustDifficulty(p, fidelitySpec, "easier");
        return adjusted !== p
          ? adjusted
          : difficultyVariant(p, fidelitySpec, "easier", Date.now() % 997);
      }, action.pageId);

    case "make-harder":
      return mapPage((p) => {
        const adjusted = adjustDifficulty(p, fidelitySpec, "harder");
        return adjusted !== p
          ? adjusted
          : difficultyVariant(p, fidelitySpec, "harder", Date.now() % 997);
      }, action.pageId);

    case "change-colors":
      return {
        ...project,
        meta: { ...project.meta, palette: action.palette },
        colorPaletteOverride: action.palette,
      };

    case "set-visual-direction":
      return {
        ...project,
        visualDirection: action.directionId,
        illustrationStyle: { ...project.illustrationStyle, directionId: action.directionId },
        pages: project.pages.map((page) => ({
          ...page,
          illustrationStyle: { ...page.illustrationStyle, directionId: action.directionId },
        })),
      };

    case "duplicate-page": {
      const index = project.pages.findIndex((p) => p.id === action.pageId);
      if (index < 0) return project;
      const source = project.pages[index]!;
      const copy = sameMechanicVariation(source, fidelitySpec, Date.now() % 997);
      if (!copy) return project;
      const duplicate = { ...copy, id: `duplicate-${source.id}-${Date.now()}` };
      const pages = [...project.pages];
      pages.splice(index + 1, 0, duplicate);
      const sourceContract = project.pagePlanContract?.[index];
      return withEditedPageCount(
        project,
        pages,
        sourceContract ? new Map([[duplicate.id, sourceContract]]) : undefined,
      );
    }

    case "delete-page": {
      if (project.pages.length <= 1) return project;
      return withEditedPageCount(project, project.pages.filter((p) => p.id !== action.pageId));
    }

    case "add-page": {
      const fresh = buildWorksheetProject(fidelitySpec, project.pages.length + 1);
      const template = fresh.pages[project.pages.length % fresh.pages.length] ?? fresh.pages[0]!;
      const added = { ...template, id: `added-${Date.now()}` };
      const freshContract =
        fresh.pagePlanContract?.[project.pages.length % (fresh.pagePlanContract.length || 1)] ??
        fresh.pagePlanContract?.[0];
      return withEditedPageCount(
        project,
        [...project.pages, added],
        freshContract ? new Map([[added.id, freshContract]]) : undefined,
      );
    }

    case "regenerate":
      return buildWorksheetProject(fidelitySpec, action.version);

    default:
      return project;
  }
}

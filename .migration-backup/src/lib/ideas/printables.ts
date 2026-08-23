/**
 * Idea → real printable. Uses the existing worksheet pipeline (spec →
 * validated project → saved draft) so an idea created here behaves exactly
 * like any worksheet made in the Creator: it autosaves, appears in My
 * Workspace, reopens and exports to PDF.
 */

import { defaultSpec, type WorksheetSpec } from "@/lib/creator-options";
import { ideaToSpecPatch, makeEasier, makeHarder, type IdeaSpec } from "./engine";
import { buildValidWorksheetProject } from "@/lib/worksheet-service";
import { saveDraft } from "@/lib/workspace/store";

export function specForIdea(idea: IdeaSpec, base: WorksheetSpec = defaultSpec): WorksheetSpec {
  return { ...base, ...ideaToSpecPatch(idea) } as WorksheetSpec;
}

export type LeveledDraft = {
  level: "Support" | "Standard" | "Challenge";
  draftId: string;
  title: string;
};

/**
 * "Create 3 levels" — three real, validated, saved worksheets that share one
 * learning objective at three difficulties.
 */
export function createThreeLevels(idea: IdeaSpec, classId?: string | null): LeveledDraft[] {
  const variants: Array<{ level: LeveledDraft["level"]; idea: IdeaSpec }> = [
    { level: "Support", idea: makeEasier(idea) },
    { level: "Standard", idea },
    { level: "Challenge", idea: makeHarder(idea) },
  ];

  return variants.map(({ level, idea: variant }) => {
    const spec = specForIdea(variant);
    const project = buildValidWorksheetProject(spec, 1);
    const title = `${idea.title} — ${level}`;
    const draft = saveDraft({
      title,
      spec,
      project: { ...project, title },
      classId: classId ?? null,
      ideaId: variant.id,
    });
    return { level, draftId: draft.id, title };
  });
}

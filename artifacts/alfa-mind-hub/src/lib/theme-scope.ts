/**
 * THEME SCOPE
 * -----------
 * The requested THEME ("space") is decoration, but it is a *constraint* on
 * decoration: a space pack may only draw space pictures. This module answers
 * two questions for the rest of the engine:
 *
 *   1. which illustrations belong to the requested theme, and
 *   2. what a themed illustration is CALLED on the page ("rocket" is read as
 *      "spaceship" in a space pack, which is what makes it an /s/ word).
 *
 * It deliberately knows nothing about mechanics or learning objectives so it
 * can be imported by both without a cycle.
 */

import type { WorksheetSpec } from "./creator-options";
import { themeTopics, visualObjects, type VisualAssetKey } from "./semantic-topics";
import { resolveSubject } from "./worksheet-subjects";

/**
 * Theme-specific names for shared artwork.
 *
 * A theme may only rename a picture to a word a child would genuinely say for
 * that same drawing. Renames that change the beginning sound (a rocket read as
 * "spaceship") are forbidden: phonics answers are derived from the picture via
 * `picture-lexicon`, so a nickname would make the answer key wrong.
 */
const themeWords: Record<string, Partial<Record<VisualAssetKey, string>>> = {};

export type ThemeScope = {
  id?: string;
  label: string;
  /** illustrations that belong to the theme, most representative first */
  assets: VisualAssetKey[];
  /** true when the theme really restricts which pictures may appear */
  constrains: boolean;
};

export const openThemeScope: ThemeScope = {
  label: "Open theme",
  assets: [],
  constrains: false,
};

export function resolveThemeScope(spec: WorksheetSpec): ThemeScope {
  const subject = resolveSubject(spec);
  const topic =
    themeTopics.find((entry) => entry.id === subject.topicId) ??
    themeTopics.find((entry) => entry.objects.includes(subject.assets[0]!));
  if (!topic || subject.kind !== "theme") return openThemeScope;
  const assets = [...new Set([...topic.objects, ...subject.assets])];
  return { id: topic.id, label: topic.title, assets, constrains: true };
}

/** What a picture is CALLED inside this theme. */
export function themeWordFor(scope: ThemeScope, asset: VisualAssetKey) {
  return (
    (scope.id ? themeWords[scope.id]?.[asset] : undefined) ??
    visualObjects[asset]?.singular ??
    asset
  );
}

export function inTheme(scope: ThemeScope, asset: VisualAssetKey) {
  return !scope.constrains || scope.assets.includes(asset);
}

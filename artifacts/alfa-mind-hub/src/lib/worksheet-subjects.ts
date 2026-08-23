import type { WorksheetSpec } from "./creator-options";
import {
  classifyConcept,
  defaultTopic,
  closestVisualAssetFor,
  isAbstractConcept,
  matchObjects,
  matchTheme,
  visualObjects,
  type ConceptKind,
  type VisualAssetKey,
} from "./semantic-topics";

/**
 * Subject resolution — "what is actually drawn on the page".
 *
 * SEMANTIC RULE
 * -------------
 * The requested concept is first CLASSIFIED (object / theme / skill / activity
 * / subject). Only a concrete object is ever counted directly. A theme such as
 * "Space" is expanded into concrete objects that belong to it (stars, planets,
 * rockets…), so the engine never produces "Count the space".
 *
 * Educational accuracy rule: if the teacher names a specific object
 * (e.g. "butterflies"), the worksheet uses THAT object only. Mixed sets are
 * used exclusively when the request is a theme or category.
 */

export type SubjectResolution = {
  /** assets the generator may draw, in priority order */
  assets: VisualAssetKey[];
  /** true when the teacher named the object(s) explicitly — no substitutions */
  locked: boolean;
  /** child-facing plural noun used in instructions, e.g. "butterflies" */
  plural: string;
  /** child-facing singular noun used when a mechanic shows one target */
  singular: string;
  /** title-case noun used in page titles, e.g. "Butterflies" */
  label: string;
  /** how the requested concept was understood */
  kind: ConceptKind;
  /** theme id when the request was a theme, e.g. "space" */
  topicId?: string;
};

function labelForObjects(assets: VisualAssetKey[]) {
  if (assets.length === 1) {
    return {
      singular: visualObjects[assets[0]!].singular,
      plural: visualObjects[assets[0]!].plural,
      label: visualObjects[assets[0]!].label,
    };
  }
  const words = assets.map((a) => visualObjects[a].plural);
  return {
    singular: visualObjects[assets[0]!].singular,
    plural: `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`,
    label: assets.map((a) => visualObjects[a].label).join(" & "),
  };
}

function titleCase(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function pluralize(value: string) {
  const clean = value.trim().toLowerCase();
  if (!clean) return "pictures";
  if (/(?:s|x|z|ch|sh)$/i.test(clean)) return clean;
  return `${clean}s`;
}

/**
 * Finds a teacher-named subject even if no individual asset alias currently
 * exists. It deliberately runs only after known objects and themes have had
 * priority, so existing exact assets and page contracts remain untouched.
 */
function unmappedTeacherSubject(prompt: string, theme: string): string | undefined {
  const themed = prompt.match(/\b([a-z][a-z -]{2,40}?)(?:[-\s]+themed|\s+theme)\b/i)?.[1];
  if (themed) return themed.trim();

  const action = prompt.match(
    /\b(?:count|find|match|trace|sort|circle|draw|colour|color|use|include)\s+(?:the\s+)?((?:[a-z-]+\s+){0,4}[a-z-]{3,})\b/i,
  )?.[1];
  if (!action) return undefined;
  const ignored = new Set([
    "cute",
    "colorful",
    "colourful",
    "bright",
    "little",
    "small",
    "big",
    "each",
    "all",
    "the",
    "number",
    "numbers",
    "letter",
    "letters",
    "picture",
    "pictures",
    "object",
    "objects",
    "shape",
    "shapes",
    "worksheet",
    "activity",
  ]);
  const words = action
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 2 && !ignored.has(word));
  return words.length ? words.slice(-2).join(" ") : undefined;
}

/**
 * Resolves what the worksheet draws from the free-text prompt first (it is the
 * most explicit signal), then the theme field, then a safe default.
 */
export function resolveSubject(spec: WorksheetSpec): SubjectResolution {
  const prompt = spec.prompt ?? "";
  const theme = spec.theme ?? "";

  // In a page-by-page category pack, entity names inside one directive are
  // page targets, not a replacement for the pack category. Previously "cows"
  // locked the whole farm pack to cow (or a stale shapes fallback).
  const promptTopic = matchTheme(prompt);
  if ((prompt.match(/\bpage\s*\d{1,2}\s*[:.)\-–—]/gi)?.length ?? 0) > 1 && promptTopic) {
    return {
      assets: promptTopic.objects,
      locked: false,
      singular: promptTopic.objects.length === 1 ? visualObjects[promptTopic.objects[0]!].singular : promptTopic.plural,
      plural: promptTopic.plural,
      label: promptTopic.title,
      kind: "theme",
      topicId: promptTopic.id,
    };
  }

  // A shapes pack may name an individual target in one page directive (for
  // example, "find circles") while the other pages still require the complete
  // geometric vocabulary. Preserve the category as the project subject; the
  // page contract decides which member is targeted on each page.
  const shapeTopic =
    matchTheme(prompt)?.id === "shapes"
      ? matchTheme(prompt)
      : matchTheme(theme)?.id === "shapes"
        ? matchTheme(theme)
        : undefined;
  if (shapeTopic) {
    return {
      assets: shapeTopic.objects,
      locked: false,
      singular: "shape",
      plural: shapeTopic.plural,
      label: shapeTopic.title,
      kind: "theme",
      topicId: shapeTopic.id,
    };
  }

  // 1. concrete objects named explicitly -> locked, no substitutions
  const explicit = matchObjects(prompt).length ? matchObjects(prompt) : matchObjects(theme);
  if (explicit.length) {
    const { plural, label } = labelForObjects(explicit);
    return {
      assets: explicit,
      locked: true,
      singular: visualObjects[explicit[0]!].singular,
      plural,
      label,
      kind: "object",
    };
  }

  // 2. a theme (or any abstract category) -> expand into concrete objects.
  // A newly named, unmapped prompt subject must beat a stale UI default such
  // as "Insects", otherwise the default would silently replace the request.
  const dynamicSubject = unmappedTeacherSubject(prompt, theme);
  const topic = matchTheme(prompt) ?? (dynamicSubject ? undefined : matchTheme(theme));
  if (topic) {
    return {
      assets: topic.objects,
      locked: false,
      singular: topic.objects.length === 1 ? visualObjects[topic.objects[0]!].singular : topic.plural,
      plural: topic.plural,
      label: topic.title,
      kind: classifyConcept(theme) === "object" ? "object" : "theme",
      topicId: topic.id,
    };
  }

  // 3. unknown wording: retain the teacher's noun and draw the closest original
  // Alfa illustration rather than rejecting the request or reverting to insects.
  if (dynamicSubject && !isAbstractConcept(dynamicSubject)) {
    const plural = pluralize(dynamicSubject);
    return {
      assets: [closestVisualAssetFor(dynamicSubject)],
      locked: true,
      singular: dynamicSubject.toLowerCase().replace(/s$/, ""),
      plural,
      label: titleCase(plural),
      kind: "object",
    };
  }

  // 4. no named content: use the established safe default.
  const fallback = defaultTopic();
  const safeLabel = theme.trim() && !isAbstractConcept(theme) ? theme.trim() : fallback.title;
  const safePlural =
    theme.trim() && !isAbstractConcept(theme)
      ? `${theme.trim().toLowerCase()} pictures`
      : fallback.plural;

  return {
    assets: fallback.objects,
    locked: false,
    singular: fallback.objects.length === 1 ? visualObjects[fallback.objects[0]!].singular : fallback.plural,
    plural: safePlural,
    label: safeLabel,
    kind: classifyConcept(theme),
    topicId: fallback.id,
  };
}

export function singularOf(asset: VisualAssetKey) {
  return visualObjects[asset].singular;
}

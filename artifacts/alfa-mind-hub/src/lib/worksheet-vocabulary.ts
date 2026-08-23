/**
 * Visual vocabulary layer.
 *
 * A themed worksheet does not mean every drawing on the page is the same
 * object. A butterfly pack may also use flowers, leaves, caterpillars and
 * simple nature shapes as SUPPORTING elements — they widen the visual language
 * of the pack without ever changing what the child is asked to count.
 *
 * RULE
 * ----
 * Supporting assets are only used where they are not the counted target:
 * pattern units, sorting categories, and scenery inside a find & count scene.
 * The counted target set always stays locked to the teacher's subject.
 */

import { themeTopics, visualObjects, type VisualAssetKey } from "./semantic-topics";
import type { SubjectResolution } from "./worksheet-subjects";

/** Supporting elements that belong naturally beside a given object. */
const companions: Partial<Record<VisualAssetKey, VisualAssetKey[]>> = {
  butterfly: ["flower", "leaf", "caterpillar", "tree", "sun"],
  bee: ["flower", "leaf", "tree", "sun"],
  ladybug: ["leaf", "flower", "mushroom", "tree"],
  ant: ["leaf", "acorn", "mushroom", "tree"],
  dragonfly: ["leaf", "flower", "tree", "cloud"],
  beetle: ["leaf", "acorn", "mushroom", "tree"],
  caterpillar: ["leaf", "flower", "butterfly", "tree"],
  snail: ["leaf", "mushroom", "flower", "tree"],
  flower: ["leaf", "tree", "sun", "butterfly"],
  leaf: ["tree", "acorn", "mushroom", "flower"],
};

/** Calm, print-friendly nature shapes usable with almost any early-years theme. */
const neutralSupport: VisualAssetKey[] = ["flower", "leaf", "tree", "sun", "cloud", "heart"];

/**
 * Supporting assets for a resolved subject, most coherent first.
 *
 * Order of preference: hand-curated companions for the primary object, other
 * objects from the same theme, then the neutral nature set. The subject's own
 * assets are never returned.
 */
export function supportingAssets(subject: SubjectResolution, limit = 4): VisualAssetKey[] {
  const primary = subject.assets[0]!;
  const own = new Set(subject.assets);
  const themed =
    themeTopics.find((topic) => topic.id === subject.topicId)?.objects ??
    themeTopics.find((topic) => topic.objects.includes(primary))?.objects ??
    [];

  const ordered = [...(companions[primary] ?? []), ...themed, ...neutralSupport];
  const result: VisualAssetKey[] = [];
  for (const asset of ordered) {
    if (own.has(asset) || result.includes(asset)) continue;
    result.push(asset);
    if (result.length >= limit) break;
  }
  return result;
}

/**
 * The asset palette a NON-COUNTING composition may draw from: the subject
 * itself plus its supporting vocabulary.
 */
export function compositionAssets(subject: SubjectResolution, limit = 3): VisualAssetKey[] {
  return [subject.assets[0]!, ...supportingAssets(subject, limit)].slice(0, limit + 1);
}

export function pluralOf(asset: VisualAssetKey) {
  return visualObjects[asset].plural;
}

export function labelOf(asset: VisualAssetKey) {
  return visualObjects[asset].label;
}

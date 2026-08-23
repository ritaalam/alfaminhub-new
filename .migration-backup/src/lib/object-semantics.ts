/**
 * OBJECT SEMANTICS
 * ----------------
 * What a picture MEANS, beyond how it is drawn:
 *
 *   • its basic geometric shape  (ball → circle, book → rectangle)
 *   • the everyday category it belongs to (apple → things we eat)
 *
 * These facts let a page ask a real thinking question — "which shape is this
 * object like?", "is this something we eat or something we play with?" —
 * instead of degrading into an identical-picture match or a themed sort.
 * Only relationships that are unambiguous for a 3–6 year old are listed; an
 * object with no confident entry is simply not used on those pages.
 */

import { visualObjects, type VisualAssetKey } from "./semantic-topics";

export type BasicShapeKey = "circle" | "square" | "triangle" | "rectangle";

export const basicShapes: BasicShapeKey[] = ["circle", "square", "triangle", "rectangle"];

export type PreschoolShapeAssociation = Readonly<{
  object: VisualAssetKey;
  shape: BasicShapeKey;
  /** Exact artwork variant audited against the renderer's complete silhouette. */
  illustration: VisualAssetKey;
}>;

/**
 * The one source of truth for preschool object → shape work.
 *
 * This is intentionally small. An object is admitted only when the complete
 * drawing has one visually obvious basic shape; suggestive components (a round
 * tree top, a triangular sail, a long pencil) are not enough.
 */
export const preschoolShapeAssociations: readonly PreschoolShapeAssociation[] = Object.freeze([
  Object.freeze({ object: "ball", illustration: "ball", shape: "circle" }),
  Object.freeze({ object: "squareTile", illustration: "squareTile", shape: "square" }),
  Object.freeze({ object: "closedBook", illustration: "closedBook", shape: "rectangle" }),
  Object.freeze({
    object: "triangularRoadSign",
    illustration: "triangularRoadSign",
    shape: "triangle",
  }),
]);

/**
 * Strict visual whitelist. Generic semantic nouns are not enough: the exact
 * renderer asset must have been audited as a clear 2D silhouette. This keeps
 * an open book or rectangular/3D gift from inheriting a shape association.
 */
export const preschoolVisualShapeWhitelist: Readonly<
  Partial<Record<VisualAssetKey, Readonly<{ shape: BasicShapeKey; illustration: VisualAssetKey }>>>
> = Object.freeze(
  Object.fromEntries(
    preschoolShapeAssociations.map(({ illustration, shape }) => [
      illustration,
      Object.freeze({ illustration, shape }),
    ]),
  ) as Partial<
    Record<VisualAssetKey, Readonly<{ shape: BasicShapeKey; illustration: VisualAssetKey }>>
  >,
);

/** Compatibility lookup, derived from the curated records rather than authored separately. */
export const shapeOfObject: Readonly<Partial<Record<VisualAssetKey, BasicShapeKey>>> =
  Object.freeze(
    Object.fromEntries(
      preschoolShapeAssociations.map(({ object, shape }) => [object, shape]),
    ) as Partial<Record<VisualAssetKey, BasicShapeKey>>,
  );

/** Both the object identity and the exact rendered variant must be approved. */
export function isVisuallyCorrectShapeMatch(object: VisualAssetKey, shape: string): boolean {
  const approved = preschoolVisualShapeWhitelist[object];
  return approved?.illustration === object && approved.shape === shape;
}

/**
 * Object → shape pairs that actually exist in this project's picture set.
 *
 * INVARIANT: every returned pair is a confident, developmentally obvious
 * relationship taken from `shapeOfObject`, each pair uses a DIFFERENT shape,
 * and each object appears once. A page built from these pairs therefore always
 * prints the semantically correct shape card for every object it shows, and no
 * two objects compete for the same shape (which would make the answer
 * ambiguous for a preschooler).
 */
export function shapePairs(limit = 4): Array<{ object: VisualAssetKey; shape: BasicShapeKey }> {
  return preschoolShapeAssociations
    .filter(
      ({ object, illustration, shape }) =>
        object === illustration &&
        object in visualObjects &&
        shape in visualObjects &&
        isVisuallyCorrectShapeMatch(illustration, shape),
    )
    .slice(0, Math.max(2, limit))
    .map((pair) => ({ ...pair }));
}

/** True when the object→shape relationship is one this project vouches for. */
export function isCorrectShapeMatch(object: VisualAssetKey, shape: string): boolean {
  return shapeOfObject[object] === shape && isVisuallyCorrectShapeMatch(object, shape);
}

type ShapeMatchSide = { id: string; pairId: string; asset: VisualAssetKey };

/**
 * SEMANTIC INVARIANT — object → shape matching.
 *
 * 1. every object on the page has exactly one vouched-for shape
 * 2. that shape is actually printed on the page
 * 3. the printed pairing (pairId) is the semantic one, never an arbitrary
 *    leftover match
 * 4. no two objects share a shape card, so no answer is ambiguous
 * 5. the answer key names the same pairing the artwork encodes
 */
export function shapeMatchIssues(
  left: readonly ShapeMatchSide[],
  right: readonly ShapeMatchSide[],
  answerKey: readonly { groupId: string; answer?: number; answerText?: string }[] = [],
): string[] {
  const issues: string[] = [];
  const shapesOnPage = right.map((item) => item.asset as string);
  const usedShapes = new Set<string>();

  for (const object of left) {
    const expected = shapeOfObject[object.asset];
    const name = visualObjects[object.asset]?.singular ?? object.asset;
    if (!expected) {
      issues.push(
        `"${name}" has no clear basic shape for this age group, so it cannot be matched to one.`,
      );
      continue;
    }
    if (!isVisuallyCorrectShapeMatch(object.asset, expected)) {
      issues.push(
        `"${name}" uses an illustration variant whose complete silhouette is not approved as a ${expected}.`,
      );
      continue;
    }
    if (!shapesOnPage.includes(expected)) {
      issues.push(`The correct shape (${expected}) for "${name}" is not printed on the page.`);
      continue;
    }
    const partners = right.filter((item) => item.pairId === object.pairId);
    if (partners.length !== 1) {
      issues.push(`"${name}" must be paired with exactly one shape card.`);
      continue;
    }
    const partner = partners[0]!;
    if (partner.asset !== expected) {
      issues.push(
        `"${name}" is matched to a ${partner.asset}; the correct shape is a ${expected}.`,
      );
    }
    if (usedShapes.has(expected)) {
      issues.push(`Two objects both answer "${expected}", which makes the match ambiguous.`);
    }
    usedShapes.add(expected);

    const keyed = answerKey.find((entry) => entry.groupId === object.id);
    const partnerPosition = right.findIndex((item) => item.id === partner.id) + 1;
    if (!keyed) {
      issues.push(`The answer key for "${name}" is missing.`);
    } else {
      if (keyed.answerText !== expected) {
        issues.push(`The answer key for "${name}" must say "${expected}".`);
      }
      if (keyed.answer !== partnerPosition) {
        issues.push(`The answer key for "${name}" does not point to its printed ${expected} card.`);
      }
    }
  }
  return issues;
}

type ComposedMatchEntry = {
  id: string;
  targetId?: string;
  object?: { asset: VisualAssetKey };
};

/** The same invariant for the component-composer representation. */
export function composedShapeMatchIssues(
  left: readonly ComposedMatchEntry[],
  right: readonly ComposedMatchEntry[],
  answerKey: readonly { groupId: string; answer?: number; answerText?: string }[] = [],
): string[] {
  const issues: string[] = [];
  for (const entry of left) {
    const object = entry.object?.asset;
    const expected = object ? shapeOfObject[object] : undefined;
    const target = right.find((candidate) => candidate.id === entry.targetId);
    const keyed = answerKey.find((answer) => answer.groupId === entry.id);
    const targetPosition = target ? right.indexOf(target) + 1 : 0;
    if (!object || !expected) {
      issues.push(`${object ?? entry.id}: no approved preschool shape association.`);
      continue;
    }
    if (!isVisuallyCorrectShapeMatch(object, expected)) {
      issues.push(
        `${object}: rendered illustration variant is not visually approved as a ${expected}.`,
      );
      continue;
    }
    if (target?.object?.asset !== expected) {
      issues.push(`${object}: target is not its approved ${expected} shape.`);
    }
    if (!keyed || keyed.answerText !== expected || keyed.answer !== targetPosition) {
      issues.push(
        `${object}: Preview Key does not derive from the approved ${expected} association.`,
      );
    }
  }
  return issues;
}

type SortItem = { id: string; asset: VisualAssetKey };
type SortBin = { id: string; label: string; members?: readonly VisualAssetKey[] };

/**
 * SEMANTIC INVARIANT — category sorting.
 *
 * The rendered items, the bins and the answer key must all derive from one
 * canonical item list: every picture belongs to exactly one labelled box, no
 * picture is repeated to pad a count, and each box's stored total equals the
 * number of pictures actually drawn for it.
 */
export function categorySortIssues(
  bins: readonly SortBin[],
  items: readonly SortItem[],
  answerKey: readonly { groupId: string; answer: number }[] = [],
  expected?: { total?: number | undefined; perBin?: Record<string, number> | undefined },
): string[] {
  const issues: string[] = [];
  const scoped = bins.filter((bin) => bin.members?.length);
  if (!scoped.length) return issues;

  const seen = new Set<VisualAssetKey>();
  for (const item of items) {
    const owners = scoped.filter((bin) => bin.members!.includes(item.asset));
    const name = visualObjects[item.asset]?.singular ?? item.asset;
    if (owners.length === 0) issues.push(`"${name}" does not belong in any of the labelled boxes.`);
    if (owners.length > 1)
      issues.push(`"${name}" fits more than one box, so the sort has no single answer.`);
    if (seen.has(item.asset))
      issues.push(`"${name}" is drawn twice; each picture must be sorted once.`);
    seen.add(item.asset);
  }

  for (const bin of scoped) {
    const rendered = items.filter((item) => bin.members!.includes(item.asset)).length;
    const keyed = answerKey.find((entry) => entry.groupId === bin.id);
    if (keyed && keyed.answer !== rendered) {
      issues.push(
        `"${bin.label}" says ${keyed.answer} pictures but ${rendered} are drawn on the page.`,
      );
    }
    const want = expected?.perBin?.[bin.label.toLowerCase()];
    if (want !== undefined && rendered !== want) {
      issues.push(
        `"${bin.label}" must contain exactly ${want} pictures, but ${rendered} are drawn.`,
      );
    }
  }

  if (expected?.total !== undefined && items.length !== expected.total) {
    issues.push(
      `The page must show exactly ${expected.total} pictures to sort, but ${items.length} are drawn.`,
    );
  }
  return issues;
}

export type EverydayCategory = {
  id: string;
  /** how the sorting box is labelled for a young child */
  label: string;
  members: VisualAssetKey[];
  alias: RegExp;
  /** exact number of pictures requested for this category, when stated */
  count?: number;
};

/** Everyday categories a preschooler can sort by meaning, not by looks. */
export const everydayCategories: EverydayCategory[] = [
  {
    id: "food",
    label: "Things We Eat",
    members: ["apple", "banana", "carrot", "egg"],
    alias: /things we eat|\bfood\b|\beat\b|edible|fruits?|vegetables?/i,
  },
  {
    id: "toys",
    label: "Things We Play With",
    members: ["ball", "balloon", "bicycle", "boat"],
    alias: /things we play|\btoys?\b|\bplay(ing)? with\b/i,
  },
  {
    id: "vehicles",
    label: "Things That Go",
    members: ["car", "bus", "train", "airplane", "bicycle", "boat"],
    alias: /things that go|vehicles?|transport|\bride\b/i,
  },
  {
    id: "animals",
    label: "Animals",
    members: ["cow", "sheep", "pig", "chicken", "cat", "bird", "frog", "fish"],
    alias: /\banimals?\b|living things/i,
  },
  {
    id: "nature",
    label: "Things Outside",
    members: ["tree", "flower", "leaf", "cloud", "sun"],
    alias: /\bnature\b|things outside|outdoors?|\bplants?\b/i,
  },
];

function renderable(members: VisualAssetKey[]) {
  return members.filter((member) => member in visualObjects);
}

const WORD_NUMBERS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};

/** A count written just before a phrase, e.g. "4 food items", "four toys". */
function countBefore(text: string, index: number): number | undefined {
  const prefix = text.slice(Math.max(0, index - 24), index);
  const match =
    /(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:[a-z-]+\s+){0,2}$/i.exec(
      prefix,
    );
  if (!match?.[1]) return undefined;
  const raw = match[1].toLowerCase();
  const value = /^\d+$/.test(raw) ? Number(raw) : WORD_NUMBERS[raw];
  return value && value > 0 && value <= 12 ? value : undefined;
}

/** Total number of sortable pictures the instruction asks for, when stated. */
export function requestedItemCount(text: string): number | undefined {
  const match =
    /(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten)\s+(pictures?|items?|objects?|cards?|things)\b/i.exec(
      text,
    );
  if (!match?.[1]) return undefined;
  const raw = match[1].toLowerCase();
  const value = /^\d+$/.test(raw) ? Number(raw) : WORD_NUMBERS[raw];
  return value && value > 0 && value <= 16 ? value : undefined;
}

/**
 * The everyday categories a page instruction names, in written order, each
 * carrying the exact number of pictures the teacher asked for when they said
 * one ("4 food items and 4 things we play with").
 */
export function categoriesInText(text: string): EverydayCategory[] {
  const found: Array<{ index: number; category: EverydayCategory }> = [];
  for (const category of everydayCategories) {
    const match = category.alias.exec(text);
    if (!match) continue;
    const members = renderable(category.members);
    const count = countBefore(text, match.index);
    if (members.length >= 3) {
      found.push({
        index: match.index,
        category: { ...category, members, ...(count ? { count } : {}) },
      });
    }
  }
  return found.sort((a, b) => a.index - b.index).map((entry) => entry.category);
}

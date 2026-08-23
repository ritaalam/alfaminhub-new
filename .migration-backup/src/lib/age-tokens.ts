/**
 * Age-based design tokens.
 *
 * These are renderer-level rules, not theme-level ones: any activity type and
 * any visual theme (insects, fruit, shapes…) reads the same tokens so a future
 * AI-generated worksheet automatically respects preschool ergonomics.
 */

export type AgeDesignTokens = {
  id: string;
  label: string;
  /** illustration artboard size in px (1mm ≈ 3.78px at print scale) */
  objectSize: number;
  /** gap between individual objects inside one group, in mm */
  objectGapMm: number;
  /** max objects drawn on one visual line before wrapping */
  maxObjectsPerLine: number;
  /** how many activity items (groups / rows) belong on one page */
  itemsPerPage: number;
  /** answer options offered where a choice is required */
  answerChoices: number;
  /** highest quantity allowed for this age, before difficulty narrows it */
  maxQuantity: number;
  /** diameter of a large number card, in mm */
  numberCardMm: number;
  /** diameter of a circle-the-answer card, in mm */
  choiceCardMm: number;
  /** page title size, in mm */
  titleMm: number;
  /** instruction size, in mm */
  instructionMm: number;
  /** vertical gap between activity blocks, in mm */
  blockGapMm: number;
};

export const ageTokenPresets: Record<string, AgeDesignTokens> = {
  "toddler-2-3": {
    id: "toddler-2-3",
    label: "Ages 2–3",
    objectSize: 190,
    objectGapMm: 10,
    maxObjectsPerLine: 3,
    itemsPerPage: 3,
    answerChoices: 2,
    maxQuantity: 3,
    numberCardMm: 38,
    choiceCardMm: 32,
    titleMm: 10.5,
    instructionMm: 4.8,
    blockGapMm: 9,
  },
  "nursery-3-4": {
    id: "nursery-3-4",
    label: "Ages 3–4",
    objectSize: 165,
    objectGapMm: 8,
    maxObjectsPerLine: 4,
    itemsPerPage: 4,
    answerChoices: 2,
    maxQuantity: 5,
    numberCardMm: 34,
    choiceCardMm: 29,
    titleMm: 10,
    instructionMm: 4.6,
    blockGapMm: 8,
  },
  "preschool-4-5": {
    id: "preschool-4-5",
    label: "Ages 4–5",
    objectSize: 140,
    objectGapMm: 6,
    maxObjectsPerLine: 5,
    itemsPerPage: 4,
    answerChoices: 3,
    maxQuantity: 10,
    numberCardMm: 30,
    choiceCardMm: 25,
    titleMm: 9.5,
    instructionMm: 4.3,
    blockGapMm: 7,
  },
  kindergarten: {
    id: "kindergarten",
    label: "Kindergarten",
    objectSize: 110,
    objectGapMm: 4.5,
    maxObjectsPerLine: 6,
    itemsPerPage: 6,
    answerChoices: 3,
    maxQuantity: 10,
    numberCardMm: 26,
    choiceCardMm: 22,
    titleMm: 9,
    instructionMm: 4.1,
    blockGapMm: 6,
  },
  school: {
    id: "school",
    label: "Grade 1+",
    objectSize: 90,
    objectGapMm: 3.5,
    maxObjectsPerLine: 8,
    itemsPerPage: 7,
    answerChoices: 4,
    maxQuantity: 20,
    numberCardMm: 23,
    choiceCardMm: 19,
    titleMm: 8.5,
    instructionMm: 4,
    blockGapMm: 5,
  },
};

/** Maps any level label (including custom text) onto a token preset. */
export function resolveAgeTokens(level: string): AgeDesignTokens {
  const v = level.toLowerCase();
  if (/(^|\D)2\s*[–-]\s*3|age 2|toddler/.test(v)) return ageTokenPresets["toddler-2-3"]!;
  if (/(^|\D)3\s*[–-]\s*4|nursery/.test(v)) return ageTokenPresets["nursery-3-4"]!;
  if (/(^|\D)4\s*[–-]\s*5|pre-?k|preschool/.test(v)) return ageTokenPresets["preschool-4-5"]!;
  if (/kinder|reception|(^|\D)5\s*[–-]\s*6/.test(v)) return ageTokenPresets["kindergarten"]!;
  if (/grade|year|class|primary|elementary/.test(v)) return ageTokenPresets["school"]!;
  return ageTokenPresets["preschool-4-5"]!;
}

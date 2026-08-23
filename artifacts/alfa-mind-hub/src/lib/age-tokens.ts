/**
 * Developmental profiles used by every printable builder.
 *
 * A level is not display metadata: it constrains the cognitive action,
 * quantity range, visual load, reading support and writing independence of
 * the final sheet.
 */

import type { WorksheetMechanicId } from "./worksheet-model";

export type WritingDemand = "none" | "guided" | "emerging" | "independent";
export type VisualScaffolding = "high" | "medium" | "low";

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
  /** highest concrete quantity that can be shown on the page */
  maxQuantity: number;
  /** quantity bands used when the teacher did not request an exact range */
  difficultyRanges: Record<string, [number, number]>;
  /** largest number of non-target visual distractors on a search page */
  distractorCount: number;
  /** maximum child actions stated in an instruction */
  instructionSteps: 1 | 2 | 3;
  /** amount of picture/pointing support retained in the printed directions */
  visualScaffolding: VisualScaffolding;
  /** whether the activity asks for tracing or independent written output */
  writingDemand: WritingDemand;
  /** blank spaces offered after a model for a writing activity */
  independentWritingSlots: number;
  /** mechanics appropriate for general maths/thinking packs */
  allowedMechanics: WorksheetMechanicId[];
  /** mechanics appropriate when the prompt is literacy-focused */
  literacyMechanics: WorksheetMechanicId[];
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

const earlyMath: WorksheetMechanicId[] = ["count-match", "count-circle", "same-different"];
const visualThinking: WorksheetMechanicId[] = ["find-target", "match-pairs", "trace-draw"];
const preschoolMath: WorksheetMechanicId[] = [
  "count-match",
  "count-circle",
  "pattern-complete",
  "find-and-count",
  "sort-attribute",
  "compare-quantity",
  "same-different",
  "compare-size",
];
const kindergartenMath: WorksheetMechanicId[] = [
  ...preschoolMath,
  "sequence-order",
  "beginning-sound",
];
const schoolMath: WorksheetMechanicId[] = [
  "compare-quantity",
  "pattern-complete",
  "sequence-order",
  "sort-attribute",
  "find-and-count",
  "count-circle",
  "count-match",
  "same-different",
];
const earlyLiteracy: WorksheetMechanicId[] = ["letter-recognition", "letter-trace"];
const developingLiteracy: WorksheetMechanicId[] = [
  "letter-recognition",
  "letter-trace",
  "beginning-sound",
  "picture-letter-match",
  "beginning-sound-discrimination",
];
const schoolLiteracy: WorksheetMechanicId[] = [
  ...developingLiteracy,
  "letter-sort",
  "word-initial-complete",
  "letter-write",
];

const bands = (
  veryEasy: [number, number],
  easy: [number, number],
  standard: [number, number],
  challenge: [number, number],
) => ({ "Very Easy": veryEasy, Easy: easy, Standard: standard, Challenge: challenge });

export const ageTokenPresets: Record<string, AgeDesignTokens> = {
  "toddler-2-3": {
    id: "toddler-2-3", label: "Ages 2–3", objectSize: 190, objectGapMm: 10, maxObjectsPerLine: 3,
    itemsPerPage: 3, answerChoices: 2, maxQuantity: 3, difficultyRanges: bands([1, 2], [1, 3], [1, 3], [2, 3]),
    distractorCount: 1, instructionSteps: 1, visualScaffolding: "high", writingDemand: "none",
    independentWritingSlots: 0, allowedMechanics: earlyMath, literacyMechanics: earlyLiteracy,
    numberCardMm: 38, choiceCardMm: 32, titleMm: 10.5, instructionMm: 4.8, blockGapMm: 9,
  },
  "nursery-3-4": {
    id: "nursery-3-4", label: "Ages 3–4", objectSize: 165, objectGapMm: 8, maxObjectsPerLine: 4,
    itemsPerPage: 4, answerChoices: 2, maxQuantity: 5, difficultyRanges: bands([1, 3], [1, 4], [2, 5], [3, 5]),
    distractorCount: 2, instructionSteps: 1, visualScaffolding: "high", writingDemand: "guided",
    independentWritingSlots: 1, allowedMechanics: [...earlyMath, "find-and-count", "sort-attribute", "compare-size"],
    literacyMechanics: earlyLiteracy, numberCardMm: 34, choiceCardMm: 29, titleMm: 10, instructionMm: 4.6, blockGapMm: 8,
  },
  "preschool-4-5": {
    id: "preschool-4-5", label: "Ages 4–5", objectSize: 140, objectGapMm: 6, maxObjectsPerLine: 5,
    itemsPerPage: 4, answerChoices: 3, maxQuantity: 10, difficultyRanges: bands([1, 4], [1, 6], [2, 8], [4, 10]),
    distractorCount: 3, instructionSteps: 2, visualScaffolding: "high", writingDemand: "guided",
    independentWritingSlots: 2, allowedMechanics: [...preschoolMath, "sequence-order", ...visualThinking],
    literacyMechanics: developingLiteracy, numberCardMm: 30, choiceCardMm: 25, titleMm: 9.5, instructionMm: 4.3, blockGapMm: 7,
  },
  preschool: {
    id: "preschool", label: "Preschool", objectSize: 130, objectGapMm: 5.5, maxObjectsPerLine: 5,
    itemsPerPage: 5, answerChoices: 3, maxQuantity: 10, difficultyRanges: bands([1, 4], [1, 7], [3, 9], [5, 10]),
    distractorCount: 3, instructionSteps: 2, visualScaffolding: "medium", writingDemand: "emerging",
    independentWritingSlots: 2, allowedMechanics: [...preschoolMath, "sequence-order", ...visualThinking],
    literacyMechanics: developingLiteracy, numberCardMm: 28, choiceCardMm: 24, titleMm: 9.3, instructionMm: 4.2, blockGapMm: 6.5,
  },
  "pre-k": {
    id: "pre-k", label: "Pre-K", objectSize: 120, objectGapMm: 5, maxObjectsPerLine: 6,
    itemsPerPage: 5, answerChoices: 3, maxQuantity: 12, difficultyRanges: bands([1, 5], [2, 8], [4, 10], [6, 12]),
    distractorCount: 4, instructionSteps: 2, visualScaffolding: "medium", writingDemand: "emerging",
    independentWritingSlots: 3, allowedMechanics: [...kindergartenMath, "number-write", ...visualThinking],
    literacyMechanics: developingLiteracy, numberCardMm: 27, choiceCardMm: 23, titleMm: 9.1, instructionMm: 4.15, blockGapMm: 6.2,
  },
  kindergarten: {
    id: "kindergarten", label: "Kindergarten", objectSize: 110, objectGapMm: 4.5, maxObjectsPerLine: 6,
    itemsPerPage: 6, answerChoices: 3, maxQuantity: 15, difficultyRanges: bands([1, 5], [2, 10], [5, 12], [8, 15]),
    distractorCount: 4, instructionSteps: 2, visualScaffolding: "medium", writingDemand: "emerging",
    independentWritingSlots: 3, allowedMechanics: [...kindergartenMath, "number-write", ...visualThinking],
    literacyMechanics: [...developingLiteracy, "letter-sort"], numberCardMm: 26, choiceCardMm: 22, titleMm: 9, instructionMm: 4.1, blockGapMm: 6,
  },
  "grade-1": {
    id: "grade-1", label: "Grade 1", objectSize: 100, objectGapMm: 4, maxObjectsPerLine: 7,
    itemsPerPage: 6, answerChoices: 3, maxQuantity: 20, difficultyRanges: bands([1, 10], [5, 15], [8, 20], [12, 20]),
    distractorCount: 4, instructionSteps: 2, visualScaffolding: "medium", writingDemand: "emerging",
    independentWritingSlots: 4, allowedMechanics: [...schoolMath, "number-write", ...visualThinking],
    literacyMechanics: schoolLiteracy, numberCardMm: 25, choiceCardMm: 21, titleMm: 8.8, instructionMm: 4.05, blockGapMm: 5.7,
  },
  "grade-2": {
    id: "grade-2", label: "Grade 2", objectSize: 94, objectGapMm: 3.8, maxObjectsPerLine: 8,
    itemsPerPage: 7, answerChoices: 4, maxQuantity: 20, difficultyRanges: bands([5, 12], [8, 16], [10, 20], [14, 20]),
    distractorCount: 5, instructionSteps: 2, visualScaffolding: "medium", writingDemand: "independent",
    independentWritingSlots: 4, allowedMechanics: [...schoolMath, "number-write", ...visualThinking],
    literacyMechanics: schoolLiteracy, numberCardMm: 24, choiceCardMm: 20, titleMm: 8.7, instructionMm: 4, blockGapMm: 5.5,
  },
  "grade-3": {
    id: "grade-3", label: "Grade 3", objectSize: 90, objectGapMm: 3.5, maxObjectsPerLine: 8,
    itemsPerPage: 7, answerChoices: 4, maxQuantity: 20, difficultyRanges: bands([8, 14], [10, 18], [12, 20], [15, 20]),
    distractorCount: 5, instructionSteps: 3, visualScaffolding: "low", writingDemand: "independent",
    independentWritingSlots: 5, allowedMechanics: [...schoolMath, "number-write", ...visualThinking],
    literacyMechanics: schoolLiteracy, numberCardMm: 23, choiceCardMm: 19, titleMm: 8.6, instructionMm: 4, blockGapMm: 5.3,
  },
  "grade-4": {
    id: "grade-4", label: "Grade 4", objectSize: 84, objectGapMm: 3.2, maxObjectsPerLine: 8,
    itemsPerPage: 8, answerChoices: 4, maxQuantity: 20, difficultyRanges: bands([10, 15], [12, 18], [14, 20], [16, 20]),
    distractorCount: 6, instructionSteps: 3, visualScaffolding: "low", writingDemand: "independent",
    independentWritingSlots: 5, allowedMechanics: [
      "pattern-complete", "sequence-order", "compare-quantity", "sort-attribute",
      "find-and-count", "count-circle", "count-match", "same-different", "compare-size", "number-write",
      ...visualThinking,
    ],
    literacyMechanics: schoolLiteracy, numberCardMm: 22, choiceCardMm: 18, titleMm: 8.5, instructionMm: 3.95, blockGapMm: 5,
  },
  "grade-5": {
    id: "grade-5", label: "Grade 5", objectSize: 80, objectGapMm: 3, maxObjectsPerLine: 8,
    itemsPerPage: 8, answerChoices: 4, maxQuantity: 20, difficultyRanges: bands([12, 16], [14, 19], [16, 20], [17, 20]),
    distractorCount: 6, instructionSteps: 3, visualScaffolding: "low", writingDemand: "independent",
    independentWritingSlots: 6, allowedMechanics: [
      "sequence-order", "compare-quantity", "pattern-complete", "sort-attribute",
      "find-and-count", "count-circle", "count-match", "same-different", "compare-size", "number-write",
      ...visualThinking,
    ],
    literacyMechanics: schoolLiteracy, numberCardMm: 22, choiceCardMm: 18, titleMm: 8.5, instructionMm: 3.9, blockGapMm: 4.9,
  },
  "grade-6": {
    id: "grade-6", label: "Grade 6", objectSize: 76, objectGapMm: 2.8, maxObjectsPerLine: 8,
    itemsPerPage: 8, answerChoices: 4, maxQuantity: 20, difficultyRanges: bands([14, 17], [15, 19], [17, 20], [18, 20]),
    distractorCount: 7, instructionSteps: 3, visualScaffolding: "low", writingDemand: "independent",
    independentWritingSlots: 6, allowedMechanics: [
      "sequence-order", "pattern-complete", "compare-quantity", "sort-attribute",
      "find-and-count", "count-circle", "count-match", "same-different", "compare-size", "number-write",
      ...visualThinking,
    ],
    literacyMechanics: schoolLiteracy, numberCardMm: 21, choiceCardMm: 18, titleMm: 8.4, instructionMm: 3.9, blockGapMm: 4.8,
  },
  custom: {
    id: "custom", label: "Custom level", objectSize: 120, objectGapMm: 5, maxObjectsPerLine: 6,
    itemsPerPage: 5, answerChoices: 3, maxQuantity: 12, difficultyRanges: bands([1, 4], [2, 7], [4, 10], [6, 12]),
    distractorCount: 3, instructionSteps: 2, visualScaffolding: "medium", writingDemand: "emerging",
    independentWritingSlots: 3, allowedMechanics: [...kindergartenMath, "number-write", ...visualThinking],
    literacyMechanics: developingLiteracy, numberCardMm: 27, choiceCardMm: 23, titleMm: 9.1, instructionMm: 4.2, blockGapMm: 6.2,
  },
};

/** Maps creator labels (and genuinely unknown custom entries) to a full profile. */
export function resolveAgeTokens(level: string): AgeDesignTokens {
  const value = (level ?? "").trim().toLowerCase();
  if (/(^|\D)2\s*[–-]\s*3|age 2|toddler/.test(value)) return ageTokenPresets["toddler-2-3"]!;
  if (/(^|\D)3\s*[–-]\s*4|nursery/.test(value)) return ageTokenPresets["nursery-3-4"]!;
  if (/(^|\D)4\s*[–-]\s*5/.test(value)) return ageTokenPresets["preschool-4-5"]!;
  if (/^preschool\b/.test(value)) return ageTokenPresets.preschool!;
  if (/pre[\s-]?k/.test(value)) return ageTokenPresets["pre-k"]!;
  if (/kinder|reception|(^|\D)5\s*[–-]\s*6/.test(value)) return ageTokenPresets.kindergarten!;
  const grade = value.match(/\b(?:grade|year|class)\s*([1-6])\b|(?:first|second|third|fourth|fifth|sixth)\s+grade/);
  const namedGrade = /first/.test(value) ? "1" : /second/.test(value) ? "2" : /third/.test(value) ? "3" : /fourth/.test(value) ? "4" : /fifth/.test(value) ? "5" : /sixth/.test(value) ? "6" : grade?.[1];
  if (namedGrade) return ageTokenPresets[`grade-${namedGrade}`]!;
  return ageTokenPresets.custom!;
}
/**
 * Phonics vocabulary.
 *
 * Literacy pages must never invent words: every picture used for a letter or a
 * beginning sound comes from this table, where the drawn asset and the spoken
 * word are guaranteed to agree (a /b/ page draws a ball, a bee, a book — never
 * a butterfly on an /f/ page).
 */

import type { VisualAssetKey } from "./semantic-topics";

export type PhonicsWord = { word: string; asset: VisualAssetKey };

export const phonicsWords: Record<string, PhonicsWord[]> = {
  a: [
    { word: "apple", asset: "apple" },
    { word: "ant", asset: "ant" },
    { word: "acorn", asset: "acorn" },
    { word: "airplane", asset: "airplane" },
    { word: "astronaut", asset: "astronaut" },
  ],
  b: [
    { word: "ball", asset: "ball" },
    { word: "bee", asset: "bee" },
    { word: "book", asset: "book" },
    { word: "bus", asset: "bus" },
    { word: "bird", asset: "bird" },
    { word: "boat", asset: "boat" },
    { word: "balloon", asset: "balloon" },
    { word: "butterfly", asset: "butterfly" },
    { word: "banana", asset: "banana" },
    { word: "bear", asset: "bear" },
  ],
  c: [
    { word: "cat", asset: "cat" },
    { word: "car", asset: "car" },
    { word: "cow", asset: "cow" },
    { word: "crab", asset: "crab" },
    { word: "carrot", asset: "carrot" },
    { word: "cloud", asset: "cloud" },
    { word: "caterpillar", asset: "caterpillar" },
  ],
  d: [
    { word: "dragonfly", asset: "dragonfly" },
    { word: "dinosaur", asset: "dinosaur" },
  ],
  e: [
    { word: "egg", asset: "egg" },
    { word: "elephant", asset: "elephant" },
  ],
  f: [
    { word: "fish", asset: "fish" },
    { word: "flower", asset: "flower" },
    { word: "frog", asset: "frog" },
  ],
  h: [{ word: "heart", asset: "heart" }],
  l: [
    { word: "ladybug", asset: "ladybug" },
    { word: "leaf", asset: "leaf" },
    { word: "lion", asset: "lion" },
  ],
  m: [
    { word: "moon", asset: "moon" },
    { word: "monkey", asset: "monkey" },
    { word: "mushroom", asset: "mushroom" },
  ],
  o: [{ word: "octopus", asset: "octopus" }],
  p: [
    { word: "pig", asset: "pig" },
    { word: "planet", asset: "planet" },
    { word: "pencil", asset: "pencil" },
  ],
  r: [
    { word: "rocket", asset: "rocket" },
    { word: "raindrop", asset: "raindrop" },
  ],
  s: [
    { word: "star", asset: "star" },
    { word: "sun", asset: "sun" },
    { word: "snail", asset: "snail" },
    { word: "sheep", asset: "sheep" },
    { word: "shell", asset: "shell" },
    { word: "snowflake", asset: "snowflake" },
  ],
  t: [
    { word: "tree", asset: "tree" },
    { word: "train", asset: "train" },
    { word: "tractor", asset: "tractor" },
    { word: "turtle", asset: "turtle" },
  ],
  u: [{ word: "umbrella", asset: "umbrella" }],
  w: [
    { word: "whale", asset: "whale" },
    { word: "window", asset: "window" },
  ],
};

/** Letters this app can illustrate with real pictures. */
export const illustratedLetters = Object.keys(phonicsWords).filter(
  (letter) =>
    (phonicsWords[letter] ?? []).filter((entry) => isPhoneticallyClear(entry.word)).length >= 2,
);

/**
 * PHONETIC CLARITY (Ages 4–5)
 * ---------------------------
 * A beginning-sound page may only use words whose FIRST SOUND is the plain
 * sound of its first letter. Digraph onsets ("sheep", "shell", "chair",
 * "whale", "thumb", "phone") and soft c/g ("circle", "giraffe") are ambiguous
 * for a four-year-old and are never printed as beginning-sound vocabulary.
 * "wh" is the exception: "whale" is simply /w/ for an English preschooler.
 */

export function isPhoneticallyClear(word: string): boolean {
  const clean = word.trim().toLowerCase();
  if (!clean) return false;
  if (/^(sh|ch|th|ph|qu|kn|wr)/.test(clean)) return false;
  if (/^c[eiy]/.test(clean)) return false; // soft c
  if (/^g[eiy]/.test(clean)) return false; // soft g
  if (/^x/.test(clean)) return false;
  return true;
}

export function wordsForLetter(letter: string): PhonicsWord[] {
  return (phonicsWords[letter.toLowerCase()] ?? []).filter((entry) =>
    isPhoneticallyClear(entry.word),
  );
}

export function hasPictures(letter: string) {
  return wordsForLetter(letter).length >= 2;
}

/** Letters that contrast clearly with the target letter (different sounds). */
export function contrastLetters(letter: string, count = 3): string[] {
  const target = letter.toLowerCase();
  return illustratedLetters.filter((l) => l !== target).slice(0, Math.max(1, count));
}

/** Distractor pictures whose word starts with a DIFFERENT letter. */
/** Short, unambiguous words a 4-year-old recognises instantly. */
const simpleDistractors: PhonicsWord[] = [
  { word: "cat", asset: "cat" },
  { word: "sun", asset: "sun" },
  { word: "fish", asset: "fish" },
  { word: "apple", asset: "apple" },
  { word: "moon", asset: "moon" },
  { word: "star", asset: "star" },
  { word: "tree", asset: "tree" },
  { word: "car", asset: "car" },
];

export function contrastWords(letter: string, count = 4): PhonicsWord[] {
  const target = letter.toLowerCase();
  const pool: PhonicsWord[] = simpleDistractors.filter(
    (w) => w.word.charAt(0).toLowerCase() !== target,
  );
  for (const l of illustratedLetters) {
    if (l === target) continue;
    const first = wordsForLetter(l)[0];
    if (first && !pool.some((w) => w.word === first.word)) pool.push(first);
  }
  return pool.slice(0, count);
}

/**
 * A mixed picture set for BEGINNING-SOUND DISCRIMINATION.
 *
 * Half the pictures start with the target sound, half deliberately do not.
 * Every item carries the sound it starts with, so the answer is derived from
 * the vocabulary itself and never from the order pictures happen to appear in.
 */
export type SoundSetItem = PhonicsWord & { initialPhoneme: string; isTarget: boolean };

export function phonemeOf(word: string) {
  return `/${word.trim().charAt(0).toLowerCase()}/`;
}

export function soundDiscriminationSet(
  letter: string,
  targets = 4,
  distractors = 4,
): SoundSetItem[] {
  const target = letter.toLowerCase();
  const wanted = wordsForLetter(target).slice(0, Math.max(2, targets));
  const others = contrastWords(target, Math.max(2, distractors));
  return [
    ...wanted.map((w) => ({ ...w, initialPhoneme: phonemeOf(w.word), isTarget: true })),
    ...others.map((w) => ({ ...w, initialPhoneme: phonemeOf(w.word), isTarget: false })),
  ];
}

export function upper(letter: string) {
  return letter.toUpperCase();
}

export function lower(letter: string) {
  return letter.toLowerCase();
}

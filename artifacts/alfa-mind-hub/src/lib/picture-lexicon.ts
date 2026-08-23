/**
 * PICTURE LEXICON — the single source of truth for "what is this picture
 * called, and what letter/sound does that word begin with?".
 *
 * Beginning-sound work is only valid when the answer is derived FROM the
 * drawing a child actually sees. Every phonics mechanic therefore resolves:
 *
 *      illustration (asset)  ->  canonical vocabulary word  ->  initial letter
 *
 * and never the other way round. A picture whose word cannot be resolved
 * confidently is replaced rather than guessed at, and theme nicknames are not
 * allowed to rename artwork into a different beginning sound (a rocket drawing
 * is "rocket" /r/, never "spaceship" /s/).
 */

import { visualObjects, type VisualAssetKey } from "./semantic-topics";

/** Words a child would plausibly say for the artwork, primary name first. */
const canonicalWords: Partial<Record<VisualAssetKey, string>> = {
  // artwork whose canonical name differs from the asset key, or that is
  // commonly mis-labelled by generators
  airplane: "airplane",
  starfish: "starfish",
  raindrop: "raindrop",
  snowflake: "snowflake",
  rocket: "rocket",
};

/** The canonical vocabulary word for an illustration, or undefined if unknown. */
export function pictureWord(asset: string | undefined): string | undefined {
  if (!asset) return undefined;
  const key = asset as VisualAssetKey;
  const word = canonicalWords[key] ?? visualObjects[key]?.singular;
  if (!word) return undefined;
  const clean = word.trim().toLowerCase();
  return /^[a-z][a-z '-]*$/.test(clean) ? clean : undefined;
}

/** True when the picture has one confident, sayable name. */
export function isConfidentPicture(asset: string | undefined): boolean {
  return Boolean(pictureWord(asset));
}

/** Uppercase beginning letter of the word the picture represents. */
export function pictureInitial(asset: string | undefined): string | undefined {
  return pictureWord(asset)?.charAt(0).toUpperCase();
}

/** The /x/ style beginning phoneme for the picture. */
export function picturePhoneme(asset: string | undefined): string | undefined {
  const letter = pictureWord(asset)?.charAt(0);
  return letter ? `/${letter}/` : undefined;
}

/** Does this picture's own name begin with the taught letter? */
export function pictureBeginsWith(asset: string | undefined, letter: string) {
  const initial = pictureInitial(asset);
  return Boolean(initial && letter && initial === letter.trim().charAt(0).toUpperCase());
}

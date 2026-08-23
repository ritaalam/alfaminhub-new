/**
 * Literacy / phonics page builders.
 *
 * A phonics request never falls back to counting: these builders produce real
 * letter work — letter recognition, letter formation (tracing), beginning
 * sounds and first-letter sorting — using only vocabulary from
 * `phonics-vocabulary`, so every picture and every word agree.
 */

import { resolveAgeTokens } from "./age-tokens";
import { characterForAsset } from "./alfa-characters";
import {
  directionForTheme,
  resolveIllustrationStyle,
  resolveVisualDirection,
  type IllustrationPurpose,
} from "./visual-directions";
import { letterForSpec } from "./learning-domains";
import {
  contrastLetters,
  contrastWords,
  phonemeOf,
  lower,
  upper,
  wordsForLetter,
  type PhonicsWord,
} from "./phonics-vocabulary";
import type { WorksheetSpec } from "./creator-options";
import type { BuildContext } from "./worksheet-mechanics";
import type {
  LetterGlyph,
  PickOption,
  PickRow,
  RenderedCountObject,
  WorksheetPageModel,
} from "./worksheet-model";

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

function shuffle<T>(items: T[], next: () => number) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

function styleFor(spec: WorksheetSpec, purpose: IllustrationPurpose) {
  return resolveIllustrationStyle({
    direction: resolveVisualDirection(directionForTheme(spec.theme, spec.inspiration)),
    purpose,
    ageId: resolveAgeTokens(spec.level).id,
  });
}

function picture(id: string, word: PhonicsWord): RenderedCountObject {
  const character = characterForAsset(word.asset);
  return {
    id,
    asset: word.asset,
    label: word.word,
    ...(character ? { character } : {}),
  };
}

function shell(ctx: BuildContext, title: string, instruction: string) {
  return {
    id: "page-1",
    title,
    instruction,
    activityType: ctx.profile.activityLabel,
    ...(ctx.semanticRequirements ? { semanticRequirements: ctx.semanticRequirements } : {}),
    purpose: "counting" as IllustrationPurpose,
    illustrationStyle: styleFor(ctx.spec, "counting"),
    layout: "stacked-rows" as const,
  };
}

/* ------------------------------------------------------- letter recognition */

export function buildLetterRecognitionPage(ctx: BuildContext): WorksheetPageModel {
  const next = rng(ctx.seed + 4111);
  const tokens = resolveAgeTokens(ctx.spec.level);
  const letter = letterForSpec(ctx.spec);
  const L = upper(letter);
  const l = lower(letter);
  const others = contrastLetters(letter, 6).map((c) => c.toUpperCase());
  const rowCount = Math.max(3, Math.min(4, tokens.itemsPerPage - 1));
  const perRow = tokens.maxObjectsPerLine >= 5 ? 6 : 5;

  const rows = Array.from({ length: rowCount }, (_, r) => {
    const id = `p1-hunt${r + 1}`;
    const targets = 2 + (r % 2);
    const glyphs: LetterGlyph[] = [];
    for (let i = 0; i < targets; i++) {
      glyphs.push({ id: `${id}-t${i + 1}`, glyph: i % 2 === 0 ? L : l, isTarget: true });
    }
    for (let i = glyphs.length; i < perRow; i++) {
      const other = others[(r + i) % Math.max(1, others.length)] ?? "S";
      glyphs.push({ id: `${id}-d${i + 1}`, glyph: other, isTarget: false });
    }
    return { id, glyphs: shuffle(glyphs, next) };
  });

  return {
    ...shell(ctx, `Find the Letter ${L}`, `Circle every letter ${L} and ${l} you can find.`),
    activity: {
      kind: "letter-search",
      mechanic: "letter-recognition",
      targetLetter: L,
      rows,
      challenge: `Say the sound of ${L} out loud each time you circle it.`,
    },
    answerKey: rows.map((row) => ({
      groupId: row.id,
      answer: row.glyphs.filter((g) => g.isTarget).length,
      answerText: row.glyphs
        .filter((g) => g.isTarget)
        .map((g) => g.glyph)
        .join(" "),
    })),
    footerNote: `Big ${L} and little ${l} are the same letter.`,
  } as WorksheetPageModel;
}

/* ------------------------------------------------------------- letter trace */

/**
 * CONTENT VARIETY — two pages of a pack that both draw picture words for the
 * same letter should not print the identical three pictures. The seed rotates
 * the window into the letter's vocabulary.
 */
function pictureWordsFor(letter: string, seed: number, count = 3) {
  const pool = wordsForLetter(letter);
  if (pool.length <= count) return pool;
  const offset = Math.abs(seed) % pool.length;
  return Array.from({ length: count }, (_unused, i) => pool[(offset + i) % pool.length]!);
}

export function buildLetterTracePage(ctx: BuildContext): WorksheetPageModel {
  const letter = letterForSpec(ctx.spec);
  const L = upper(letter);
  const l = lower(letter);
  const tokens = resolveAgeTokens(ctx.spec.level);
  const repeats = tokens.maxObjectsPerLine >= 5 ? 5 : 4;
  const independent = tokens.writingDemand === "independent";
  const words = pictureWordsFor(letter, ctx.seed, 3);

  const rows = [
    {
      id: "p1-trace-upper",
      glyph: L,
      repeats: independent ? tokens.independentWritingSlots + 1 : repeats,
      caption: `Big ${L}`,
      ...(independent ? { traceSlots: 1, blankSlots: tokens.independentWritingSlots } : {}),
    },
    {
      id: "p1-trace-lower",
      glyph: l,
      repeats: independent ? tokens.independentWritingSlots + 1 : repeats,
      caption: `Little ${l}`,
      ...(independent ? { traceSlots: 1, blankSlots: tokens.independentWritingSlots } : {}),
    },
  ];

  return {
    ...shell(
      ctx,
      `Trace the Letter ${L}`,
      independent
        ? `Look at big ${L} and little ${l}. Trace the first model, then write each letter on your own.`
        : `This is big ${L} and little ${l}. Start at the dot and trace each letter.`,
    ),
    // the page also introduces the letter in both cases, so it genuinely
    // teaches letter recognition alongside formation
    coveredSkills: ["letter-trace", "letter-recognition"],
    activity: {
      kind: "letter-trace",
      mechanic: "letter-trace",
      targetLetter: L,
      mode: independent ? "independent" : "guided",
      rows,
      words: words.map((w, i) => ({ id: `p1-word-${i + 1}`, word: w.word, asset: w.asset })),
    },
    answerKey: rows.map((row) => ({
      groupId: row.id,
      answer: row.repeats,
      answerText: row.glyph,
    })),
    footerNote: "Slow, steady lines make strong letters.",
  } as WorksheetPageModel;
}

/* -------------------------------------------------------- independent write */

/**
 * INDEPENDENT WRITING — the step after guided tracing.
 *
 * One small reminder model, at most one dashed letter, and then EMPTY ruled
 * handwriting space: the child forms the letter with no guide underneath. The
 * page is deliberately not a second tracing sheet, and it drops the picture
 * strip so the writing space stays generous.
 */
export function buildLetterWritePage(ctx: BuildContext): WorksheetPageModel {
  const letter = letterForSpec(ctx.spec);
  const L = upper(letter);
  const l = lower(letter);
  const tokens = resolveAgeTokens(ctx.spec.level);
  const blankSlots = Math.max(1, tokens.independentWritingSlots);

  const rows = [
    {
      id: "p1-write-upper",
      glyph: L,
      repeats: blankSlots + 1,
      caption: `Big ${L}`,
      traceSlots: 1,
      blankSlots,
    },
    {
      id: "p1-write-lower",
      glyph: l,
      repeats: blankSlots + 1,
      caption: `Little ${l}`,
      traceSlots: 1,
      blankSlots,
    },
    {
      id: "p1-write-free",
      glyph: L,
      repeats: blankSlots,
      caption: "Your turn",
      traceSlots: 0,
      blankSlots,
    },
  ];

  return {
    ...shell(
      ctx,
      `Write ${L} and ${l} on Your Own`,
      `Look at the first letter, then write ${L} and ${l} yourself on the empty lines.`,
    ),
    coveredSkills: ["letter-write", "letter-trace"],
    activity: {
      kind: "letter-trace",
      mechanic: "letter-write",
      targetLetter: L,
      mode: "independent",
      rows,
      words: [],
    },
    answerKey: rows.map((row) => ({
      groupId: row.id,
      answer: row.blankSlots,
      answerText: row.glyph,
    })),
    footerNote: `No dots to follow now — you can write ${L} all by yourself.`,
  } as WorksheetPageModel;
}

/* ------------------------------------ beginning-sound picture discrimination */

/**
 * "Which pictures begin with B?" — PHONEMIC discrimination, not letter
 * spotting. Roughly eight familiar pictures are printed in a clean grid, half
 * of them beginning with the target sound. Nothing on the child's sheet marks
 * which is which: the answer key is derived from the vocabulary data.
 */
export function buildSoundHuntPage(ctx: BuildContext): WorksheetPageModel {
  const next = rng(ctx.seed + 7717);
  const tokens = resolveAgeTokens(ctx.spec.level);
  const letter = letterForSpec(ctx.spec);
  const L = upper(letter);
  const l = lower(letter);
  const phoneme = `/${l}/`;
  const wantedTotal =
    ctx.semanticRequirements?.requiredItemCount ??
    requestedPictureCount(ctx.semanticRequirements?.pageIntent);
  const wantedTargets =
    ctx.semanticRequirements?.requiredTargetCount ??
    (wantedTotal ? Math.ceil(wantedTotal / 2) : tokens.maxObjectsPerLine >= 5 ? 4 : 3);
  const wantedDistractors = wantedTotal ? Math.max(1, wantedTotal - wantedTargets) : wantedTargets;

  // EXACT COMPOSITION — targets and distractors are chosen from separate,
  // strictly filtered pools so a distractor can never be another target word,
  // and the two counts are honoured independently of pool sizes.
  const seen = new Set<string>();
  const take = (pool: PhonicsWord[], count: number, wantTarget: boolean) => {
    const picked: Array<PhonicsWord & { isTarget: boolean }> = [];
    for (const word of pool) {
      if (picked.length >= count) break;
      const key = word.word.toLowerCase();
      const startsWithTarget = key.startsWith(l);
      if (startsWithTarget !== wantTarget) continue;
      if (seen.has(key)) continue;
      seen.add(key);
      picked.push({ ...word, isTarget: wantTarget });
    }
    return picked;
  };

  const targetItems = take(wordsForLetter(letter), wantedTargets, true);
  const distractorItems = take(
    contrastWords(letter, wantedDistractors + 12),
    wantedDistractors,
    false,
  );

  const items = shuffle([...targetItems, ...distractorItems], next).map((item, index) => ({
    id: `p1-snd-${index + 1}-${item.word}`,
    word: item.word,
    initialPhoneme: phonemeOf(item.word),
    asset: item.asset,
    isTarget: item.isTarget,
  }));

  return {
    ...shell(
      ctx,
      `Which Pictures Begin with ${L}?`,
      `Say each word out loud. Circle every picture that begins with ${phoneme}.`,
    ),
    activity: {
      kind: "sound-hunt",
      mechanic: "beginning-sound-discrimination",
      targetLetter: L,
      targetPhoneme: phoneme,
      items,
      challenge: `How many pictures begin with ${phoneme}? Say one more word of your own.`,
    },
    answerKey: items
      .filter((item) => item.isTarget)
      .map((item) => ({ groupId: item.id, answer: 1, answerText: item.word })),
    footerNote: `Listen to the very first sound: ${phoneme} as in ${items.find((i) => i.isTarget)?.word ?? l}.`,
  } as WorksheetPageModel;
}

/* --------------------------------------------------------- beginning sounds */

export function buildPhonicsSoundPage(ctx: BuildContext): WorksheetPageModel {
  const next = rng(ctx.seed + 5231);
  const tokens = resolveAgeTokens(ctx.spec.level);
  const letter = letterForSpec(ctx.spec);
  const L = upper(letter);
  const targetPool = wordsForLetter(letter);
  const distractorPool = contrastWords(letter, 10);
  // A letter whose clear-onset vocabulary is thin must still produce a full
  // page: fall back to the contrast pool rather than rendering blank cards.
  const targets = targetPool.length ? targetPool : distractorPool;
  const distractors = distractorPool.length ? distractorPool : targetPool;
  // EXACT REQUESTED SHAPE — "5 rows, 3 choices per row" is a hard contract.
  const requestedRows = ctx.semanticRequirements?.requiredRowCount;
  const requestedChoices = ctx.semanticRequirements?.requiredChoiceCount;
  const rowCount =
    requestedRows ?? Math.max(3, Math.min(4, tokens.itemsPerPage - 1, targets.length || 3));
  const choiceCount = Math.max(2, requestedChoices ?? 3);

  const rows: PickRow[] = Array.from({ length: rowCount }, (_, r) => {
    const id = `p1-snd${r + 1}`;
    const target = targets[r % Math.max(1, targets.length)]!;
    const wrong = Array.from({ length: choiceCount - 1 }, (_unused, k) =>
      distractors.length ? distractors[(r * (choiceCount - 1) + k) % distractors.length]! : target,
    ).filter((word) => word.word !== target.word);
    const cards = shuffle([target, ...wrong], next);
    const options: PickOption[] = cards.map((word, k) => ({
      id: `${id}-o${k + 1}-${word.word}`,
      renderedObjects: [picture(`${id}-o${k + 1}-obj`, word)],
      label: word.word,
    }));
    const answer = options.find((o) => o.label === target.word)!;
    return { id, promptLabel: L, options, answerOptionId: answer.id };
  });

  return {
    ...shell(
      ctx,
      `Beginning Sound: ${L}`,
      `Say each picture out loud. Circle the picture that starts with ${L}.`,
    ),
    activity: {
      kind: "pick-one",
      mechanic: "beginning-sound",
      rows,
      challenge: `Can you think of one more word that starts with ${L}?`,
    },
    answerKey: rows.map((row) => ({
      groupId: row.id,
      answer: row.options.findIndex((o) => o.id === row.answerOptionId) + 1,
      answerText: row.options.find((o) => o.id === row.answerOptionId)?.label ?? "",
    })),
    footerNote: "Say the word slowly and listen to the very first sound.",
  } as WorksheetPageModel;
}

/* ------------------------------------------------------------ letter sorting */

export function buildLetterSortPage(ctx: BuildContext): WorksheetPageModel {
  const next = rng(ctx.seed + 6317);
  const letter = letterForSpec(ctx.spec);
  const other = contrastLetters(letter, 1)[0] ?? "s";
  const L = upper(letter);
  const O = upper(other);

  const targetWords = wordsForLetter(letter).slice(0, 3);
  const otherWords = wordsForLetter(other).slice(0, 3);

  const items = shuffle(
    [
      ...targetWords.map((w, i) => picture(`p1-sort-a${i + 1}`, w)),
      ...otherWords.map((w, i) => picture(`p1-sort-b${i + 1}`, w)),
    ],
    next,
  );

  const binA = {
    id: "p1-bin-a",
    label: L,
    asset: targetWords[0]!.asset,
    startsWith: lower(letter),
  };
  const binB = {
    id: "p1-bin-b",
    label: O,
    asset: otherWords[0]!.asset,
    startsWith: lower(other),
  };

  return {
    ...shell(
      ctx,
      `Sort by First Sound: ${L} or ${O}`,
      `Say each picture. Draw it in the ${L} box or the ${O} box.`,
    ),
    activity: {
      kind: "sort-groups",
      mechanic: "letter-sort",
      bins: [binA, binB],
      items,
    },
    answerKey: [
      { groupId: binA.id, answer: targetWords.length, answerText: L },
      { groupId: binB.id, answer: otherWords.length, answerText: O },
    ],
    footerNote: "Listen to the very first sound of the word.",
  } as WorksheetPageModel;
}

/* --------------------------------------------- picture → letter MATCHING */

/**
 * "Match the pictures to the letter" — a real matching mechanic: pictures in
 * the left column, letter cards in the right column, one drawn line each.
 *
 * The only letters that appear besides the taught letter are the initials of
 * the distractor pictures, which the matching task requires.
 */
export function buildPictureLetterMatchPage(ctx: BuildContext): WorksheetPageModel {
  const next = rng(ctx.seed + 8123);
  const letter = letterForSpec(ctx.spec);
  const L = upper(letter);
  const l = lower(letter);
  const tokens = resolveAgeTokens(ctx.spec.level);
  // "Match 6 familiar pictures to their beginning letters" pins the exact
  // number of pictures printed in the left column. A teacher-written quantity
  // in plain prose ("8 different pictures") counts just as much as a
  // structured requirement — the age/template default is only used when the
  // teacher named no number at all.
  const wantedPictures =
    ctx.semanticRequirements?.requiredItemCount ??
    requestedPictureCount(ctx.semanticRequirements?.pageIntent);
  const targetCount = wantedPictures
    ? Math.max(1, Math.ceil(wantedPictures / 2))
    : tokens.maxObjectsPerLine >= 5
      ? 3
      : 2;
  const excluded = new Set((ctx.excludedWords ?? []).map((word) => word.toLowerCase()));
  const targets = wordsForLetter(letter)
    .filter((word) => !excluded.has(word.word))
    .slice(0, targetCount);
  const wantedDistractors = wantedPictures ? wantedPictures - targets.length : 2;
  const distractorPool = contrastWords(letter, 20).filter(
    (word) => lower(word.word.charAt(0)) !== l && !excluded.has(word.word),
  );
  const distractors: PhonicsWord[] = [];
  for (const word of distractorPool) {
    if (distractors.some((chosen) => chosen.word === word.word)) continue;
    distractors.push(word);
    if (distractors.length === Math.max(1, wantedDistractors)) break;
  }

  const all = shuffle([...targets, ...distractors], next);
  // EXACT COUNT IS A HARD CONSTRAINT — whatever the pools supplied, the page
  // prints exactly the number of pictures the teacher asked for.
  const chosen = wantedPictures ? all.slice(0, wantedPictures) : all;
  const pictures = chosen.map((word, index) => ({
    id: `p1-plm-${index + 1}-${word.word}`,
    word: word.word,
    asset: word.asset,
    letter: upper(word.word.charAt(0)),
    isTarget: lower(word.word.charAt(0)) === l,
  }));

  // the letter column mirrors the pictures actually printed
  const letters = [...new Set(pictures.map((picture) => picture.letter))];
  const letterCards = shuffle(letters, next).map((glyph, index) => ({
    id: `p1-plm-card-${index + 1}-${glyph}`,
    letter: glyph,
  }));

  // Semantic title: when the page offers several beginning letters the child
  // is matching each picture to ITS OWN letter — saying "Match the Pictures to
  // B" would misdescribe the task. Only a single-letter page names the letter.
  const multiLetter = letterCards.length > 1;

  return {
    ...shell(
      ctx,
      multiLetter ? "Match Each Picture to Its Beginning Letter" : `Match the Pictures to ${L}`,
      multiLetter
        ? `Say each picture. Draw a line from every picture to the letter its name begins with.`
        : `Say each picture. Draw a line from every picture to the letter it begins with.`,
    ),

    activity: {
      kind: "picture-letter-match",
      mechanic: "picture-letter-match",
      targetLetter: L,
      targetPhoneme: `/${l}/`,
      pictures,
      letterCards,
    },
    answerKey: pictures.map((picture) => ({
      groupId: picture.id,
      answer: letterCards.findIndex((card) => card.letter === picture.letter) + 1,
      answerText: `${picture.word} → ${picture.letter}`,
    })),
    footerNote: `Big ${L} and little ${l} make the same sound.`,
  } as WorksheetPageModel;
}

/* --------------------------------------------------------- word completion */

/**
 * "Complete the word" — the child writes the missing first letter under each
 * picture. A genuine completion task using only words that begin with the
 * taught letter: no second letter is introduced.
 */
/**
 * A teacher-authored quantity written in plain words ("show exactly 6
 * different pictures", "six pictures with a blank line") is an explicit
 * request. When the structured requirement is missing, the page must still
 * honour the number the teacher wrote instead of the age default of 3–4.
 */
const NUMBER_WORDS: Record<string, number> = {
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
};

export function requestedPictureCount(intent: string | undefined): number | undefined {
  if (!intent) return undefined;
  const text = intent.replace(/[*_`]/g, " ").toLowerCase();
  const match = text.match(
    /\b(\d{1,2}|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+(?:different\s+|separate\s+|new\s+)*(pictures?|images?|words?|items?|cards?)\b/,
  );
  if (!match) return undefined;
  const raw = match[1]!;
  const value = /^\d+$/.test(raw) ? Number(raw) : NUMBER_WORDS[raw];
  if (!value || value < 2 || value > 24) return undefined;
  return value;
}

export function buildWordCompletePage(ctx: BuildContext): WorksheetPageModel {
  const letter = letterForSpec(ctx.spec);
  const L = upper(letter);
  const l = lower(letter);
  const tokens = resolveAgeTokens(ctx.spec.level);
  const explicitCount =
    ctx.semanticRequirements?.requiredItemCount ??
    requestedPictureCount(ctx.semanticRequirements?.pageIntent);
  const wanted = explicitCount ?? (tokens.maxObjectsPerLine >= 5 ? 4 : 3);
  const exactTargetCount = ctx.semanticRequirements?.requiredTargetCount;
  const taught = wordsForLetter(letter).slice(0, exactTargetCount ?? wanted);
  // A "write the first letter" page may show more pictures than the taught
  // letter can supply. Extra pictures keep their OWN initial letter — the
  // answer is always derived from the picture's canonical word, never forced
  // onto the taught letter.
  const extras = contrastWords(letter, 12).filter(
    (word) => !taught.some((entry) => entry.word === word.word),
  );
  // When the teacher asked for "N pictures, write the first letter" without
  // naming one letter, the page practises SEVERAL first sounds — printing the
  // same taught letter six times would not practise the skill they asked for.
  const openLetterSet =
    Boolean(explicitCount) &&
    !/\bletters?\s+[A-Za-z]\b/i.test(ctx.semanticRequirements?.pageIntent ?? "");

  const interleaved: PhonicsWord[] = [];
  for (
    let index = 0;
    interleaved.length < wanted && index < taught.length + extras.length;
    index++
  ) {
    const source = index % 2 === 0 ? taught : extras;
    const pick = source[Math.floor(index / 2)];
    if (pick && !interleaved.some((entry) => entry.word === pick.word)) interleaved.push(pick);
  }
  const words = (openLetterSet ? [...interleaved, ...taught, ...extras] : [...taught, ...extras])
    .filter((word, index, all) => all.findIndex((entry) => entry.word === word.word) === index)
    .slice(0, wanted);
  const mixed = words.some((word) => lower(word.word.charAt(0)) !== l);

  const items = words.map((word, index) => ({
    id: `p1-wc-${index + 1}-${word.word}`,
    word: word.word,
    asset: word.asset,
    missingLetter: lower(word.word.charAt(0)),
    remainder: word.word.slice(1).toLowerCase(),
  }));

  return {
    ...shell(
      ctx,
      mixed ? "Write the First Letter" : `Complete the Words: ${L}`,
      mixed
        ? "Say each picture out loud. Write the letter its name begins with."
        : `Say each picture. Write the missing letter ${l} to finish every word.`,
    ),
    activity: {
      kind: "word-complete",
      mechanic: "word-initial-complete",
      targetLetter: L,
      targetPhoneme: `/${l}/`,
      items,
    },
    answerKey: items.map((item) => ({
      groupId: item.id,
      answer: 1,
      answerText: item.word,
    })),
    footerNote: mixed
      ? "Say the word slowly and listen to the very first sound."
      : `Every word here begins with ${l}.`,
  } as WorksheetPageModel;
}

/**
 * Literacy builder for a mechanic. `beginning-sound` only routes here for a
 * literacy request: a counting pack that rotates into a sounds page keeps its
 * own themed vocabulary.
 */
export function phonicsBuilderFor(mechanic: string, literacy = false) {
  if (literacy && mechanic === "beginning-sound") return buildPhonicsSoundPage;
  switch (mechanic) {
    case "beginning-sound-discrimination":
      return buildSoundHuntPage;
    case "letter-recognition":
      return buildLetterRecognitionPage;
    case "letter-trace":
      return buildLetterTracePage;
    case "letter-write":
      return buildLetterWritePage;
    case "letter-sort":
      return buildLetterSortPage;
    case "picture-letter-match":
      return buildPictureLetterMatchPage;
    case "word-initial-complete":
      return buildWordCompletePage;
    default:
      return undefined;
  }
}

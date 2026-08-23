/**
 * SEMANTIC ANSWER VALIDATION — instruction → displayed content → possible
 * answers → answer key must all agree.
 *
 * This layer is deliberately narrow: it does not change mechanics, layout or
 * artwork. It only verifies (and minimally repairs) that the answers a child
 * can choose are the logically correct answers for what the page shows and
 * says, and that the page title describes the task the instruction asks for.
 *
 * The two failure classes it exists for:
 *   1. arbitrary letters (A, M, P…) printed beside pictures they do not
 *      belong to in a picture ↔ letter matching task
 *   2. a title that describes a different task than the instruction
 *      ("Which One Is Different?" over a beginning-sound question)
 */

import type { WorksheetPageModel } from "./worksheet-model";
import { pictureInitial, pictureWord } from "./picture-lexicon";

const firstLetter = (text: string) => (text.trim().charAt(0) || "").toUpperCase();

/** The /s/ style phoneme a sound instruction is about, if any. */
function instructionPhoneme(instruction: string) {
  return instruction.match(/\/([a-z])\//i)?.[1]?.toLowerCase();
}

function isSoundInstruction(instruction: string) {
  return /begins? with|beginning sound|first sound|\/[a-z]\/|say each picture/i.test(instruction);
}

function isSameDifferentTitle(title: string) {
  return /which one is (different|the same)\??/i.test(title);
}

/* ------------------------------------------------------------------ repair */

/**
 * Minimal, mechanic-preserving repair pass. Runs on finalized page data just
 * before validation, so what renders is what was checked.
 */
export function repairAnswerSemantics(page: WorksheetPageModel): WorksheetPageModel {
  const instruction = page.instruction ?? "";
  let next = page;

  /* TITLE ↔ INSTRUCTION ↔ MECHANIC ------------------------------------- */
  if (next.activity.kind === "pick-one") {
    const subtype = (next.activity as { subtype?: string }).subtype;
    const soundTask = subtype === "sound-choice" || isSoundInstruction(instruction);
    if (soundTask && isSameDifferentTitle(next.title ?? "")) {
      const phoneme = instructionPhoneme(instruction);
      next = {
        ...next,
        title: phoneme
          ? `Which Picture Begins with ${phoneme.toUpperCase()}?`
          : "Which Picture Begins with This Sound?",
      };
    }
  }

  /* PICTURE ↔ LETTER MATCHING ------------------------------------------ */
  if (next.activity.kind === "match-pairs" && next.activity.subtype === "sound-to-picture") {
    const activity = next.activity;
    // the picture is the truth: asset -> canonical word -> beginning letter
    const left = activity.left.map((item) => {
      const word = pictureWord(item.asset);
      return word && item.label?.toLowerCase() !== word ? { ...item, label: word } : item;
    });
    const labelFor = new Map(left.map((item) => [item.pairId, item.label ?? ""]));
    const right = activity.right.map((card) => {
      const expected = firstLetter(labelFor.get(card.pairId) ?? "");
      return expected && card.letter !== expected ? { ...card, letter: expected } : card;
    });
    next = { ...next, activity: { ...activity, left, right } };
  }

  if (next.activity.kind === "picture-letter-match") {
    const activity = next.activity;
    // every picture is joined to the letter its own name begins with
    const target = (activity.targetLetter ?? "").toUpperCase();
    const pictures = activity.pictures
      // a picture whose vocabulary word cannot be resolved confidently is
      // removed rather than guessed at
      .filter((picture) => Boolean(pictureWord(picture.asset)))
      .map((picture) => {
        const word = pictureWord(picture.asset)!;
        const expected = firstLetter(word);
        return { ...picture, word, letter: expected, isTarget: expected === target };
      });
    // the letter column contains exactly the initials of the printed pictures:
    // no arbitrary letters, no missing answer, and ONE card per letter even
    // when several pictures share the same beginning sound.
    const needed = [...new Set(pictures.map((picture) => picture.letter.toUpperCase()))];
    const kept: Array<{ id: string; letter: string }> = [];
    for (const card of activity.letterCards) {
      const glyph = card.letter.toUpperCase();
      if (!needed.includes(glyph)) continue;
      if (kept.some((chosen) => chosen.letter.toUpperCase() === glyph)) continue;
      kept.push(card);
    }
    const letterCards = [
      ...kept,
      ...needed
        .filter((letter) => !kept.some((card) => card.letter.toUpperCase() === letter))
        .map((letter, index) => ({ id: `${page.id}-letter-${letter}-${index}`, letter })),
    ];
    // the answer key indexes into the letter column, so it is re-derived after
    // any card was removed or added
    const answerKey = pictures.map((picture) => ({
      groupId: picture.id,
      answer:
        letterCards.findIndex(
          (card) => card.letter.toUpperCase() === picture.letter.toUpperCase(),
        ) + 1,
      answerText: `${picture.word} → ${picture.letter.toUpperCase()}`,
    }));
    next = { ...next, activity: { ...activity, pictures, letterCards }, answerKey };
  }

  /* LETTER TRACING — the example pictures printed beside the letter must be
     words that really begin with it, named after the artwork shown. */
  if (next.activity.kind === "letter-trace") {
    const activity = next.activity as unknown as {
      targetLetter?: string;
      words?: Array<{ id: string; word: string; asset?: string }>;
    };
    if (Array.isArray(activity.words)) {
      const target = (activity.targetLetter ?? "").toLowerCase().charAt(0);
      const named = activity.words
        .map((entry) => {
          const word = pictureWord(entry.asset) ?? entry.word;
          return { ...entry, word };
        })
        .filter((entry) => Boolean(pictureWord(entry.asset)));
      const onTarget = target
        ? named.filter((entry) => entry.word.charAt(0).toLowerCase() === target)
        : named;
      next = {
        ...next,
        activity: { ...next.activity, words: onTarget } as WorksheetPageModel["activity"],
      };
    }
  }

  /* SOUND HUNT — every printed word, phoneme and target flag comes from the
     picture that is actually drawn. */
  if (next.activity.kind === "sound-hunt") {
    const activity = next.activity;
    const target = (activity.targetLetter ?? "").toLowerCase();
    const items = activity.items
      .filter((item) => Boolean(pictureWord(item.asset)))
      .map((item) => {
        const word = pictureWord(item.asset)!;
        const initial = word.charAt(0).toLowerCase();
        return {
          ...item,
          word,
          initialPhoneme: `/${initial}/`,
          isTarget: target ? initial === target : item.isTarget,
        };
      });
    next = {
      ...next,
      activity: { ...activity, items },
      answerKey: next.answerKey.filter((entry) => items.some((item) => item.id === entry.groupId)),
    };
  }

  /* WORD COMPLETION — the blank plus the printed remainder must spell the
     word under the picture, and every word must begin with the taught letter
     the instruction tells the child to write. */
  if (next.activity.kind === "word-complete") {
    const activity = next.activity;
    const target = (activity.targetLetter ?? "").toLowerCase();
    const spelled = activity.items
      .filter((item) => Boolean(pictureWord(item.asset)))
      .map((item) => {
        const word = pictureWord(item.asset)!;
        return {
          ...item,
          word,
          missingLetter: word.charAt(0).toLowerCase(),
          remainder: word.slice(1).toLowerCase(),
        };
      });
    // A MIXED page ("write the first letter of each picture") deliberately
    // shows several first sounds; only a single-letter page ("write the
    // missing letter s") is narrowed to the taught letter.
    const singleLetterPage =
      Boolean(target) &&
      activity.items.every((item) => (item.missingLetter ?? "").toLowerCase() === target);
    const onTarget = singleLetterPage
      ? spelled.filter((item) => item.missingLetter === target)
      : spelled;
    const items = singleLetterPage && onTarget.length >= 2 ? onTarget : spelled;
    next = {
      ...next,
      activity: { ...activity, items },
      answerKey: next.answerKey.filter((entry) => items.some((item) => item.id === entry.groupId)),
    };
  }

  return next;
}

/* -------------------------------------------------------------- validation */

/**
 * Final gate used by the renderer and the export path. Any string returned
 * here blocks rendering — the page would ask the child for an answer that is
 * not supported by what is printed.
 */
export function answerSemanticIssues(page: WorksheetPageModel): string[] {
  const issues: string[] = [];
  const instruction = page.instruction ?? "";
  const title = page.title ?? "";
  const activity = page.activity;
  if (!activity) return issues;

  /* title must describe the task the instruction sets */
  if (activity.kind === "pick-one") {
    const subtype = (activity as { subtype?: string }).subtype;
    if (
      (subtype === "sound-choice" || isSoundInstruction(instruction)) &&
      isSameDifferentTitle(title)
    ) {
      issues.push(
        `Page title "${title}" promises an odd-one-out task but the instruction asks a beginning-sound question.`,
      );
    }
    if (
      isSameDifferentTitle(title) &&
      subtype &&
      subtype !== "same-different" &&
      !/same|different/i.test(instruction)
    ) {
      issues.push(`Page title "${title}" does not match the instruction "${instruction}".`);
    }
  }

  /* picture ↔ letter matching: every answer must be logically correct */
  if (activity.kind === "match-pairs" && activity.subtype === "sound-to-picture") {
    const labelFor = new Map(activity.left.map((item) => [item.pairId, item.label ?? ""]));
    for (const card of activity.right) {
      const label = labelFor.get(card.pairId);
      if (label === undefined) {
        issues.push(`Letter card "${card.letter ?? card.id}" has no picture to match.`);
        continue;
      }
      const expected = firstLetter(label);
      if (!card.letter) {
        issues.push(`The card paired with "${label}" prints no letter.`);
      } else if (card.letter.toUpperCase() !== expected) {
        issues.push(
          `Letter "${card.letter}" is not the beginning sound of "${label}" (expected "${expected}").`,
        );
      }
    }
    for (const item of activity.left) {
      const word = pictureWord(item.asset);
      if (!word) {
        issues.push(`Picture "${item.asset}" has no confident vocabulary word.`);
      } else if ((item.label ?? "").toLowerCase() !== word) {
        issues.push(`Picture "${item.asset}" is labelled "${item.label}" but shows a ${word}.`);
      }
    }
    const phoneme = instructionPhoneme(instruction);
    if (phoneme && !activity.right.some((card) => card.letter?.toLowerCase() === phoneme)) {
      issues.push(
        `The instruction teaches /${phoneme}/ but no picture on the page begins with that sound.`,
      );
    }
  }

  if (activity.kind === "picture-letter-match") {
    const available = new Set(activity.letterCards.map((card) => card.letter.toUpperCase()));
    const needed = new Set<string>();
    for (const picture of activity.pictures) {
      const drawn = pictureWord(picture.asset);
      if (!drawn) {
        issues.push(`Picture "${picture.asset}" has no confident vocabulary word.`);
        continue;
      }
      if (picture.word.toLowerCase() !== drawn) {
        issues.push(
          `Picture "${picture.asset}" is called "${picture.word}" but the drawing shows a ${drawn}.`,
        );
      }
      if (picture.letter.toUpperCase() !== pictureInitial(picture.asset)) {
        issues.push(
          `"${drawn}" is joined to letter "${picture.letter}" but begins with "${pictureInitial(picture.asset)}".`,
        );
      }
      const expected = firstLetter(picture.word);
      needed.add(expected);
      if (picture.letter.toUpperCase() !== expected) {
        issues.push(
          `"${picture.word}" is keyed to letter "${picture.letter}" but begins with "${expected}".`,
        );
      }
      if (!available.has(expected)) {
        issues.push(`No letter card for "${picture.word}" (needs "${expected}").`);
      }
    }
    const seenCards = new Set<string>();
    for (const card of activity.letterCards) {
      const glyph = card.letter.toUpperCase();
      if (!needed.has(glyph)) {
        issues.push(`Letter card "${card.letter}" is not the answer for any picture on the page.`);
      }
      if (seenCards.has(glyph)) {
        issues.push(`Letter card "${card.letter}" is printed more than once.`);
      }
      seenCards.add(glyph);
    }

    const target = activity.targetLetter?.toUpperCase();
    if (target && !needed.has(target)) {
      issues.push(`The page teaches letter ${target} but shows no picture beginning with it.`);
    }
  }

  if (activity.kind === "sound-hunt") {
    const target = (activity.targetLetter ?? "").toLowerCase();
    for (const item of activity.items) {
      const drawn = pictureWord(item.asset);
      if (!drawn) {
        issues.push(`Picture "${item.asset}" has no confident vocabulary word.`);
        continue;
      }
      if (item.word.toLowerCase() !== drawn) {
        issues.push(`Picture "${item.asset}" is called "${item.word}" but shows a ${drawn}.`);
      }
      if (item.initialPhoneme.toLowerCase() !== `/${drawn.charAt(0)}/`) {
        issues.push(
          `"${drawn}" is keyed to ${item.initialPhoneme} but begins with /${drawn.charAt(0)}/.`,
        );
      }
      if (target && item.isTarget !== (drawn.charAt(0).toLowerCase() === target)) {
        issues.push(
          `"${drawn}" is marked ${item.isTarget ? "correct" : "incorrect"} for /${target}/ in error.`,
        );
      }
    }
  }

  if (activity.kind === "word-complete") {
    const declared = (activity.targetLetter ?? "").toLowerCase();
    // Only a single-letter completion page ("write the missing letter s")
    // requires every word to begin with the taught letter. A mixed
    // "write the first letter" page is answered per picture.
    const target = activity.items.every(
      (item) => (item.missingLetter ?? "").toLowerCase() === declared,
    )
      ? declared
      : "";
    for (const item of activity.items) {
      const drawn = pictureWord(item.asset);
      if (!drawn) {
        issues.push(`Picture "${item.asset}" has no confident vocabulary word.`);
        continue;
      }
      if (item.word.toLowerCase() !== drawn) {
        issues.push(`Picture "${item.asset}" is called "${item.word}" but shows a ${drawn}.`);
      }
      if (`${item.missingLetter}${item.remainder}`.toLowerCase() !== item.word.toLowerCase()) {
        issues.push(
          `"${item.word}" is printed as "${item.missingLetter}_${item.remainder}", which does not spell the word.`,
        );
      }
      if (target && item.word.charAt(0).toLowerCase() !== target) {
        issues.push(
          `The instruction asks the child to write "${target}" but "${item.word}" does not begin with it.`,
        );
      }
    }
  }

  return issues;
}

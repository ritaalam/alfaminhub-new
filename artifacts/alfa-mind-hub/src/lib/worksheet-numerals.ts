/**
 * Numeral formation pages.
 *
 * "Trace and independently write the numbers 1–10" is a maths handwriting
 * activity, not shape tracing and not letter writing. This builder produces
 * guided dotted numerals followed by clearly BLANK writing space, so the child
 * moves from tracing to independent formation on the same page.
 */

import { resolveAgeTokens } from "./age-tokens";
import {
  directionForTheme,
  resolveIllustrationStyle,
  resolveVisualDirection,
  type IllustrationPurpose,
} from "./visual-directions";
import type { WorksheetSpec } from "./creator-options";
import type { BuildContext } from "./worksheet-mechanics";
import type { WorksheetPageModel } from "./worksheet-model";

function styleFor(spec: WorksheetSpec, purpose: IllustrationPurpose) {
  return resolveIllustrationStyle({
    direction: resolveVisualDirection(directionForTheme(spec.theme, spec.inspiration)),
    purpose,
    ageId: resolveAgeTokens(spec.level).id,
  });
}

/** Reads "numbers 1–10" / "0 to 5" out of the request; falls back to 1–10. */
export function numeralRangeFor(
  spec: WorksheetSpec,
  fallback: [number, number] = [1, 10],
): [number, number] {
  const text = `${spec.prompt ?? ""}`.replace(/[–—]/g, "-");
  const match =
    /\b(?:numbers?|numerals?|digits?)\b[^0-9]{0,12}(\d{1,2})\s*(?:-|to|through|until)\s*(\d{1,2})/i.exec(
      text,
    );
  if (!match) return fallback;
  const from = Number(match[1]);
  const to = Number(match[2]);
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) return fallback;
  return [Math.max(0, from), Math.min(20, to)];
}

/**
 * NUMBER WRITING — guided tracing first, then blank independent space.
 * Every row keeps exactly one dotted model numeral and at least three empty
 * slots, which is what the page-plan contract verifies before rendering.
 */
export function buildNumberWritePage(ctx: BuildContext): WorksheetPageModel {
  const tokens = resolveAgeTokens(ctx.spec.level);
  const [from, to] = numeralRangeFor(ctx.spec);
  const digits = Array.from({ length: to - from + 1 }, (_unused, i) => String(from + i));
  // Multi-page number-formation packs must not print the identical row order
  // on every page. Rotate the same requested range deterministically per page
  // seed so each page remains numeral practice while still feeling purposeful.
  const offset = digits.length > 1 ? Math.abs(ctx.seed) % digits.length : 0;
  const orderedDigits = [...digits.slice(offset), ...digits.slice(0, offset)];
  const perPageRows = Math.max(3, Math.min(5, tokens.itemsPerPage));
  const blankSlots = Math.max(0, tokens.independentWritingSlots);

  // group the range into rows of one or two numerals so the sheet stays calm
  const chunk = Math.max(1, Math.ceil(digits.length / perPageRows));
  const groups: string[][] = [];
  for (let i = 0; i < orderedDigits.length; i += chunk)
    groups.push(orderedDigits.slice(i, i + chunk));

  const rows = groups.slice(0, perPageRows).map((group, index) => ({
    id: `p1-number-${index + 1}`,
    glyph: group.join(" "),
    repeats: blankSlots + 1,
    caption: group.length > 1 ? `Write ${group.join(" and ")}` : `Write ${group[0]}`,
    traceSlots: 1,
    blankSlots,
  }));

  const label = `${from}–${to}`;
  return {
    id: "page-1",
    title: `Trace and Write Numbers ${label}`,
    instruction:
      tokens.writingDemand === "guided"
        ? `Trace the dotted number ${label}. Try one more time on the guided line.`
        : tokens.writingDemand === "emerging"
          ? `Trace the dotted number first, then write the number ${label} on the empty lines.`
          : `Use the model if needed, then write the number ${label} independently on the empty lines.`,
    activityType: ctx.profile.activityLabel,
    purpose: "counting" as IllustrationPurpose,
    illustrationStyle: styleFor(ctx.spec, "counting"),
    layout: "stacked-rows" as const,
    coveredSkills: ["number-write"],
    activity: {
      kind: "letter-trace",
      mechanic: "number-write",
      targetLetter: digits[0] ?? "1",
      mode: "independent",
      rows,
      words: [],
    },
    answerKey: rows.map((row) => ({
      groupId: row.id,
      answer: row.blankSlots,
      answerText: row.glyph,
    })),
    footerNote: "Start at the dot and write each number on your own.",
  } as WorksheetPageModel;
}

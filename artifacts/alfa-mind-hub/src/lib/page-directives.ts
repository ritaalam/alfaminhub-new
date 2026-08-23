/**
 * EXACT PAGE FIDELITY
 * -------------------
 * A teacher may specify a pack page by page:
 *
 *   Page 1: Trace uppercase S and lowercase s.
 *   Page 2: Circle pictures beginning with /s/.
 *   Page 3: Find and circle S/s among distractor letters.
 *   Page 4: Match pictures beginning with S to the letter S.
 *   Page 5: Complete a simple picture activity using words beginning with S.
 *
 * Each of those lines is a HARD PAGE-LEVEL CONSTRAINT, not a hint. The planner
 * may not substitute a different activity just because it practises the same
 * general skill ("match" is not satisfied by another circling page), and the
 * generator may not introduce a concept the teacher did not ask for (a second
 * taught letter, a new skill, an extra mechanic) unless the requested activity
 * itself requires it as a distractor.
 *
 * The directive carries: page order, target skill/mechanic, and the target
 * concept (letter / number / topic). Validation compares every generated page
 * against its directive BEFORE rendering, and only the offending page is
 * regenerated.
 */

import type { WorksheetSpec } from "./creator-options";
import { rendererMechanicFor, wasRendererMechanicConverted } from "./worksheet-renderer-support";
import { mechanicOfActivity } from "./worksheet-objectives";
import { domainForSpec } from "./learning-domains";
import { matchObjects, matchTheme, type VisualAssetKey } from "./semantic-topics";
import { categoriesInText, requestedItemCount } from "./object-semantics";
import type {
  PageContentDomain,
  PageResponseMode,
  PageSemanticRequirements,
  PageStudentAction,
  PatternRuleId,
  WorksheetActivity,
  WorksheetMechanicId,
  WorksheetProject,
} from "./worksheet-model";

export type PageDirective = {
  /** 1-based page number exactly as written by the teacher */
  page: number;
  /** the sentence the teacher wrote for this page */
  text: string;
  /** the mechanic this page MUST use */
  mechanic: WorksheetMechanicId;
  /** the concept the page must teach: a letter, a number, or undefined */
  targetLetter?: string;
  targetNumber?: number;
  semanticRequirements: PageSemanticRequirements;
};

/**
 * Splits per-page instructions out of a free-text prompt, in written order.
 *
 * Two equally explicit notations are supported, because teachers write both:
 *   "Page 3: Complete the pattern."
 *   "3. Complete the pattern."
 */
function directiveLines(prompt: string): Array<{ page: number; text: string }> {
  const found: Array<{ page: number; text: string }> = [];
  // Capture the COMPLETE block between page markers. In the Creator, teachers
  // commonly put the activity on the marker line and its exact quantities on
  // following lines; stopping at the first newline silently dropped those hard
  // constraints and let age/template defaults take over.
  const pattern = /\bpage\s*(\d{1,2})\s*[:.)\-–—]\s*([\s\S]*?)(?=\bpage\s*\d{1,2}\s*[:.)\-–—]|$)/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(prompt)) !== null) {
    const page = parseInt(match[1]!, 10);
    const text = (match[2] ?? "")
      .trim()
      .replace(/\s*\n\s*/g, ". ")
      .replace(/[.;]+$/, "");
    if (page >= 1 && page <= 20 && text.length > 2) found.push({ page, text });
  }
  if (!found.length) {
    // plain numbered list: every line must start with its page number, and at
    // least two lines must be present before it counts as a page-by-page plan
    const numbered: Array<{ page: number; text: string }> = [];
    for (const line of prompt.split(/\n/)) {
      const entry = line.trim().match(/^[-*•\s]*(\d{1,2})\s*[:.)\-–—]\s*(.+)$/);
      if (!entry) continue;
      const page = parseInt(entry[1]!, 10);
      const text = entry[2]!.trim().replace(/[.;]+$/, "");
      if (page >= 1 && page <= 20 && text.length > 2) numbered.push({ page, text });
    }
    if (numbered.length >= 2) found.push(...numbered);
  }
  // last writing wins for a repeated page number
  const byPage = new Map<number, string>();
  for (const entry of found) byPage.set(entry.page, entry.text);
  return [...byPage.entries()]
    .map(([page, text]) => ({ page, text }))
    .sort((a, b) => a.page - b.page);
}

type Rule = { mechanic: WorksheetMechanicId; test: RegExp; literacyOnly?: boolean };

/**
 * Directive → mechanic. Ordered most specific first: the VERB the teacher used
 * decides the mechanic, and the object of the verb disambiguates it.
 */
/**
 * COUNT & DRAW — "count the shapes and draw the same number of circles in the
 * box" is a counting page whose RESPONSE is drawing. The words "the same" must
 * never route it to a same/different discrimination page, so this rule is
 * tested before the visual-discrimination verbs.
 */
const countAndDrawTest =
  /\bcount\b[^]*\bdraw\b|\bdraw\b[^]*\b(the )?same (number|amount|many)\b|\bdraw\b[^]*\bin the (box|square|space)\b/i;

const directiveRules: Rule[] = [
  // craft is always explicit
  { mechanic: "cut-create-scene", test: /\bcut\b.*\b(scene|build|make|glue|paste|stick)\b/i },
  { mechanic: "cut-create-build", test: /\bcut\s*(out|&|and)\b|\bscissors?\b/i },
  // A repeating-pattern page is a PATTERN page even when its objects are
  // described by their first sound ("pictures beginning with S"). The pattern
  // verb is the most specific thing the teacher wrote, so it is tested first.
  {
    mechanic: "pattern-complete",
    test: /\bpatterns?\b|\brepeating\b|\bwhat comes next\b|\bcomplete the (pattern|row|sequence)\b/i,
  },
  // counting whose answer is DRAWN, not circled
  { mechanic: "count-circle", test: countAndDrawTest },
  // Numeral formation: "trace / write the numbers 1-10" is a maths handwriting
  // page, never shape tracing and never letter writing.
  {
    mechanic: "number-write",
    test: /\b(trac(e|es|ing)|writ(e|es|ing)|form)\b[^]*\b(numbers?|numerals?|digits?)\b|\b(numbers?|numerals?|digits?)\b[^]*\b(trac(e|es|ing)|handwriting|writ(e|es|ing)|formation)\b/i,
  },
  // Independent handwriting is a DIFFERENT activity from guided tracing.
  {
    mechanic: "letter-write",
    test: /\bindependent(ly)?\b[^]*\bwrit|\bwrit[^]*\bindependent(ly)?\b|\bwrite\b[^]*\b(on (their|his|her|your) own|without (tracing|guides?|help)|by (them|him|her|your)sel)|\bfree writing\b|\bunguided\b/i,
  },
  // literacy verbs
  { mechanic: "trace-draw", test: /\bmazes?\b|\btrac(e|es|ing)\b[^]*\b(path|maze|line|route)\b/i },
  {
    mechanic: "trace-draw",
    test: /\btrac(e|es|ing)\b[^]*\bdraw(s|ing)?\b|\bdraw(s|ing)?\b[^]*\btrac(e|es|ing)\b/i,
  },
  {
    mechanic: "letter-trace",
    test: /\btrac(e|es|ing)\b|\bwrit(e|es|ing) the letters?\b|\bhandwriting\b|\bletter formation\b/i,
  },
  // WRITE THE FIRST LETTER — the child writes an initial letter under each
  // picture. A writing response, never a circling or matching one.
  {
    mechanic: "word-initial-complete",
    test: /\bwrit(e|es|ing)\b[^]*\b(first|beginning|initial|starting)[\s-]+letters?\b|\b(first|beginning|initial|starting)[\s-]+letters?\b[^]*\bwrit(e|es|ing)\b|\bwrit(e|es|ing)\b[^]*\bmissing[\s-]+letters?\b/i,
    literacyOnly: true,
  },
  // ROW-BY-ROW BEGINNING SOUND — "circle the picture that begins with the
  // letter in each of 5 rows, 3 choices per row" is a multiple-choice page,
  // not the open picture grid used by sound discrimination.
  {
    mechanic: "beginning-sound",
    // A row signal is required: bare "choices" in "show only the letter
    // choices needed" describes letter cards on a matching page, not rows.
    test: /\b(rows?|choices? per row|options? per row|pictures? per row)\b[^]*\b(begin|start)(s|ning)?\b|\b(begin|start)(s|ning)?\b[^]*\b(rows?|choices? per row|options? per row)\b/i,
    literacyOnly: true,
  },
  {
    mechanic: "picture-letter-match",
    test: /\bmatch(es|ing)?\b[^]*\b(letters?|sounds?)\b|\b(letters?|sounds?)\b[^]*\bmatch(es|ing)?\b|\bjoin(s|ing)?\b[^]*\bletters?\b|\bdraw(ing)? a line\b[^]*\bletters?\b/i,
    literacyOnly: false,
  },
  {
    mechanic: "word-initial-complete",
    test: /\bcomplet(e|es|ing)\b(?![^]*\bpattern)|\bfinish(es|ing)?\b|\bfill(s|ing)? in\b|\bmissing letter\b/i,
    literacyOnly: true,
  },
  {
    mechanic: "letter-sort",
    test: /\bsort(s|ing)?\b[^]*\b(letter|sound)\b|\bsort(ing)? by (first )?(sound|letter)\b/i,
  },
  {
    mechanic: "beginning-sound-discrimination",
    test: /\b(pictures?|words?)\b[^]*\b(begin|start)(s|ning)?\b|\bbeginning[- ]sounds?\b|\binitial[- ]sounds?\b|\/[a-z]\/\s*sound/i,
  },
  {
    mechanic: "letter-recognition",
    test: /\b(find(s|ing)?|circl(e|es|ing)|identif(y|ies|ying)|spot(s|ting)?|recogni[sz](e|es|ing)|hunt(s|ing)?)\b[^]*\bletters?\b|\bupper ?case\b|\blower ?case\b|\bdistractor letters?\b|\b[A-Za-z]\/[A-Za-z]\b/i,
  },
  // maths verbs — every verb is matched in all of its written forms, because a
  // teacher writes "matching quantities" as readily as "match quantities"
  {
    mechanic: "count-match",
    test: /\bmatch(es|ing)?\b[^]*(number|numeral|quantit)|\b(group|set)s?\b[^]*\bmatch(es|ing)?\b[^]*\bnumber/i,
  },
  { mechanic: "match-pairs", test: /\b(match(es|ing)?|join(s|ing)?|draw(ing)? a line)\b/i },
  // CIRCLE is a hard interaction verb: "circle all the triangles in a mixed
  // group" is a selection page, never a sorting page. Circling a printed
  // numeral is handled later by count-circle, so those words are excluded.
  {
    mechanic: "find-target",
    test: /\bcircl(e|es|ing)\b(?![^]*\b(numbers?|numerals?|answers?|how many|count(s|ing)?|more|fewer|less|most|least|same|different)\b)/i,
  },

  {
    mechanic: "pattern-complete",
    test: /\bpatterns?\b|\bwhat comes next\b|\bcomplet(e|es|ing) the (pattern|row)\b/i,
  },
  {
    mechanic: "sequence-order",
    test: /\b(order(s|ing)?|sequenc(e|es|ing)|first.*then.*last|life ?cycle)\b/i,
  },
  { mechanic: "memory-pairs", test: /\bmemory\b|\bpairs?\b|\bconcentration\b/i },
  { mechanic: "find-and-count", test: /\bfind(ing)? (and|&) count(ing)?\b/i },
  {
    mechanic: "find-target",
    test: /\b(find(s|ing)?|spot(s|ting)?|search(es|ing)? for|locat(e|es|ing))\b/i,
  },
  {
    mechanic: "compare-quantity",
    test: /\bmore\b|\bfewer\b|\bfewest\b|\bmost\b|\bless\b|\bcompar(e|es|ing) (the )?(groups?|sets?|quantit)/i,
  },
  {
    mechanic: "compare-size",
    test: /\bbig(ger|gest)?\b|\bsmall(er|est)?\b|\btall(er)?\b|\bshort(er)?\b/i,
  },
  // A count request may naturally say "count different groups" or "count
  // sets". It remains a quantity activity unless the teacher asks the child to
  // compare sameness/difference.
  {
    mechanic: "count-circle",
    test: /\bcount(s|ing)?\b/i,
  },
  // "the same number of…" is a QUANTITY statement, not a look-alike comparison
  {
    mechanic: "same-different",
    test: /\bsame\b(?!\s*(number|amount|many|quantity|count))|\bdifferent\b|\bodd one out\b/i,
  },
  { mechanic: "sort-attribute", test: /\bsort(s|ing)?\b|\bgroup(s|ing)?\b|\bclassif/i },
  {
    mechanic: "count-circle",
    test: /\bcircl(e|es|ing) (the )?(number|numeral|answer)\b|\bhow many\b/i,
  },
];

const literacyMechanics: WorksheetMechanicId[] = [
  "letter-trace",
  "letter-write",
  "letter-recognition",
  "letter-sort",
  "beginning-sound",
  "beginning-sound-discrimination",
  "picture-letter-match",
  "word-initial-complete",
];

/** Fallbacks used when a directive names a verb the domain cannot render. */
function domainFallback(literacy: boolean, mechanic: WorksheetMechanicId): WorksheetMechanicId {
  if (literacy) {
    if (mechanic === "match-pairs") return "picture-letter-match";
    if (mechanic === "find-target") return "letter-recognition";
    if (mechanic === "trace-draw") return "letter-trace";
    if (mechanic === "number-write") return "letter-write";
    if (mechanic === "count-match") return "picture-letter-match";
    if (mechanic === "count-circle") return "letter-recognition";
    if (mechanic === "sort-attribute") return "letter-sort";
    return mechanic;
  }
  if (mechanic === "picture-letter-match") return "match-pairs";
  if (mechanic === "word-initial-complete") return "pattern-complete";
  if (mechanic === "letter-trace") return "trace-draw";
  // independent writing practice in a maths pack is numeral formation
  if (mechanic === "letter-write") return "number-write";
  if (mechanic === "letter-recognition") return "find-target";
  if (literacyMechanics.includes(mechanic)) return "find-target";
  return mechanic;
}

/**
 * A single page in a mixed pack states its own domain. "Count the rockets" is a
 * maths page even when the pack also teaches a letter, so the pack-level domain
 * fallback only applies when the page itself is about letters and sounds.
 */
const pageNamesLiteracy =
  /\bletters?\b|\bsounds?\b|\bphonics?\b|\balphabet\b|\brhym|\bsyllab|\bspell|\bwords?\b|\/[a-z]\//i;

export function mechanicForDirectiveText(
  text: string,
  literacy: boolean,
): WorksheetMechanicId | undefined {
  for (const rule of directiveRules) {
    if (rule.literacyOnly && !literacy) continue;
    if (!rule.test.test(text)) continue;
    const selfDeclaresLiteracy = pageNamesLiteracy.test(text);
    if (literacyMechanics.includes(rule.mechanic)) {
      // literacy mechanic requested on a page that never mentions letters in a
      // non-literacy pack -> fall back; otherwise honour it verbatim
      return selfDeclaresLiteracy ? rule.mechanic : domainFallback(literacy, rule.mechanic);
    }
    return selfDeclaresLiteracy ? domainFallback(literacy, rule.mechanic) : rule.mechanic;
  }
  return undefined;
}

/** The concept a single directive names, if it names one explicitly. */
function conceptOf(text: string): { letter?: string; number?: number } {
  const letter =
    text.match(/\bletters?\s+([A-Za-z])\b/)?.[1] ??
    text.match(/\/([a-z])\/\s*sound/i)?.[1] ??
    text.match(/\b([A-Za-z])\/[A-Za-z]\b/)?.[1] ??
    text.match(/\b(?:upper ?case|capital)\s+([A-Za-z])\b/i)?.[1];
  const number = text.match(/\bnumber\s+(\d{1,2})\b/i)?.[1];
  return {
    ...(letter ? { letter: letter.toLowerCase() } : {}),
    ...(number ? { number: parseInt(number, 10) } : {}),
  };
}

/**
 * Explicit mandatory-content language. Only these phrasings promote a noun from
 * FLEXIBLE theme content to an IMMUTABLE requirement.
 */
const mandatoryMarker =
  /\b(must include|must have|must show|must use|has to include|have to include|required|require[sd]?\b|mandatory|exactly|specifically|only use)\b/i;

export function contentEntitiesOf(requirements: PageSemanticRequirements): VisualAssetKey[] {
  return [
    ...new Set([...requirements.requiredEntities, ...(requirements.preferredEntities ?? [])]),
  ];
}

const WRITTEN_NUMBERS: Record<string, number> = {
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
  eleven: 11,
  twelve: 12,
};

/** "5 rows", "three choices per row" -> the exact number the teacher wrote. */
function countBeforeNoun(text: string, noun: RegExp): number | undefined {
  const pattern = new RegExp(
    `(\\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\\s+${noun.source}\\b`,
    "i",
  );
  const match = pattern.exec(text);
  if (!match?.[1]) return undefined;
  const raw = match[1].toLowerCase();
  const value = /^\d+$/.test(raw) ? Number(raw) : WRITTEN_NUMBERS[raw];
  return value && value > 0 && value <= 20 ? value : undefined;
}

/** "6 familiar pictures", "look at 6 pictures" — the exact number of pictures. */
function requestedPictureCount(text: string): number | undefined {
  return countBeforeNoun(text, /(?:[a-z-]+\s+)?(?:pictures?|words?|images?)/);
}

/** An explicit counting span is a page contract, not merely a safe upper bound. */
function requestedQuantityRange(
  text: string,
  mechanic: WorksheetMechanicId,
): [number, number] | undefined {
  if (mechanic !== "count-circle" && mechanic !== "count-match") return undefined;
  // An age band such as "ages 4–5" describes the learner, never the
  // quantities a child should count. Leaving it in would shrink the available
  // numeral choices to 4 and 5 on an otherwise explicit counting request.
  const countText = text.replace(
    /\b(?:ages?|aged|years?(?: old)?)\s*\d{1,2}\s*(?:[-–—]|to)\s*\d{1,2}\b/gi,
    " ",
  );
  const match =
    /\bbetween\s+(\d{1,2})\s+and\s+(\d{1,2})\b/i.exec(countText) ??
    /\b(?:from\s+)?(\d{1,2})\s*(?:to|[-–—])\s*(\d{1,2})\b/i.exec(countText);
  if (!match) return undefined;
  const first = Number(match[1]);
  const second = Number(match[2]);
  if (!Number.isInteger(first) || !Number.isInteger(second) || first < 1 || second < 1) {
    return undefined;
  }
  return [Math.min(first, second), Math.max(first, second)];
}

const NUM = "(\\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)";

function toNumber(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const clean = raw.toLowerCase();
  const value = /^\d+$/.test(clean) ? Number(clean) : WRITTEN_NUMBERS[clean];
  return value && value > 0 && value <= 20 ? value : undefined;
}

/**
 * EXACT TARGET COUNT — "exactly 6 B pictures", "6 pictures that begin with B",
 * or its complement "9 non-B pictures" / "9 pictures that do not start with B".
 * A stated complement pins the target count just as firmly as a direct count.
 */
function parseTargetPictureCount(text: string, total: number | undefined): number | undefined {
  const direct =
    new RegExp(
      `\\b(?:exactly\\s+)?${NUM}\\s+(?:target|[A-Za-z])\\s+(?:pictures?|words?|images?)\\b`,
      "i",
    ).exec(text) ??
    new RegExp(
      `\\b(?:exactly\\s+)?${NUM}\\s+(?:[a-z-]+\\s+)?(?:pictures?|words?|images?)\\s+(?:that\\s+|which\\s+)?(?:begin|start)(?:s|ning|ing)?\\s+with\\b`,
      "i",
    ).exec(text);
  const directCount = toNumber(direct?.[1]);
  if (directCount) return directCount;

  const complement =
    new RegExp(
      `\\b(?:exactly\\s+)?${NUM}\\s+non[- ]?[A-Za-z]\\s+(?:pictures?|words?|images?)\\b`,
      "i",
    ).exec(text) ??
    new RegExp(
      `\\b(?:exactly\\s+)?${NUM}\\s+(?:of\\s+(?:the\\s+)?)?(?:[a-z-]+\\s+)?(?:pictures?|words?|images?)\\s+(?:that\\s+|which\\s+)?(?:must\\s+|should\\s+)?(?:do\\s+not|don't|does\\s+not|doesn't|not)\\s+(?:begin|start)\\b`,
      "i",
    ).exec(text);

  const complementCount = toNumber(complement?.[1]);
  if (complementCount && total && total > complementCount) return total - complementCount;
  return undefined;
}

/** Converts one explicit instruction into immutable, renderer-checkable meaning. */
export function semanticRequirementsOf(
  text: string,
  mechanic: WorksheetMechanicId,
): PageSemanticRequirements {
  // Markdown emphasis may join a following word to the closing marker
  // ("pictures** and..."). Remove formatting before matching concrete nouns,
  // otherwise the trailing "s" in the marker can make "and" read as "sand"
  // and accidentally pin an unrelated picture such as "gift" (alias: "present").
  const semanticText = text
    .replace(/[*_`~]+/g, " ")
    // Requirement prose uses "present" as an adjective ("no missing images",
    // "pictures must be present"), not as the noun "present/gift".
    .replace(/\b(?:must|should|need(?:s)? to)\s+be\s+present\b/gi, " ");
  const entities = matchObjects(semanticText).filter(
    (entity) => entity !== "circle" || /\bcircles\b|\bcircle shapes?\b/i.test(text),
  );
  const mandatory = mandatoryMarker.test(semanticText);
  const topic = matchTheme(semanticText);
  const patterns = (["AAB", "ABB", "ABC", "AB"] as PatternRuleId[]).filter((rule) =>
    new RegExp(`\\b${rule}\\b`, "i").test(text),
  );
  const babyParent =
    /\bbab(?:y|ies)\b[^.]*\bparent/i.test(text) || /\bparent\b[^.]*\bbab(?:y|ies)/i.test(text);
  const animalFood = /\banimals?\b[^.]*\bfood\b|\bfood\b[^.]*\banimals?\b/i.test(text);
  const legSort = /\b2\s*legs?\b[^.]*\b4\s*legs?\b|\b4\s*legs?\b[^.]*\b2\s*legs?\b/i.test(text);
  // OBJECT → SHAPE: "match everyday objects to the shape they look like" is a
  // relationship page. An identical-picture match would be a substitution.
  const objectToShape =
    (mechanic === "match-pairs" || mechanic === "count-match") &&
    /\bshapes?\b/i.test(text) &&
    /\b(objects?|things|pictures?|items?|everyday|real[- ]world)\b/i.test(text);
  const categoryGroups = /\bsort|\bgroup|\bclassif|\bcategor/i.test(text)
    ? categoriesInText(text)
    : [];
  // EXACT QUANTITY: "Sort 8 pictures — 4 food items and 4 things we play with"
  // pins both the total and the per-category counts.
  const groupTotal = categoryGroups.reduce((sum, group) => sum + (group.count ?? 0), 0);
  // "15 unique pictures" — an adjective between the number and the noun must
  // not hide the stated total, so the adjective-tolerant reader goes first.
  const itemCount = groupTotal || requestedPictureCount(text) || requestedItemCount(text);
  const rowCount = countBeforeNoun(text, /rows?/);
  const groupCount = countBeforeNoun(text, /(?:different\s+)?(?:groups?|sets?)/);
  const choiceCount = countBeforeNoun(text, /(?:(?:number|answer)\s+)?(?:choices?|options?|pictures? per row)/);
  const grid = text.match(/\b(\d{1,2})\s*[×x]\s*(\d{1,2})\s+grid\b/i);
  const requiredGrid = grid ? { columns: Number(grid[1]), rows: Number(grid[2]) } : undefined;
  const requiredTargetCount = parseTargetPictureCount(text, itemCount);
  const requiredQuantityRange = requestedQuantityRange(semanticText, mechanic);

  const countAndDraw = mechanic === "count-circle" && countAndDrawTest.test(text);
  const action = studentActionOf(text, mechanic);
  const domain = contentDomainOf(text, entities);
  const response = responseModeOf(text, mechanic, countAndDraw);
  const activitySubtype = babyParent
    ? "baby-parent"
    : objectToShape
      ? "object-to-shape"
      : animalFood && mechanic === "trace-draw"
        ? "animal-to-food-path"
        : mechanic === "trace-draw" && /\bpaths?\b|\bmaze\b/i.test(text)
          ? "path-tracing"
          : countAndDraw
            ? "count-and-draw"
            : undefined;
  return {
    pageIntent: text,
    ...(activitySubtype ? { activitySubtype } : {}),
    ...(action ? { studentAction: action } : {}),
    ...(domain ? { contentDomain: domain } : {}),
    ...(response ? { responseMode: response } : {}),
    ...(categoryGroups.length >= 2
      ? {
          categoryGroups: categoryGroups.map((category) => ({
            label: category.label,
            members: category.members,
            ...(category.count ? { count: category.count } : {}),
          })),
        }
      : {}),
    ...(itemCount ? { requiredItemCount: itemCount } : {}),
    ...(rowCount ? { requiredRowCount: rowCount } : {}),
    ...(groupCount ? { requiredGroupCount: groupCount } : {}),
    ...(choiceCount ? { requiredChoiceCount: choiceCount } : {}),
    ...(requiredQuantityRange ? { requiredQuantityRange } : {}),
    ...(mechanic === "count-match"
      ? (() => {
          const side = /\b(?:numbers?|numerals?)\b[^.]{0,60}\bon\s+the\s+(left|right)\b/i.exec(text)?.[1];
          return side === "left" || side === "right" ? { numberBankSide: side } : {};
        })()
      : {}),
    ...(requiredGrid ? { requiredGrid } : {}),
    ...(requiredTargetCount ? { requiredTargetCount } : {}),
    ...(objectToShape || countAndDraw
      ? {
          forbiddenSubstitutions: objectToShape
            ? (["count-match", "same-different", "find-target"] as WorksheetMechanicId[])
            : (["same-different", "compare-quantity"] as WorksheetMechanicId[]),
        }
      : {}),
    requiredEntities: mandatory ? entities : [],
    preferredEntities: mandatory ? [] : entities,
    requiredCategories: topic ? [topic.id] : [],
    requiredRelationships: [
      ...(babyParent ? ["baby-to-parent"] : []),
      ...(animalFood ? ["animal-to-food"] : []),
      ...(objectToShape ? ["object-to-shape"] : []),
    ],
    patternRules: patterns,
    ...(legSort ? { sortAttribute: { attribute: "leg-count", values: [2, 4] } } : {}),
  };
}

/** The verb the child performs, read from the instruction. */
function studentActionOf(
  text: string,
  mechanic: WorksheetMechanicId,
): PageStudentAction | undefined {
  if (/\bmatch|\bjoin\b|\bdraw a line\b/i.test(text)) return "match";
  if (/\btrac(e|es|ing)\b/i.test(text)) return "trace";
  if (/\bsort|\bclassif|\bgroup(s|ing)?\s+(?:them|the|by)\b/i.test(text)) return "sort";
  if (/\bpattern|\bwhat comes next\b/i.test(text)) return "continue-pattern";
  if (/\bmore\b|\bfewer\b|\bless\b|\bcompar/i.test(text)) return "compare";
  if (/\border\b|\bsequenc/i.test(text)) return "order";
  if (/\bcount/i.test(text)) return "count";
  if (/\bwrit(e|es|ing)\b/i.test(text)) return "write";
  if (/\bfind|\bcircle\b/i.test(text)) return "find";
  return mechanic === "count-circle" ? "count" : undefined;
}

/** What kind of content the action is performed on. */
function contentDomainOf(text: string, entities: VisualAssetKey[]): PageContentDomain | undefined {
  const shapes = /\bshapes?\b|\bcircles?\b|\bsquares?\b|\btriangles?\b|\brectangles?\b/i.test(text);
  const letters = /\bletters?\b|\bsounds?\b|\balphabet\b/i.test(text);
  const numbers = /\bnumbers?\b|\bnumerals?\b|\bdigits?\b|\bhow many\b/i.test(text);
  if (shapes && !letters) return "shapes";
  if (letters) return "letters";
  if (numbers) return "numbers";
  return entities.length ? "objects" : undefined;
}

/** How the answer is recorded on paper. */
function responseModeOf(
  text: string,
  mechanic: WorksheetMechanicId,
  countAndDraw: boolean,
): PageResponseMode | undefined {
  if (countAndDraw) return "draw";
  if (/\bdraw a line\b|\bjoin\b|\bmatch/i.test(text)) return "draw-line";
  if (/\btrac(e|es|ing)\b/i.test(text)) return "trace";
  // An explicit action verb outranks the noun "group": "circle all the
  // triangles from a mixed group of shapes" is a circling page, not a sort.
  if (/\bcircl(e|es|ing)\b/i.test(text)) return "circle";
  if (/\bsort(s|ed|ing)?\b|\binto groups?\b|\bgroup(s|ing)? (them|the|by)\b|\bclassif/i.test(text))
    return "sort";
  if (/\bwrit(e|es|ing)\b/i.test(text)) return "write";
  return mechanic === "count-circle" ? "circle" : undefined;
}

export function allowedEntitiesForRequirements(
  requirements: PageSemanticRequirements,
): VisualAssetKey[] {
  const farmAnimals: VisualAssetKey[] = [
    "cow",
    "calf",
    "sheep",
    "lamb",
    "chicken",
    "chick",
    "pig",
    "piglet",
  ];
  if (/\bfarm[- ]animals?\b/i.test(requirements.pageIntent)) {
    return requirements.requiredRelationships.includes("animal-to-food")
      ? [...farmAnimals, "flower", "seed", "apple", "leaf"]
      : farmAnimals;
  }
  const topicAssets = requirements.requiredCategories.flatMap(
    (category) => matchTheme(category)?.objects ?? [],
  );
  return [...new Set([...contentEntitiesOf(requirements), ...topicAssets])];
}

/**
 * INLINE MECHANIC LISTS
 * ---------------------
 * A teacher may specify a pack without numbering the pages:
 *
 *   "Use five different mechanics: letter hunt, same/different, matching,
 *    pattern completion, trace path."
 *
 * That list is just as explicit as "Page 1: …" — each phrase is one page, in
 * written order, and its mechanic is honoured verbatim. Content is then
 * constrained by the pack LEARNING OBJECTIVE, not by the mechanic list.
 */
const mechanicPhrases: Array<{ test: RegExp; mechanic: WorksheetMechanicId }> = [
  {
    test: /letter (hunt|search|find)|find the letters?|letter recognition/i,
    mechanic: "letter-recognition",
  },
  {
    test: /number (handwriting|writ|formation|trac)|writ(e|ing) (the )?numbers?|numeral (writ|formation)/i,
    mechanic: "number-write",
  },
  {
    test: /letter (trac|writ|formation)|trace the letters?|handwriting/i,
    mechanic: "letter-trace",
  },
  { test: /quantity (to |and )?numeral|number match/i, mechanic: "count-match" },
  {
    test: /(beginning|initial|first) sounds?|sound (hunt|discrimination)|phonics sort/i,
    mechanic: "beginning-sound-discrimination",
  },
  {
    test: /same\s*[/&+-]?\s*(or\s*)?different|visual discrimination|odd one out/i,
    mechanic: "same-different",
  },
  { test: /pattern/i, mechanic: "pattern-complete" },
  { test: /trace (a )?(path|maze|line|route)|path trac|maze/i, mechanic: "trace-draw" },
  { test: /memory|concentration/i, mechanic: "memory-pairs" },
  { test: /cut (and|&) (create|paste|glue)|scissor/i, mechanic: "cut-create-build" },
  { test: /sequenc|put in order|story order/i, mechanic: "sequence-order" },
  { test: /count(ing)?/i, mechanic: "count-circle" },
  { test: /sort|classif|group(ing)?/i, mechanic: "sort-attribute" },
  { test: /find (and|&) count/i, mechanic: "find-and-count" },
  { test: /more (and|or|&) fewer|compare quantit/i, mechanic: "compare-quantity" },
  { test: /big (and|or|&) small|compare sizes?/i, mechanic: "compare-size" },
  { test: /match/i, mechanic: "match-pairs" },
  { test: /find|search|spot/i, mechanic: "find-target" },
];

export function mechanicForPhrase(phrase: string): WorksheetMechanicId | undefined {
  return mechanicPhrases.find((rule) => rule.test.test(phrase))?.mechanic;
}

function requirementsForRendererMechanic(
  text: string,
  requested: WorksheetMechanicId,
  rendered: WorksheetMechanicId,
) {
  const requirements = semanticRequirementsOf(text, rendered);
  if (!wasRendererMechanicConverted(requested, rendered)) return requirements;
  // A sort contract requires bins and drag areas that the fallback renderer
  // does not expose. Keep item totals, theme nouns, language, and all other
  // constraints, but make the child action an honest visual match.
  const { categoryGroups: _categoryGroups, sortAttribute: _sortAttribute, ...compatible } = requirements;
  return { ...compatible, studentAction: "match" as const };
}

/** Ordered mechanics named in an inline "use these mechanics: …" list. */
export function parseMechanicList(
  prompt: string,
): Array<{ text: string; mechanic: WorksheetMechanicId }> {
  const match = prompt.match(
    /\b(?:mechanics?|activities|activity types?|(?:\d{1,2}|two|three|four|five|six|seven|eight|nine|ten)\s+(?:different\s+)?(?:pages?|activities|activity types?))\s*[:\-–—]\s*([^\n.]+)/i,
  );
  if (!match) return [];
  const phrases = match[1]!
    .split(/,|;|\band\b|\bthen\b/i)
    .map((phrase) => phrase.trim())
    .filter((phrase) => phrase.length > 2);
  const entries: Array<{ text: string; mechanic: WorksheetMechanicId }> = [];
  for (const phrase of phrases) {
    const mechanic = mechanicForPhrase(phrase);
    if (mechanic) entries.push({ text: phrase, mechanic });
  }
  return entries.length >= 2 ? entries : [];
}

/**
 * Every explicitly specified page, in page order. Pages the teacher did not
 * specify simply do not appear — the planner keeps its normal behaviour there.
 */
export function parsePageDirectives(spec: WorksheetSpec): PageDirective[] {
  const prompt = spec.prompt ?? "";
  const lines = directiveLines(prompt);
  if (!lines.length) {
    // no numbered pages — an inline mechanic list is equally explicit. A
    // literacy pack keeps its literacy-native mechanics as written; a maths
    // pack maps letter mechanics onto their numeric equivalents.
    const listMath = domainForSpec(spec) === "math";
    return parseMechanicList(prompt).map((entry, index) => {
      const requested = listMath ? domainFallback(false, entry.mechanic) : entry.mechanic;
      const mechanic = rendererMechanicFor(requested);
      return {
        page: index + 1,
        text: entry.text,
        mechanic,
        semanticRequirements: requirementsForRendererMechanic(entry.text, requested, mechanic),
      };
    });
  }
  const literacy = domainForSpec(spec) === "literacy";
  const directives: PageDirective[] = [];
  for (const line of lines) {
    const requested = mechanicForDirectiveText(line.text, literacy);
    if (!requested) continue;
    const mechanic = rendererMechanicFor(requested);
    const concept = conceptOf(line.text);
    directives.push({
      page: line.page,
      text: line.text,
      mechanic,
      semanticRequirements: requirementsForRendererMechanic(line.text, requested, mechanic),
      ...(concept.letter ? { targetLetter: concept.letter } : {}),
      ...(concept.number !== undefined ? { targetNumber: concept.number } : {}),
    });
  }
  return directives;
}

export function directiveForPage(
  directives: PageDirective[],
  pageIndex: number,
): PageDirective | undefined {
  return directives.find((directive) => directive.page === pageIndex + 1);
}

/** Mechanics an explicitly specified pack is allowed to use, in page order. */
export function directiveMechanics(spec: WorksheetSpec): WorksheetMechanicId[] {
  return parsePageDirectives(spec).map((directive) => directive.mechanic);
}

export type DirectiveIssue = { code: string; message: string; page: number };

/** The letter an activity actually teaches, when it teaches one. */
function letterOfActivity(activity: WorksheetActivity): string | undefined {
  return "targetLetter" in activity ? String(activity.targetLetter).toLowerCase() : undefined;
}

/**
 * PRE-RENDER PAGE CONTRACT — compares every generated page with the page the
 * teacher specified. A mismatch is an error: the page is regenerated, never
 * printed.
 */
export function pageDirectiveIssues(
  spec: WorksheetSpec,
  project: Pick<WorksheetProject, "pages">,
): DirectiveIssue[] {
  const directives = parsePageDirectives(spec);
  if (!directives.length) return [];
  const issues: DirectiveIssue[] = [];
  for (const directive of directives) {
    const page = project.pages[directive.page - 1];
    if (!page) {
      issues.push({
        code: "page-directive-missing",
        page: directive.page,
        message: `Page ${directive.page} was specified ("${directive.text}") but the pack does not contain it.`,
      });
      continue;
    }
    const actual = mechanicOfActivity(page.activity);
    if (actual !== directive.mechanic) {
      issues.push({
        code: "page-directive-mechanic",
        page: directive.page,
        message: `Page ${directive.page} must be "${directive.mechanic}" as specified ("${directive.text}") but renders "${actual}".`,
      });
    }
    const wanted = directive.targetLetter;
    const drawn = letterOfActivity(page.activity);
    if (wanted && drawn && drawn !== wanted) {
      issues.push({
        code: "page-directive-concept",
        page: directive.page,
        message: `Page ${directive.page} must teach letter "${wanted.toUpperCase()}" but teaches "${drawn.toUpperCase()}".`,
      });
    }
    issues.push(...quantityIssues(directive, page));
    // RESPONSE MODE — match ≠ circle ≠ write. The way the child records the
    // answer is part of the request, never an implementation detail.
    const requestedResponse = directive.semanticRequirements.responseMode;
    const renderedResponse = responseModeOfActivity(page.activity);
    if (requestedResponse && renderedResponse && requestedResponse !== renderedResponse) {
      issues.push({
        code: "page-directive-response-mode",
        page: directive.page,
        message: `Page ${directive.page} must be answered by "${requestedResponse}" but the rendered page is answered by "${renderedResponse}".`,
      });
    }
  }
  // DISTINCT PAGES — two pages the teacher described differently may never
  // resolve to the same activity template.
  const byMechanic = new Map<string, PageDirective[]>();
  for (const directive of directives) {
    const list = byMechanic.get(directive.mechanic) ?? [];
    list.push(directive);
    byMechanic.set(directive.mechanic, list);
  }
  for (const [mechanic, group] of byMechanic) {
    if (group.length < 2) continue;
    const intents = new Set(group.map((entry) => entry.text.trim().toLowerCase()));
    if (intents.size < 2) continue;
    // A pattern page is defined by its RULE, not only by its mechanic: "6 AB
    // patterns" and "6 ABB patterns" are genuinely different activities even
    // though both are pattern-complete. Distinct rules per page = distinct pages.
    const ruleSignatures = group.map((entry) =>
      [...(entry.semanticRequirements.patternRules ?? [])].sort().join("+"),
    );
    if (
      ruleSignatures.every((signature) => signature.length > 0) &&
      new Set(ruleSignatures).size === group.length
    )
      continue;
    issues.push({
      code: "page-directive-duplicate-activity",
      page: group[1]!.page,
      message: `Pages ${group.map((entry) => entry.page).join(", ")} were described as different activities but all resolve to "${mechanic}".`,
    });
  }

  return issues;
}

/** How the rendered page actually records the child's answer. */
function responseModeOfActivity(activity: WorksheetActivity): PageResponseMode | undefined {
  switch (activity.kind) {
    case "picture-letter-match":
    case "match-pairs":
    case "count-match":
      return "draw-line";
    case "word-complete":
    case "letter-trace":
      return activity.kind === "word-complete" ? "write" : "trace";
    case "sound-hunt":
    case "letter-search":
    case "find-target":
    case "pick-one":
      return "circle";
    case "sort-groups":
      return "sort";
    case "count-circle":
      return activity.responseMode === "draw" ? "draw" : "circle";
    default:
      return undefined;
  }
}

/** Exact item / row / choice counts the teacher wrote for this page. */
function quantityIssues(
  directive: PageDirective,
  page: { activity: WorksheetActivity },
): DirectiveIssue[] {
  const issues: DirectiveIssue[] = [];
  const {
    requiredItemCount,
    requiredRowCount,
    requiredGroupCount,
    requiredChoiceCount,
    requiredQuantityRange,
    requiredGrid,
    requiredTargetCount,
  } = directive.semanticRequirements;
  const activity = page.activity;
  const add = (code: string, message: string) =>
    issues.push({ code, page: directive.page, message });

  const items =
    activity.kind === "picture-letter-match"
      ? activity.pictures.length
      : activity.kind === "sound-hunt"
        ? activity.items.length
        : activity.kind === "word-complete"
          ? activity.items.length
          : undefined;
  if (requiredItemCount && items !== undefined && items !== requiredItemCount) {
    add(
      "page-directive-item-count",
      `Page ${directive.page} must show exactly ${requiredItemCount} pictures, but ${items} are drawn.`,
    );
  }
  const rows =
    activity.kind === "pick-one"
      ? activity.rows.length
      : activity.kind === "letter-search"
        ? activity.rows.length
        : undefined;
  if (requiredRowCount && rows !== undefined && rows !== requiredRowCount) {
    add(
      "page-directive-row-count",
      `Page ${directive.page} must have exactly ${requiredRowCount} rows, but ${rows} are drawn.`,
    );
  }
  if (requiredChoiceCount && (activity.kind === "pick-one" || activity.kind === "count-circle")) {
    const wrong =
      activity.kind === "pick-one"
        ? activity.rows.filter((row) => row.options.length !== requiredChoiceCount)
        : activity.rows.filter((row) => row.choices.length !== requiredChoiceCount);
    if (wrong.length) {
      add(
        "page-directive-choice-count",
        `Page ${directive.page} must print exactly ${requiredChoiceCount} choices in every row.`,
      );
    }
  }
  if (requiredQuantityRange && (activity.kind === "count-circle" || activity.kind === "count-match")) {
    const [low, high] = requiredQuantityRange;
    const expected = Array.from({ length: high - low + 1 }, (_unused, index) => low + index);
    const actual = (
      activity.kind === "count-circle" ? activity.rows : activity.groups
    )
      .map((group) => group.renderedObjects.length)
      .sort((left, right) => left - right);
    if (actual.length !== expected.length || actual.some((count, index) => count !== expected[index])) {
      add(
        "page-directive-quantity-range",
        `Page ${directive.page} must draw exactly one group for every quantity from ${low} to ${high}.`,
      );
    }
  }
  if (requiredGroupCount && (activity.kind === "count-circle" || activity.kind === "count-match")) {
    const groups = activity.kind === "count-circle" ? activity.rows : activity.groups;
    if (groups.length !== requiredGroupCount) {
      add(
        "page-directive-group-count",
        `Page ${directive.page} must show exactly ${requiredGroupCount} groups, but ${groups.length} are drawn.`,
      );
    }
  }
  if (requiredGrid && activity.kind === "sound-hunt") {
    if (activity.items.length !== requiredGrid.columns * requiredGrid.rows) {
      add(
        "page-directive-grid",
        `Page ${directive.page} must render an exact ${requiredGrid.columns} × ${requiredGrid.rows} grid.`,
      );
    }
  }
  if (requiredTargetCount && activity.kind === "sound-hunt") {
    const actualTargets = activity.items.filter((item) => item.isTarget).length;
    if (actualTargets !== requiredTargetCount) {
      add(
        "page-directive-target-count",
        `Page ${directive.page} must contain exactly ${requiredTargetCount} target pictures, but ${actualTargets} are drawn.`,
      );
    }
  }
  return issues;
}

import { resolveAgeTokens } from "./age-tokens";
import { characterForAsset } from "./alfa-characters";
import {
  directionForTheme,
  resolveIllustrationStyle,
  resolveVisualDirection,
  type IllustrationPurpose,
} from "./visual-directions";
import type { WorksheetSpec } from "./creator-options";
import {
  toPaperFormat,
  type CountGroup,
  type PageSemanticRequirements,
  type RenderedCountObject,
  type VisualAssetKey,
  type WorksheetMechanicId,
  type WorksheetPageModel,
  type WorksheetProject,
} from "./worksheet-model";
import type { PrintModeId } from "./visual-directions";
import { assertActivityContract, mechanicRegistry } from "./mechanic-registry";
import { buildStageSequencePage, processForSpec } from "./worksheet-sequence";
import { resolveSubject } from "./worksheet-subjects";
import { localIllustrationAssetsForSpec } from "./illustration-library";
import {
  allowedKindsFor,
  profileForMechanic,
  resolveObjectiveProfile,
} from "./worksheet-objectives";
import { parsePageDirectives, pageDirectiveIssues } from "./page-directives";
import { planWorksheetPages, plannedActivityKinds } from "./worksheet-page-plan";
import { buildCountDrawPage, builderForMechanic } from "./worksheet-mechanics";
import { phonicsBuilderFor } from "./worksheet-phonics";
import { cutCreateBuilderFor } from "./worksheet-cut-create";
import { applyPromptIntent, domainForSpec, letterForSpec } from "./learning-domains";
import { uncoveredSkills } from "./activity-spec";
import {
  createWorksheetPagePlan,
  freezePagePlan,
  pagePlanIssues,
  type WorksheetPagePlan,
} from "./worksheet-page-contract";
import {
  assertAdvancedActivityTypeSupported,
  assertPromptActivityTypeSupported,
} from "./worksheet-renderer-support";

/** Tiny deterministic PRNG so "another version" is varied but reproducible. */
function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

function hashString(value: string) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Assets a spec is allowed to draw. When the teacher named a specific object
 * (e.g. butterflies) this returns that object only — no substitutions.
 */
export { composePage } from "./worksheet-composer";
import { composePage } from "./worksheet-composer";

export function assetsForSpec(spec: WorksheetSpec): VisualAssetKey[] {
  return localIllustrationAssetsForSpec(spec);
}

export function difficultyRange(difficulty: string): [number, number] {
  switch (difficulty) {
    case "Very Easy":
      return [1, 4];
    case "Easy":
      return [1, 6];
    case "Standard":
      return [2, 8];
    case "Challenge":
      return [4, 10];
    default:
      return [1, 10];
  }
}

/**
 * Picks distinct quantities for the page.
 *
 * When the allowed number range is narrower than the requested item count we
 * SHRINK the page instead of padding it with a repeated quantity: two groups
 * holding the same number made the match page ambiguous (two lines to one
 * number card), which is what used to trip the quality gate.
 */
function uniqueCounts(n: number, [min, max]: [number, number], next: () => number) {
  const pool: number[] = [];
  for (let v = min; v <= max; v++) pool.push(v);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  return pool.slice(0, Math.max(1, Math.min(n, pool.length)));
}

function shuffle<T>(items: T[], next: () => number) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

function renderedObjects(
  groupId: string,
  count: number,
  asset: VisualAssetKey,
): RenderedCountObject[] {
  const character = characterForAsset(asset);
  return Array.from({ length: count }, (_, i) => ({
    id: `${groupId}-object-${i + 1}`,
    asset,
    ...(character ? { character } : {}),
  }));
}

function finalizedGroup(id: string, count: number, asset: VisualAssetKey): CountGroup {
  const objects = renderedObjects(id, count, asset);
  return {
    id,
    renderedObjects: objects,
    correctAnswer: objects.length,
  };
}

function choicesFor(answer: number, [min, max]: [number, number], next: () => number, total = 3) {
  const lo = Math.max(1, Math.min(min, answer));
  const hi = Math.max(answer, max);
  const set = new Set<number>([answer]);
  let guard = 0;
  while (set.size < total && guard++ < 80) {
    const delta = 1 + Math.floor(next() * 3);
    const candidate = next() > 0.5 ? answer + delta : answer - delta;
    if (candidate >= lo && candidate <= hi) set.add(candidate);
  }
  let filler = lo;
  while (set.size < total && filler <= hi) set.add(filler++);
  return shuffle([...set], next);
}

/**
 * Reads an explicit quantity range out of the teacher's prompt, e.g.
 * "numbers 1-5", "1 to 5", "count up to 5", "within 10".
 */
export function requestedRangeFromPrompt(prompt: string): [number, number] | undefined {
  const text = (prompt ?? "").toLowerCase();
  // "ages 4–6" is an AGE band, never a quantity range
  const cleaned = text.replace(
    /\b(?:ages?|aged|years?(?: old)?)\s*\d{1,2}\s*(?:[-–—]|to)\s*\d{1,2}/g,
    " ",
  );
  const span = cleaned.match(/(\d{1,2})\s*(?:[-–—]|to)\s*(\d{1,2})/);
  if (span) {
    const a = parseInt(span[1]!, 10);
    const b = parseInt(span[2]!, 10);
    if (a >= 0 && b > 0 && b >= a) return [Math.max(1, a), b];
  }
  const upTo = text.match(/(?:up to|within|max(?:imum)?(?: of)?|no more than|until)\s*(\d{1,2})/);
  if (upTo) {
    const b = parseInt(upTo[1]!, 10);
    if (b > 0) return [1, b];
  }
  return undefined;
}

/**
 * The quantity range a page may use.
 *
 * Priority: an explicit range in the prompt ALWAYS wins (if the teacher says
 * 1–5, a group of 6 must never be generated), then the age ceiling, then the
 * difficulty band.
 */
export function rangeForSpec(spec: WorksheetSpec): [number, number] {
  const tokens = resolveAgeTokens(spec.level);
  const [min, max] = tokens.difficultyRanges[spec.difficulty] ?? difficultyRange(spec.difficulty);
  const exact = spec.promptRequirements?.exactQuantities ?? [];
  // "exactly 5" is not a suggestion to stay within a range: it is the
  // printable quantity. Keep this before the general range parser so every
  // rendered count group is faithful to the teacher's wording.
  if (exact.length === 1) return [exact[0]!, exact[0]!];
  const asked = requestedRangeFromPrompt(spec.prompt ?? "");
  if (asked) {
    const [lo, hi] = asked;
    return [Math.max(1, Math.min(lo, hi)), Math.max(1, hi)];
  }
  const cap = Math.min(max, tokens.maxQuantity);
  return [Math.min(min, cap), Math.max(1, cap)];
}

/**
 * Compact paper must preserve readable artwork rather than squeeze a full A4
 * workload into smaller cards. Explicit teacher-requested group counts still
 * win; this budget only governs open-ended local generation.
 */
function itemBudgetForPaper(spec: WorksheetSpec, defaultItems: number) {
  const paper = toPaperFormat(spec.paper);
  // A row containing a high quantity wraps across several visual lines. Four
  // open-ended groups is the largest reliable workload that retains the local
  // asset minimum on A4/Letter; compact A5 needs two generous groups.
  if (paper === "A5") return Math.min(defaultItems, 2);
  return Math.min(defaultItems, 4);
}

function circleRowBudgetForPaper(spec: WorksheetSpec, defaultItems: number) {
  if (toPaperFormat(spec.paper) === "A5") return Math.min(defaultItems, 2);
  return Math.max(3, defaultItems - 2);
}

/** Reorders values so no value keeps its original row (a derangement). */
function scramble(values: number[], next: () => number) {
  if (values.length < 2) return [...values];
  for (let attempt = 0; attempt < 60; attempt++) {
    const candidate = shuffle(values, next);
    if (candidate.every((v, i) => v !== values[i])) return candidate;
  }
  const rotated = [...values.slice(1), values[0]!];
  return rotated;
}

/** Resolves the art-direction layer for a spec — independent of the content. */
export function directionForSpec(spec: WorksheetSpec) {
  return resolveVisualDirection(directionForTheme(spec.theme, spec.inspiration));
}

/** Art rules for one page: direction + age + what the page is for. */
export function styleForPage(spec: WorksheetSpec, purpose: IllustrationPurpose) {
  return resolveIllustrationStyle({
    direction: directionForSpec(spec),
    purpose,
    ageId: resolveAgeTokens(spec.level).id,
  });
}

export function buildCountMatchPage(
  spec: WorksheetSpec,
  seed: number,
  requirements?: PageSemanticRequirements,
): WorksheetPageModel {
  const next = rng(seed);
  const tokens = resolveAgeTokens(spec.level);
  const requiredQuantityRange = requirements?.requiredQuantityRange;
  const range: [number, number] = requiredQuantityRange
    ? [...requiredQuantityRange]
    : rangeForSpec(spec);
  const subject = resolveSubject(spec);
  const assets = requirements?.requiredEntities.length
    ? requirements.requiredEntities
    : subject.locked
      ? subject.assets
      : shuffle(localIllustrationAssetsForSpec(spec, "count-match", { seed }), next);
  const counts = requiredQuantityRange
    ? shuffle(
        Array.from({ length: range[1] - range[0] + 1 }, (_unused, index) => range[0] + index),
        next,
      )
    : uniqueCounts(
        requirements?.requiredGroupCount ?? itemBudgetForPaper(spec, tokens.itemsPerPage),
        range,
        next,
      );

  const groups: CountGroup[] = counts.map((count, i) => {
    const asset = assets[i % assets.length]!;
    const id = `p1-g${i + 1}`;
    return finalizedGroup(id, count, asset);
  });

  return {
    id: "page-1",
    title: `Count the ${subject.label}`,
    instruction: `Count the ${subject.plural} in each group. Draw a line to the correct number.`,
    activityType: "Count & Match",
    layout: "two-column-match",
    purpose: "counting",
    illustrationStyle: styleForPage(spec, "counting"),
    ...(requirements?.requiredEntities.length ? { contentLocked: true } : {}),
    // the mascot must belong to the topic: an insect mascot on a space sheet
    // would contradict the content, so fall back to none when unrelated
    mascot: characterForAsset(subject.assets[0]!),
    activity: {
      kind: "count-match",
      groups,
      // ANSWER BANK: exactly one number card per group, shuffled so no card
      // sits opposite the group it belongs to. Quantities on a page are always
      // distinct, so the bank is a strict one-to-one set of correct answers.
      numberChoices: scramble(
        groups.map((g) => g.renderedObjects.length),
        next,
      ),
      ...(requirements?.numberBankSide ? { numberBankSide: requirements.numberBankSide } : {}),
    },
    answerKey: groups.map((g) => ({ groupId: g.id, answer: g.renderedObjects.length })),
    footerNote: "Take your time. Point to each one as you count.",
  };
}

export function buildCountCirclePage(
  spec: WorksheetSpec,
  seed: number,
  requirements?: PageSemanticRequirements,
): WorksheetPageModel {
  const next = rng(seed + 977);
  const tokens = resolveAgeTokens(spec.level);
  const requiredQuantityRange = requirements?.requiredQuantityRange;
  const range: [number, number] = requiredQuantityRange
    ? [...requiredQuantityRange]
    : rangeForSpec(spec);
  const subject = resolveSubject(spec);
  const assets = requirements?.requiredEntities.length
    ? requirements.requiredEntities
    : subject.locked
      ? subject.assets
      : shuffle(localIllustrationAssetsForSpec(spec, "count-circle", { seed }), next);
  const explicitGroups = requirements?.requiredCountGroups;
  // fewer, larger blocks on the circle page: each row needs room for 3 big cards
  const counts = explicitGroups?.length
    ? explicitGroups.map((group) => group.count)
    : requiredQuantityRange
    ? shuffle(
        Array.from({ length: range[1] - range[0] + 1 }, (_unused, index) => range[0] + index),
        next,
      )
    : uniqueCounts(
        requirements?.requiredGroupCount ?? circleRowBudgetForPaper(spec, tokens.itemsPerPage),
        range,
        next,
      );

  const rows = counts.map((count, i) => {
    const asset = explicitGroups?.[i]?.asset ?? assets[(i + 2) % assets.length]!;
    const id = `p2-r${i + 1}`;
    return {
      ...finalizedGroup(id, count, asset),
      choices: choicesFor(count, range, next, requirements?.requiredChoiceCount ?? tokens.answerChoices),
    };
  });

  return {
    id: "page-2",
    title: "How Many Can You Find?",
    instruction: `Count the ${subject.plural} in each row. Circle the correct number.`,
    activityType: "Count & Circle",
    layout: "stacked-rows",
    purpose: "counting",
    illustrationStyle: styleForPage(spec, "counting"),
    ...(requirements?.requiredEntities.length ? { contentLocked: true } : {}),
    mascot: characterForAsset(subject.assets[subject.assets.length - 1]!),
    activity: {
      kind: "count-circle",
      rows,
      challenge: `Can you find the row with the most ${subject.plural}?`,
    },
    answerKey: rows.map((r) => ({ groupId: r.id, answer: r.renderedObjects.length })),
  };
}

/** Maps the creator's printing choice onto an Alfa print mode. */
export function printModeForSpec(spec: WorksheetSpec): PrintModeId {
  const v = spec.printing.toLowerCase();
  if (/black|coloring|colouring|grayscale/.test(v)) return "bw";
  if (/ink/.test(v)) return "ink";
  if (/soft|light/.test(v)) return "soft";
  return "premium";
}

/**
 * Chooses the page activities that actually match the requested activity type.
 * A "Matching" request never produces circle-the-answer pages, and vice versa.
 */
export function buildersForSpec(spec: WorksheetSpec) {
  // an objective-specific mechanic (more/fewer, patterns, sequencing…) always
  // wins: the printable must practise the objective it was created from
  const profile = resolveObjectiveProfile(spec);
  const mechanicBuilder =
    phonicsBuilderFor(profile.mechanic, domainForSpec(spec) === "literacy") ??
    builderForMechanic(profile);
  if (mechanicBuilder) {
    const range = rangeForSpec(spec);
    return [(s: WorksheetSpec, seed: number) => mechanicBuilder({ spec: s, profile, seed, range })];
  }
  const kinds = allowedKindsFor(spec);
  const builders = [];
  if (kinds.includes("count-match")) builders.push(buildCountMatchPage);
  if (kinds.includes("count-circle")) builders.push(buildCountCirclePage);
  return builders.length ? builders : [buildCountMatchPage];
}

/** Letter mechanics are titled after the LETTER, never after theme vocabulary. */
const letterMechanics: WorksheetMechanicId[] = [
  "letter-recognition",
  "letter-trace",
  "letter-sort",
  "beginning-sound-discrimination",
];

/**
 * Pack title derived from the LEARNING OBJECTIVE.
 *
 * A title is never assembled by joining the vocabulary the generator happened
 * to draw ("Trace the Tractors & Birds & Books"): it names the objective and,
 * for a multi-skill phonics pack, the letter it teaches.
 */
function titleForPack(spec: WorksheetSpec, plan: WorksheetMechanicId[]) {
  const mechanic = plan[0]!;
  const entry = mechanicRegistry[mechanic];
  if (mechanic === "sequence-order") {
    const process = processForSpec(spec);
    if (process) return process.label;
  }
  if (letterMechanics.includes(mechanic)) {
    const letter = letterForSpec(spec).toUpperCase();
    const distinct = new Set(plan);
    if (distinct.size > 1 || plan.includes("beginning-sound-discrimination")) {
      return `Letter ${letter} Phonics Pack`;
    }
    return entry.title(`Letter ${letter}`);
  }
  // A MIXED pack is never named after its first page: three or more different
  // activity types make it a pack, so the title describes the whole pack.
  if (new Set(plan).size >= 3) return packTitle(spec);
  return entry.title(resolveSubject(spec).label);
}

/** Pack-level title: what the whole pack teaches, not what page 1 does. */
function packTitle(spec: WorksheetSpec) {
  const domain = domainForSpec(spec);
  if (domain === "literacy") return `Letter ${letterForSpec(spec).toUpperCase()} Phonics Pack`;
  if (domain === "math") {
    const range = (spec.prompt ?? "").match(/\bnumbers?\s*(\d{1,2})\s*(?:-|–|—|to)\s*(\d{1,2})\b/i);
    if (range) return `Numbers ${range[1]}–${range[2]} Early Math Pack`;
    return `${resolveSubject(spec).label} Early Math Pack`;
  }
  if (domain === "craft") return `${resolveSubject(spec).label} Cut & Create Pack`;
  return `${resolveSubject(spec).label} Activity Pack`;
}

function requestedPageCount(spec: WorksheetSpec) {
  return Math.max(1, Math.min(parseInt(spec.pages, 10) || 2, 20));
}

/** Activity kinds the planned pack is allowed to render. */
export function allowedActivityKinds(rawSpec: WorksheetSpec) {
  const spec = applyPromptIntent(rawSpec);
  return plannedActivityKinds(spec, requestedPageCount(spec));
}

/**
 * PRE-RENDER CONTRACT CHECK — runs on every generated page, for every mechanic.
 * The page that leaves the generator must be the activity that was planned.
 */
function assertPlanned(
  mechanic: WorksheetMechanicId,
  page: WorksheetPageModel,
): WorksheetPageModel {
  assertActivityContract(mechanic, page.activity, page.title || "page");
  return page;
}

/** Builds one page for an explicitly planned mechanic. */
function buildPlannedPage(
  spec: WorksheetSpec,
  pagePlan: WorksheetPagePlan,
  seed: number,
  excludedWords: string[] = [],
): WorksheetPageModel {
  const mechanic = pagePlan.requestedMechanic;
  const craft = cutCreateBuilderFor(mechanic);
  if (craft) return assertPlanned(mechanic, craft({ spec, seed, styleFor: styleForPage }));
  // SEQUENCING has its own content model (ordered stages), so it is generated
  // from process data — never from quantities of a themed object.
  if (mechanic === "sequence-order") {
    const process = processForSpec(spec);
    if (process) {
      return assertPlanned(
        mechanic,
        buildStageSequencePage({
          spec,
          seed,
          process,
          illustrationStyle: styleForPage(spec, "sequencing"),
        }),
      );
    }
  }
  if (mechanic === "count-match")
    return assertPlanned(
      mechanic,
      buildCountMatchPage(spec, seed, pagePlan.semanticRequirements),
    );
  // COUNT & DRAW keeps the counting mechanic but changes the RESPONSE MODE, so
  // it is built by its own renderer rather than the circle-a-numeral page.
  if (mechanic === "count-circle" && pagePlan.semanticRequirements.responseMode === "draw") {
    return assertPlanned(
      mechanic,
      buildCountDrawPage({
        spec,
        profile: profileForMechanic(mechanic, spec),
        seed,
        range: rangeForSpec(spec),
        semanticRequirements: pagePlan.semanticRequirements,
      }),
    );
  }
  if (mechanic === "count-circle")
    return assertPlanned(
      mechanic,
      buildCountCirclePage(spec, seed, pagePlan.semanticRequirements),
    );
  const profile = profileForMechanic(mechanic, spec);
  const phonics = phonicsBuilderFor(mechanic, domainForSpec(spec) === "literacy");
  // Literacy builders receive the page's own semantic requirements so an
  // explicitly requested quantity ("6 pictures", "5 rows of 3 choices") is
  // rendered exactly, not approximated from the age band.
  if (phonics)
    return assertPlanned(
      mechanic,
      phonics({
        spec,
        profile,
        seed,
        range: rangeForSpec(spec),
        semanticRequirements: pagePlan.semanticRequirements,
        excludedWords,
      }),
    );
  const builder = builderForMechanic(profile);
  // COUNTING IS NOT A UNIVERSAL FALLBACK: an unrenderable mechanic is a build
  // error, never a silently substituted counting page.
  if (!builder) {
    throw new Error(`No printable renderer is registered for the "${mechanic}" activity mechanic.`);
  }
  return assertPlanned(
    mechanic,
    builder({
      spec,
      profile,
      seed,
      range: rangeForSpec(spec),
      semanticRequirements: pagePlan.semanticRequirements,
    }),
  );
}

/**
 * Ages 2–3 get one instruction and nothing else to read: extra challenge lines
 * and footer notes are removed rather than shrunk.
 */
function adaptForPedagogicalLevel(spec: WorksheetSpec, page: WorksheetPageModel): WorksheetPageModel {
  const tokens = resolveAgeTokens(spec.level);
  const activity = { ...page.activity } as WorksheetPageModel["activity"];
  if (tokens.instructionSteps === 1 && "challenge" in activity) {
    delete (activity as { challenge?: string }).challenge;
  }
  const support =
    tokens.visualScaffolding === "high"
      ? " Point to each picture as you work."
      : tokens.visualScaffolding === "medium"
        ? " Work carefully, then check your choice."
        : " Show your thinking and check your answer.";
  const adapted: WorksheetPageModel = {
    ...page,
    activity,
    instruction: `${page.instruction.replace(/\s*(Point to each picture as you work\.|Work carefully, then check your choice\.|Show your thinking and check your answer\.)$/, "")}${support}`,
  };
  if (tokens.writingDemand === "none") delete adapted.footerNote;
  return adapted;
}

/**
 * Keeps repeated mechanics from reading like a photocopy: the second and third
 * time a mechanic appears in a pack it gets its own page heading.
 */
const repeatTitles = ["Practise Again", "One More Round", "Review Page"];

function titleForRepeat(
  page: WorksheetPageModel,
  repeatIndex: number,
  isFinalPage = false,
): WorksheetPageModel {
  if (repeatIndex === 0) return page;
  // the closing page of a pack reads as a review, not as another practice sheet
  if (isFinalPage) return { ...page, title: `${page.title} — Review` };
  const suffix = repeatTitles[(repeatIndex - 1) % repeatTitles.length]!;
  return { ...page, title: `${page.title} — ${suffix}` };
}

/** Deterministic prototype generator — no external AI involved. */
export function buildWorksheetProject(
  rawSpec: WorksheetSpec,
  version = 1,
  options: {
    /**
     * GRACEFUL FALLBACK ONLY. Page index (0-based) → the closest supported
     * mechanic to build instead of the requested one, used when the requested
     * activity cannot be represented correctly. The page stops being an
     * explicit contract page so the pack is judged on educational quality.
     */
    mechanicOverrides?: Record<number, WorksheetMechanicId>;
  } = {},
): WorksheetProject {
  // THE PROMPT IS THE SOURCE OF TRUTH: normalize the spec against the current
  // prompt before anything is generated, so stale defaults (Counting/Insects)
  // can never leak into a phonics or science request.
  const spec = applyPromptIntent(rawSpec);
  assertAdvancedActivityTypeSupported(spec);
  assertPromptActivityTypeSupported(spec);
  // The seed includes the complete CURRENT request. A new prompt therefore has
  // a new generation identity even when its dropdown settings match the prior one.
  const seed = hashString(`${JSON.stringify(spec)}|v${version}`);
  const requested = requestedPageCount(spec);

  const overrides = options.mechanicOverrides ?? {};
  const overridden = new Set(Object.keys(overrides).map((key) => Number(key)));
  const applyOverrides = (mechanics: WorksheetMechanicId[]) =>
    mechanics.map((mechanic, index) => overrides[index] ?? mechanic);
  const relax = (entries: WorksheetPagePlan[]) =>
    entries.map((entry) =>
      overridden.has(entry.page - 1)
        ? { ...entry, explicit: false, prohibitedEntities: [], prohibitedMechanics: [] }
        : entry,
    );
  const makePlan = (mechanics: WorksheetMechanicId[]) =>
    relax(createWorksheetPagePlan(spec, mechanics));

  let plan = applyOverrides(planWorksheetPages(spec, requested));
  let pagePlan = makePlan(plan);
  // pages the teacher specified one by one are frozen: neither the coverage
  // gate nor any later repair pass may reassign them
  const directives = parsePageDirectives(spec);
  const frozen = new Set([...directives.map((directive) => directive.page - 1), ...overridden]);

  const wordsOnPage = (page: WorksheetPageModel): string[] => {
    if (page.activity.kind === "sound-hunt" || page.activity.kind === "word-complete") {
      return page.activity.items.map((item) => item.word.toLowerCase());
    }
    if (page.activity.kind === "picture-letter-match") {
      return page.activity.pictures.map((picture) => picture.word.toLowerCase());
    }
    return [];
  };
  const earlierWordsFor = (index: number) => pages.slice(0, index).flatMap(wordsOnPage);
  const buildPages = (contracts: WorksheetPagePlan[]) => {
    const seen = new Map<WorksheetMechanicId, number>();
    const builtPages: WorksheetPageModel[] = [];
    for (const [i, contract] of contracts.entries()) {
      const mechanic = contract.requestedMechanic;
      const repeatIndex = seen.get(mechanic) ?? 0;
      seen.set(mechanic, repeatIndex + 1);
      const keepPicturesDistinct = /\bdifferent from pages?\b/i.test(contract.requiredContent);
      const excludedWords = keepPicturesDistinct ? builtPages.flatMap(wordsOnPage) : [];
      const built = buildPlannedPage(spec, contract, seed + i * 131, excludedWords);
      const page = titleForRepeat(
        adaptForPedagogicalLevel(spec, built),
        repeatIndex,
        i === contracts.length - 1,
      );
      builtPages.push({ ...page, id: `page-${i + 1}` });
    }
    return builtPages;
  };

  let pages: WorksheetPageModel[] = buildPages(pagePlan);

  // COVERAGE GATE — an explicitly requested skill may never be dropped. If one
  // is missing, the pack is REPLANNED (the least valuable repeated page is
  // spent on the missing skill) and rebuilt before anything is rendered.
  for (let attempt = 0; attempt < 3; attempt++) {
    const missing = uncoveredSkills(spec, { pages } as WorksheetProject);
    if (!missing.length) break;
    const nextPlan = [...plan];
    for (const skill of missing) {
      const slot = nextPlan
        .map((mechanic, index) => ({ mechanic, index }))
        .filter(({ mechanic, index }) => !frozen.has(index) && nextPlan.indexOf(mechanic) !== index)
        .pop();
      const index = slot
        ? slot.index
        : (() => {
            for (let i = nextPlan.length - 1; i >= 0; i--) if (!frozen.has(i)) return i;
            return -1;
          })();
      if (index >= 0) nextPlan[index] = skill;
    }
    plan = nextPlan;
    pagePlan = makePlan(plan);
    pages = buildPages(pagePlan);
  }

  // PAGE-DIRECTIVE GATE — before anything is rendered, every specified page is
  // compared with the page the teacher asked for. Only an offending page is
  // regenerated; the rest of the pack is left untouched.
  for (let attempt = 0; attempt < 3; attempt++) {
    const issues = pageDirectiveIssues(spec, { pages } as WorksheetProject);
    if (!issues.length) break;
    for (const issue of issues) {
      const directive = directives.find((entry) => entry.page === issue.page);
      if (!directive) continue;
      const index = directive.page - 1;
      // a page already handed to the graceful fallback keeps its substitute
      if (overridden.has(index)) continue;
      plan[index] = directive.mechanic;
      pagePlan = makePlan(plan);
      const rebuilt = buildPlannedPage(
        spec,
        pagePlan[index]!,
        seed + index * 131 + attempt * 17,
        earlierWordsFor(index),
      );
      pages[index] = {
          ...adaptForPedagogicalLevel(spec, rebuilt),
        id: `page-${index + 1}`,
      };
    }
  }

  // GENERIC PAGE-PLAN GATE — deterministic builders should satisfy this on the
  // first pass; future AI builders get two page-local repair attempts.
  for (let attempt = 0; attempt < 2; attempt++) {
    const issues = pagePlanIssues(pagePlan, { pages });
    if (!issues.length) break;
    for (const issue of issues) {
      const index = issue.page - 1;
      const contract = pagePlan[index];
      if (!contract) continue;
      const rebuilt = buildPlannedPage(
        spec,
        contract,
        seed + index * 131 + (attempt + 1) * 7919,
        earlierWordsFor(index),
      );
      pages[index] = { ...adaptForPedagogicalLevel(spec, rebuilt), id: `page-${index + 1}` };
    }
  }

  // COMPOSITION FALLBACK — a page whose specification no template can satisfy
  // is COMPOSED from reusable educational components. The requested mechanic,
  // student action and response mode are kept exactly; only the way the page is
  // assembled changes. Substituting a different activity is never allowed.
  for (const issue of pagePlanIssues(pagePlan, { pages })) {
    const index = issue.page - 1;
    const contract = pagePlan[index];
    if (!contract) continue;
    pages[index] = {
      ...composePage({
        spec,
        mechanic: contract.requestedMechanic,
        requirements: contract.semanticRequirements,
        page: index + 1,
        seed: seed + index * 131,
        range: rangeForSpec(spec),
      }),
      id: `page-${index + 1}`,
    };
  }

  // IMMUTABLE CONTRACT — frozen and carried with the project. Explicit pages
  // whose rendered mechanic differs are hard-blocked downstream.
  const frozenContract = freezePagePlan(pagePlan);
  const generationSpecification = Object.freeze({
    rawPrompt: rawSpec.prompt ?? "",
    requestedPageCount: requested,
    normalizedSpec: Object.freeze({
      prompt: spec.prompt,
      level: spec.level,
      duration: spec.duration,
      pages: spec.pages,
      approach: spec.approach,
      skill: spec.skill,
      activityType: spec.activityType,
      difficulty: spec.difficulty,
      theme: spec.theme,
      palette: spec.palette,
      inspiration: spec.inspiration,
      language: spec.language,
      paper: spec.paper,
      printing: spec.printing,
    }),
    ...(spec.promptRequirements ? { promptRequirements: structuredClone(spec.promptRequirements) } : {}),
    pages: frozenContract,
  });

  const substitutions = [...overridden]
    .sort((a, b) => a - b)
    .map((index) => ({
      page: index + 1,
      requestedMechanic: (planWorksheetPages(spec, requested)[index] ??
        plan[index]!) as WorksheetMechanicId,
      substitutedMechanic: plan[index]!,
      reason: "closest supported activity for the same learning objective",
    }));

  return {
    pagePlanContract: frozenContract,
    generationSpecification,
    ...(substitutions.length ? { substitutions } : {}),

    id: `ws-${seed}-${version}`,
    source: "deterministic",
    // THE TITLE DESCRIBES THE ACTIVITY, not a leftover skill field: a
    // sequencing pack can never be called "… Counting".
    title: titleForPack(spec, plan),
    subtitle: `${spec.level} · ${spec.approach}-inspired · ${spec.duration}`,
    meta: {
      level: spec.level,
      ageRange: spec.level,
      difficulty: spec.difficulty,
      theme: spec.theme,
      palette: spec.palette,
      approach: spec.approach,
      skill: mechanicRegistry[plan[0]!].skill,
      language: spec.language,
      duration: spec.duration,
      paper: toPaperFormat(spec.paper),
      printing: spec.printing,
      ...(spec.printableFormat ? { printableFormat: spec.printableFormat } : {}),
    },
    intent: {
      ...(spec.objectiveId ? { objectiveId: spec.objectiveId } : {}),
      ...(spec.mechanicId ? { mechanicId: spec.mechanicId } : {}),
      ...(spec.objective ? { objective: spec.objective } : {}),
      skill: spec.skill,
      level: spec.level,
      theme: spec.theme,
      difficulty: spec.difficulty,
      ...(spec.printableFormat ? { printableFormat: spec.printableFormat } : {}),
    },
    visualDirection: directionForSpec(spec).id,
    illustrationStyle: styleForPage(spec, "counting"),
    printMode: printModeForSpec(spec),
    pages,
    teacherNotes: [
      `Prepared for ${spec.level} · ${spec.difficulty} · ${spec.duration}.`,
      "Offer one page at a time and let the child point and count aloud.",
      "Answers are stored with the worksheet for a future teacher answer key.",
    ],
  };
}

import type { WorksheetSpec } from "./creator-options";
import { allowedActivityKinds, buildWorksheetProject, rangeForSpec } from "./worksheet-builder";
import { resolveSubject } from "./worksheet-subjects";
import {
  flattenComponents,
  type CountGroup,
  type RenderedCountObject,
  type VisualAssetKey,
  type WorksheetMechanicId,
  type WorksheetPageModel,
  type WorksheetProject,
} from "./worksheet-model";
import { equivalentMechanics } from "./worksheet-page-fallback";
import { sortBinAccepts } from "./worksheet-model";
import { applyPromptIntent, domainForSpec } from "./learning-domains";
import { validateWorksheetProject, type ValidationResult } from "./worksheet-validation";
import {
  mechanicOfActivity,
  resolveObjectiveProfile,
  specHasObjective,
} from "./worksheet-objectives";
import { validateStageSequence } from "./worksheet-sequence";
import { validateMemoryPairs } from "./worksheet-memory";
import { parseRequestedSkills, validateHandoffContract } from "./activity-spec";
import { skillFidelityIssues } from "./skill-fidelity";
import { pageDirectiveIssues, parsePageDirectives } from "./page-directives";
import { fitPageLayout } from "./worksheet-layout";
import {
  enforceObjectiveFidelity,
  objectiveFidelityIssues,
  resolveLearningObjective,
} from "./learning-objective";
import { enforceThemeAndPedagogy, packQualityIssues } from "./theme-fidelity";
import { clarifyPageInstruction } from "./worksheet-semantic-qa";
import { answerSemanticIssues, repairAnswerSemantics } from "./answer-semantics";
import {
  createWorksheetPagePlan,
  explicitMechanicBreaches,
  pagePlanIssues,
} from "./worksheet-page-contract";
import { planWorksheetPages } from "./worksheet-page-plan";
import { composedShapeMatchIssues, shapeMatchIssues } from "./object-semantics";

/**
 * Structured worksheet contract.
 *
 * The UI only ever renders this shape, so a real AI generation service can be
 * plugged in later (server function / AI gateway) by providing another
 * `WorksheetGenerator` implementation — no interface rebuild required.
 */
export type WorksheetExercise = {
  instruction: string;
  prompt: string;
  answerFormat: "count-boxes" | "trace-line" | "match-pairs" | "open";
  items: string[];
};

export type WorksheetPage = {
  pageNumber: number;
  title: string;
  objective: string;
  exercises: WorksheetExercise[];
  illustrationNote: string;
};

export type WorksheetDocument = {
  source: "mock" | "ai";
  title: string;
  subtitle: string;
  overview: string;
  materials: string[];
  teacherNotes: string[];
  pages: WorksheetPage[];
  spec: WorksheetSpec;
};

export type WorksheetGenerator = (spec: WorksheetSpec) => Promise<WorksheetDocument>;

function pageCount(spec: WorksheetSpec) {
  const n = parseInt(spec.pages, 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 20) : 1;
}

function countsFor(difficulty: string, page: number): string[] {
  const base =
    difficulty === "Very Easy"
      ? [1, 2, 3]
      : difficulty === "Easy"
        ? [2, 3, 4]
        : difficulty === "Standard"
          ? [3, 5, 7]
          : difficulty === "Challenge"
            ? [6, 8, 10]
            : [2, 5, 9];
  return base.map((n) => `${n + (page - 1)}`);
}

/** Mock generator — clearly labelled sample content, no AI connected. */
export const mockWorksheetGenerator: WorksheetGenerator = async (spec) => {
  await new Promise((r) => setTimeout(r, 650));
  const total = pageCount(spec);
  const subject = spec.theme === "Insects" ? "butterflies" : spec.theme.toLowerCase();

  return {
    source: "mock",
    title: `${spec.theme} ${spec.activityType}: ${spec.skill}`,
    subtitle: `${spec.level} · ${spec.duration} · ${spec.approach}`,
    overview:
      spec.prompt.trim() ||
      `A ${spec.duration.toLowerCase()} ${spec.approach} ${spec.skill.toLowerCase()} activity for ${spec.level}, themed around ${subject}.`,
    materials: [
      `${spec.paper} paper, printed in ${spec.printing.toLowerCase()}`,
      "Pencil or crayon",
      spec.activityType === "Cut & Paste" || spec.activityType === "Scissor Skills"
        ? "Child-safe scissors and glue stick"
        : "Optional counting tokens",
    ],
    teacherNotes: [
      `Set out one page at a time to keep the ${spec.duration.toLowerCase()} session calm and focused.`,
      `Difficulty is set to ${spec.difficulty} — invite the child to say each number aloud while pointing.`,
      `Illustrations follow a ${spec.inspiration} mood in a ${spec.palette} palette (atmosphere only, original artwork).`,
    ],
    pages: Array.from({ length: total }, (_, i) => {
      const page = i + 1;
      return {
        pageNumber: page,
        title: `Page ${page} — Count the ${subject}`,
        objective: `${spec.skill} practice with sets of ${subject}, ${spec.difficulty.toLowerCase()} level.`,
        illustrationNote: `Soft ${spec.palette.toLowerCase()} illustration of a ${spec.theme.toLowerCase()} scene, ${spec.inspiration.toLowerCase()} mood.`,
        exercises: [
          {
            instruction:
              spec.language === "French"
                ? `Compte les ${subject} et écris le nombre.`
                : `Count the ${subject} in each row and write the number.`,
            prompt: `Three rows of ${subject} illustrations.`,
            answerFormat: "count-boxes",
            items: countsFor(spec.difficulty, page),
          },
          {
            instruction: `Trace the number and colour that many ${subject}.`,
            prompt: "Dotted numerals with matching colouring set.",
            answerFormat: "trace-line",
            items: countsFor(spec.difficulty, page),
          },
        ],
      };
    }),
    spec,
  };
};

/** Swap this for the AI-backed generator when the service is connected. */
export const generateWorksheet: WorksheetGenerator = mockWorksheetGenerator;

/* -----------------------------------------------------------------
 * Structured printable project generation.
 *
 * Same abstraction, richer contract: a `WorksheetProjectGenerator`
 * returns the structured page model that Alfa's renderer draws. An AI
 * service can later implement this interface and the renderer, studio
 * actions and print pipeline all keep working unchanged.
 * ----------------------------------------------------------------- */
export type WorksheetProjectGenerator = (
  spec: WorksheetSpec,
  version?: number,
) => Promise<WorksheetProject>;

export const deterministicProjectGenerator: WorksheetProjectGenerator = async (
  spec,
  version = 1,
) => {
  await new Promise((r) => setTimeout(r, 450));
  return buildValidWorksheetProject(spec, version);
};

/**
 * Converts legacy/generated counting items to the one canonical final shape.
 * The returned renderedObjects array is the source used by preview, print/PDF,
 * answer choices, the answer key, and validation. Independent stored counts are
 * intentionally discarded here.
 */
function canonicalGroup(group: CountGroup): CountGroup {
  if (Array.isArray(group.renderedObjects) && group.renderedObjects.length > 0) {
    const renderedObjects = group.renderedObjects.map((object) => Object.freeze({ ...object }));
    Object.freeze(renderedObjects);
    return Object.freeze({
      id: group.id,
      renderedObjects,
      correctAnswer: renderedObjects.length,
      ...(group.label ? { label: group.label } : {}),
    });
  }

  const legacy = group as unknown as {
    id: string;
    count?: number;
    asset?: VisualAssetKey;
    character?: RenderedCountObject["character"];
    label?: string;
  };
  const count = Math.max(1, Math.min(10, legacy.count ?? 1));
  const asset = legacy.asset ?? "butterfly";
  const renderedObjects: RenderedCountObject[] = Array.from({ length: count }, (_, i) => ({
    id: `${legacy.id}-object-${i + 1}`,
    asset,
    ...(legacy.character ? { character: legacy.character } : {}),
  }));
  renderedObjects.forEach(Object.freeze);
  Object.freeze(renderedObjects);
  return Object.freeze({
    id: legacy.id,
    renderedObjects,
    correctAnswer: renderedObjects.length,
    ...(legacy.label ? { label: legacy.label } : {}),
  });
}

function derivedCircleChoices(answer: number, range: [number, number], total: number) {
  const [min, max] = range;
  const choices = new Set<number>([answer]);
  for (let distance = 1; choices.size < total && distance <= 10; distance++) {
    if (answer - distance >= min) choices.add(answer - distance);
    if (choices.size < total && answer + distance <= max) choices.add(answer + distance);
  }
  return [...choices].sort((a, b) => a - b);
}

function finalizePage(page: WorksheetPageModel, range: [number, number]): WorksheetPageModel {
  // objective-specific mechanics (compare, pattern, sequence, sorting…) are
  // already finalized by their builder: their answers are option ids or bin
  // totals, not counts read off one group.
  if (
    page.activity.kind === "pick-one" ||
    page.activity.kind === "order-sequence" ||
    page.activity.kind === "sequence-stages" ||
    page.activity.kind === "sort-groups" ||
    page.activity.kind === "letter-search" ||
    page.activity.kind === "letter-trace" ||
    page.activity.kind === "cut-create"
  ) {
    return page;
  }
  if (page.activity.kind === "find-count") {
    // the scene is the source of truth: the counted target set is exactly the
    // non-decorative scene objects, and the answer is that array's length
    const targets = page.activity.sceneObjects.filter((object) => !object.decorative);
    const group = canonicalGroup({
      id: page.activity.group.id,
      renderedObjects: targets.map(({ xPct: _x, yPct: _y, decorative: _d, ...object }) => object),
      correctAnswer: targets.length,
    });
    return {
      ...page,
      activity: {
        ...page.activity,
        group,
        choices: derivedCircleChoices(
          group.correctAnswer,
          range,
          page.activity.choices.length || 3,
        ),
      },
      answerKey: [{ groupId: group.id, answer: group.correctAnswer }],
    };
  }
  if (page.activity.kind === "memory-pairs") return page;
  // beginning-sound discrimination derives its answers from vocabulary, not
  // from quantities: nothing to canonicalise here.
  if (page.activity.kind === "sound-hunt") return page;
  // letter matching and word completion carry no quantities at all
  if (page.activity.kind === "picture-letter-match") return page;
  if (page.activity.kind === "word-complete") return page;
  if (
    page.activity.kind === "find-target" ||
    page.activity.kind === "match-pairs" ||
    page.activity.kind === "trace-draw"
  )
    return page;

  if (page.activity.kind === "count-match") {
    const groups = page.activity.groups.map(canonicalGroup);
    const answers = groups.map((group) => group.correctAnswer);
    return {
      ...page,
      activity: { ...page.activity, groups, numberChoices: [...answers].reverse() },
      answerKey: groups.map((group) => ({
        groupId: group.id,
        answer: group.correctAnswer,
      })),
    };
  }

  if (page.activity.kind !== "count-circle") return page;
  // COUNT & DRAW answers are drawn, not circled: the row keeps an empty choice
  // bank so no number cards are printed over the drawing box.
  const drawResponse = page.activity.responseMode === "draw";
  const rows = page.activity.rows.map((row) => {
    const group = canonicalGroup(row);
    return {
      ...group,
      choices: drawResponse
        ? []
        : derivedCircleChoices(group.correctAnswer, range, row.choices.length || 3),
    };
  });

  return {
    ...page,
    activity: { ...page.activity, rows },
    answerKey: rows.map((row) => ({ groupId: row.id, answer: row.correctAnswer })),
  };
}

/** Final post-generation data used unchanged by both preview and PDF printing. */
export const GENERATION_ENGINE_VERSION = "alfa-engine-8-production-diagnostics";
export const PLANNER_VERSION = "immutable-request-spec-7-hyphenated-write-fidelity";

export type GenerationFailureDiagnostic = {
  failingPage: number | null;
  failingConstraint: string;
  expected: string;
  actual: string;
  parsedPagePlan: Array<{ page: number; mechanic: WorksheetMechanicId; requirements: unknown }>;
  finalRenderedPagePlan: Array<{ page: number; mechanic: WorksheetMechanicId; kind: string }>;
  validationFailureReason: string;
  buildVersion: { generationEngineVersion: string; plannerVersion: string };
};

function diagnosticValue(
  code: string,
  directive: ReturnType<typeof parsePageDirectives>[number] | undefined,
  page: WorksheetPageModel | undefined,
): { expected: string; actual: string } {
  if (!directive)
    return { expected: "specified page", actual: page ? "rendered page" : "missing page" };
  const requirements = directive.semanticRequirements;
  const activity = page?.activity;
  if (code.includes("mechanic")) {
    return {
      expected: directive.mechanic,
      actual: activity ? mechanicOfActivity(activity) : "missing page",
    };
  }
  if (code.includes("item-count")) {
    const actual =
      activity?.kind === "sound-hunt" || activity?.kind === "word-complete"
        ? activity.items.length
        : activity?.kind === "picture-letter-match"
          ? activity.pictures.length
          : 0;
    return {
      expected: String(requirements.requiredItemCount ?? "exact requested count"),
      actual: String(actual),
    };
  }
  if (code.includes("grid")) {
    const grid = requirements.requiredGrid;
    const count = activity?.kind === "sound-hunt" ? activity.items.length : 0;
    return {
      expected: grid
        ? `${grid.columns} × ${grid.rows} (${grid.columns * grid.rows} pictures)`
        : "requested grid",
      actual: `${count} pictures`,
    };
  }
  if (code.includes("target-count")) {
    const count =
      activity?.kind === "sound-hunt"
        ? activity.items.filter((item) => item.isTarget).length
        : activity?.kind === "word-complete"
          ? activity.items.filter((item) => item.missingLetter === "b").length
          : 0;
    return {
      expected: String(requirements.requiredTargetCount ?? "requested target count"),
      actual: String(count),
    };
  }
  if (code.includes("response-mode")) {
    return {
      expected: requirements.responseMode ?? "requested response mode",
      actual: activity?.kind ?? "missing page",
    };
  }
  return {
    expected: JSON.stringify(requirements),
    actual: activity ? mechanicOfActivity(activity) : "missing page",
  };
}

function generationFailureDiagnostics(
  spec: WorksheetSpec,
  project: WorksheetProject,
  issues: ReturnType<typeof pageDirectiveIssues>,
): GenerationFailureDiagnostic[] {
  const directives = parsePageDirectives(spec);
  const parsedPagePlan = directives.map((directive) => ({
    page: directive.page,
    mechanic: directive.mechanic,
    requirements: directive.semanticRequirements,
  }));
  const finalRenderedPagePlan = project.pages.map((page, index) => ({
    page: index + 1,
    mechanic: mechanicOfActivity(page.activity),
    kind: page.activity.kind,
  }));
  return issues.map((issue) => {
    const directive = directives.find((entry) => entry.page === issue.page);
    const values = diagnosticValue(issue.code, directive, project.pages[issue.page - 1]);
    return {
      failingPage: issue.page,
      failingConstraint: issue.code,
      ...values,
      parsedPagePlan,
      finalRenderedPagePlan,
      validationFailureReason: issue.message,
      buildVersion: {
        generationEngineVersion: GENERATION_ENGINE_VERSION,
        plannerVersion: PLANNER_VERSION,
      },
    };
  });
}

export function finalizeWorksheetProject(
  project: WorksheetProject,
  spec: WorksheetSpec,
): WorksheetProject {
  const range = rangeForSpec(spec);
  const objective = resolveLearningObjective(spec);
  const pages = project.pages
    .map((page) => finalizePage(page, range))
    // LEARNING-OBJECTIVE FIDELITY — every page must practise the SAME
    // objective the pack was requested for. Content is repaired, never the
    // requested mechanic.
    .map((page) => enforceObjectiveFidelity(objective, page))
    // THEME + PEDAGOGY FIDELITY — the pictures must belong to the requested
    // theme and the child's ACTION must practise the objective. Only content
    // is repaired; the requested mechanic is never replaced.
    .map((page) => enforceThemeAndPedagogy(spec, page))
    // SEMANTIC QA — never let a child guess which drawn objects to count
    .map(clarifyPageInstruction)
    // SEMANTIC ANSWER VALIDATION — title, instruction, displayed content and
    // the answers the child can give must describe one and the same task
    .map(repairAnswerSemantics)
    // PRE-RENDER LAYOUT — reflow anything that would collide, clip or fall
    // outside the printable safe area
    .map((page) => fitPageLayout(page, { level: project.meta.level, paper: project.meta.paper }));
  const mechanicsUsed = pages.map(
    (page) => (page.activity as { mechanic?: string }).mechanic ?? page.activity.kind,
  );
  const coveredSkills = [
    ...new Set(
      pages.flatMap((page) => [
        ...(page.coveredSkills ?? []),
        ...((page.activity as { mechanic?: string }).mechanic
          ? [(page.activity as { mechanic: string }).mechanic]
          : []),
      ]),
    ),
  ];
  const directives = parsePageDirectives(spec);
  const pageMechanics = pages.map((page) => mechanicOfActivity(page.activity));
  const requestedSkills =
    directives.length && domainForSpec(spec) !== "literacy"
      ? [...new Set(directives.map((directive) => directive.mechanic))]
      : parseRequestedSkills(spec);
  const finalized = {
    ...project,
    pages,
    generation: {
      generationEngineVersion: GENERATION_ENGINE_VERSION,
      plannerVersion: PLANNER_VERSION,
      generationId: project.generation?.generationId ?? `${project.id}-${mechanicsUsed.join("+")}`,
      mechanicsUsed,
      requestedSkills,
      coveredSkills,
      trace: {
        rawUserPrompt: spec.prompt,
        normalizedRequest: JSON.stringify(applyPromptIntent(spec)),
        requestedTopic: resolveSubject(spec).label,
        requestedSkills,
        requestedPageCount: project.generationSpecification?.requestedPageCount ?? pages.length,
        explicitPageInstructions: directives.map(
          (directive) => `Page ${directive.page}: ${directive.text}`,
        ),
        generatedPagePlan: directives.map((directive) => `${directive.page}:${directive.mechanic}`),
        pageMechanics,
        renderedPageMechanics: pageMechanics,
      },
    },
  };
  // FINAL PRE-RENDER GATE. Creator preview and export both consume this exact
  // finalized project, so explicit page quantities/mechanics cannot be replaced
  // by a default template after generation.
  const finalDirectiveIssues = pageDirectiveIssues(spec, finalized);
  if (finalDirectiveIssues.length) {
    const diagnostics = generationFailureDiagnostics(spec, finalized, finalDirectiveIssues);
    console.warn("[alfa] worksheet pre-render validation rejected", diagnostics);
    throw new WorksheetGenerationError(
      finalDirectiveIssues.map((issue) => issue.message),
      diagnostics,
    );
  }
  return finalized;
}

/** Runtime invariant used by the production preview and export paths. */
export function validateFinalizedPageData(page: WorksheetPageModel): string[] {
  return [...structuralPageIssues(page), ...answerSemanticIssues(page)];
}

function structuralPageIssues(page: WorksheetPageModel): string[] {
  if (page.activity.kind === "pick-one") {
    const errors: string[] = [];
    for (const row of page.activity.rows) {
      const matches = row.options.filter((o) => o.id === row.answerOptionId).length;
      if (matches !== 1) errors.push(`${row.id}: must offer exactly one correct option.`);
      const keyed = page.answerKey.find((entry) => entry.groupId === row.id);
      const index = row.options.findIndex((o) => o.id === row.answerOptionId) + 1;
      if (!keyed || keyed.answer !== index)
        errors.push(`${row.id}: answer key does not point at the correct option.`);
    }
    return errors;
  }
  if (page.activity.kind === "order-sequence") {
    const errors: string[] = [];
    for (const row of page.activity.rows) {
      const ranks = row.items.map((i) => i.rank).sort((a, b) => a - b);
      const expected = row.items.map((_, i) => i + 1);
      if (ranks.join() !== expected.join())
        errors.push(`${row.id}: order ranks must be 1..n exactly once.`);
    }
    return errors;
  }
  if (page.activity.kind === "sort-groups") {
    const errors: string[] = [];
    const activity = page.activity;
    const binKeys = activity.bins.map((bin) => bin.startsWith ?? bin.asset);
    if (new Set(binKeys).size !== binKeys.length) errors.push("sort bins must be distinct.");
    for (const item of activity.items) {
      const homes = activity.bins.filter((bin) => sortBinAccepts(bin, item)).length;
      if (homes !== 1) {
        errors.push(`${item.id}: item does not belong to exactly one sorting box.`);
      }
    }
    for (const bin of activity.bins) {
      const drawn = activity.items.filter((item) => sortBinAccepts(bin, item)).length;
      const keyed = page.answerKey.find((entry) => entry.groupId === bin.id)?.answer;
      if (keyed !== drawn)
        errors.push(`${bin.id}: answer key ${keyed ?? "missing"} differs from ${drawn}.`);
    }
    return errors;
  }
  if (page.activity.kind === "letter-search") {
    const errors: string[] = [];
    const activity = page.activity;
    for (const row of activity.rows) {
      const targets = row.glyphs.filter((glyph) => glyph.isTarget);
      if (!targets.length)
        errors.push(`${row.id}: a letter hunt row must contain the target letter.`);
      if (
        targets.some((glyph) => glyph.glyph.toUpperCase() !== activity.targetLetter.toUpperCase())
      ) {
        errors.push(`${row.id}: a marked glyph is not the target letter.`);
      }
      if (
        row.glyphs.some(
          (glyph) =>
            !glyph.isTarget && glyph.glyph.toUpperCase() === activity.targetLetter.toUpperCase(),
        )
      ) {
        errors.push(`${row.id}: an unmarked glyph is actually the target letter.`);
      }
      const keyed = page.answerKey.find((entry) => entry.groupId === row.id)?.answer;
      if (keyed !== targets.length) {
        errors.push(`${row.id}: answer key ${keyed ?? "missing"} differs from ${targets.length}.`);
      }
    }
    return errors;
  }
  if (page.activity.kind === "letter-trace") {
    const errors: string[] = [];
    const activity = page.activity;
    if (!activity.rows.length) errors.push("tracing page has no lines to trace.");
    for (const row of activity.rows) {
      if (row.repeats < 1)
        errors.push(`${row.id}: tracing row must repeat the letter at least once.`);
      if (row.glyph.toUpperCase() !== activity.targetLetter.toUpperCase()) {
        errors.push(`${row.id}: tracing row does not show the target letter.`);
      }
    }
    for (const word of activity.words) {
      if (word.word.charAt(0).toLowerCase() !== activity.targetLetter.toLowerCase()) {
        errors.push(`${word.id}: "${word.word}" does not start with ${activity.targetLetter}.`);
      }
    }
    return errors;
  }
  if (page.activity.kind === "cut-create") {
    const errors: string[] = [];
    const activity = page.activity;
    if (activity.pieces.length < 3)
      errors.push("a cut & create page needs at least three cut-out pieces.");
    const ids = activity.pieces.map((cut) => cut.id);
    if (new Set(ids).size !== ids.length) errors.push("two cut-out pieces share the same id.");
    for (const target of activity.targets ?? []) {
      const available = activity.pieces.filter((cut) => cut.asset === target.asset).length;
      if (available < target.quantity) {
        errors.push(
          `${target.id}: asks for ${target.quantity} ${target.label} but only ${available} are printed.`,
        );
      }
      const keyed = page.answerKey.find((entry) => entry.groupId === target.id)?.answer;
      if (keyed !== target.quantity) {
        errors.push(
          `${target.id}: answer key ${keyed ?? "missing"} differs from ${target.quantity}.`,
        );
      }
    }
    return errors;
  }
  if (page.activity.kind === "find-count") {
    const errors: string[] = [];
    const activity = page.activity;
    const targets = activity.sceneObjects.filter((object) => !object.decorative);
    if (targets.some((object) => object.asset !== activity.targetAsset)) {
      errors.push(`${activity.group.id}: counted scene objects must all be the target object.`);
    }
    if (targets.length !== activity.group.renderedObjects.length) {
      errors.push(
        `${activity.group.id}: scene draws ${targets.length} targets for ${activity.group.renderedObjects.length} counted objects.`,
      );
    }
    if (activity.group.correctAnswer !== activity.group.renderedObjects.length) {
      errors.push(`${activity.group.id}: answer is not derived from the drawn objects.`);
    }
    if (activity.choices.filter((choice) => choice === activity.group.correctAnswer).length !== 1) {
      errors.push(
        `${activity.group.id}: choices do not contain exactly one derived correct answer.`,
      );
    }
    const keyed = page.answerKey.find((entry) => entry.groupId === activity.group.id)?.answer;
    if (keyed !== activity.group.correctAnswer) {
      errors.push(
        `${activity.group.id}: answer key ${keyed ?? "missing"} differs from ${activity.group.correctAnswer}.`,
      );
    }
    return errors;
  }
  if (page.activity.kind === "memory-pairs") return validateMemoryPairs(page);
  if (page.activity.kind === "sequence-stages") return validateStageSequence(page);
  if (page.activity.kind === "sound-hunt") {
    const activity = page.activity;
    return activity.items.some((item) => item.isTarget) &&
      activity.items.some((item) => !item.isTarget)
      ? []
      : ["Beginning-sound page must mix target and non-target pictures."];
  }
  if (page.activity.kind === "picture-letter-match") {
    const activity = page.activity;
    const errors: string[] = [];
    if (activity.pictures.length < 3) errors.push("Matching page needs at least three pictures.");
    for (const picture of activity.pictures) {
      if (!activity.letterCards.some((card) => card.letter === picture.letter)) {
        errors.push(`${picture.word}: no letter card to match "${picture.letter}".`);
      }
    }
    if (!activity.pictures.some((picture) => picture.isTarget)) {
      errors.push("Matching page must include pictures beginning with the taught letter.");
    }
    return errors;
  }
  if (page.activity.kind === "word-complete") {
    const activity = page.activity;
    return activity.items.every(
      (item) => item.word.toLowerCase() === (item.missingLetter + item.remainder).toLowerCase(),
    )
      ? []
      : ["Completion page: a blank plus its remainder does not spell the word."];
  }
  if (page.activity.kind === "find-target") {
    return page.activity.items.some((item) => item.isTarget) &&
      page.activity.items.some((item) => !item.isTarget)
      ? []
      : ["Find page must contain targets and distractors."];
  }
  if (page.activity.kind === "match-pairs") {
    const left = [...page.activity.left.map((item) => item.pairId)].sort().join("|");
    const right = [...page.activity.right.map((item) => item.pairId)].sort().join("|");
    const errors =
      left === right ? [] : ["Matching page does not contain a one-to-one pair mapping."];
    if (page.activity.subtype === "object-to-shape") {
      errors.push(...shapeMatchIssues(page.activity.left, page.activity.right, page.answerKey));
    }
    return errors;
  }
  if (
    page.activity.kind === "composed" &&
    page.activity.specification.subtype === "object-to-shape"
  ) {
    const matches = flattenComponents(page.activity.components).filter(
      (component): component is Extract<typeof component, { type: "match-columns" }> =>
        component.type === "match-columns",
    );
    if (matches.length !== 1)
      return ["Object-to-shape page must contain exactly one matching activity."];
    const match = matches[0];
    if (!match) return ["Object-to-shape page is missing its matching activity."];
    return composedShapeMatchIssues(match.left, match.right, page.answerKey);
  }
  if (page.activity.kind === "trace-draw") {
    if (page.activity.subtype === "path-tracing") {
      const paths = page.activity.paths ?? [];
      if (!paths.length) return ["Path tracing page has no paths."];
      return paths.every((path) => path.from.asset !== path.to.asset && Boolean(path.relationship))
        ? []
        : ["Path tracing page contains an invalid relationship."];
    }
    return page.activity.shapes.length ? [] : ["Trace & Draw page has no shapes."];
  }

  if (page.activity.kind !== "count-match" && page.activity.kind !== "count-circle") return [];
  const groups = page.activity.kind === "count-match" ? page.activity.groups : page.activity.rows;

  const errors: string[] = [];
  for (const group of groups) {
    const visibleRenderedObjectCount = group.renderedObjects.length;
    const keyAnswer = page.answerKey.find((entry) => entry.groupId === group.id)?.answer;
    if (visibleRenderedObjectCount !== group.correctAnswer) {
      errors.push(
        `${group.id}: renderer received ${visibleRenderedObjectCount} objects for answer ${group.correctAnswer}.`,
      );
    }
    if (keyAnswer !== group.correctAnswer) {
      errors.push(
        `${group.id}: answer key ${keyAnswer ?? "missing"} differs from ${group.correctAnswer}.`,
      );
    }
    if (page.activity.kind === "count-circle") {
      const row = page.activity.rows.find((candidate) => candidate.id === group.id);
      // DRAW response: the child answers by drawing, so there are deliberately
      // no printed number cards. Only circle-the-answer rows carry choices.
      if (page.activity.responseMode === "draw") {
        if (row && row.choices.length > 0) {
          errors.push(`${group.id}: a draw-the-answer row must not print number cards.`);
        }
      } else if (
        !row ||
        row.choices.filter((choice) => choice === group.correctAnswer).length !== 1
      ) {
        errors.push(`${group.id}: choices do not contain exactly one derived correct answer.`);
      }
    }
  }
  return errors;
}

/**
 * Internal accuracy gate.
 *
 * Builds the worksheet, runs the full Alfa validation, and — if anything is
 * pedagogically wrong (wrong object, mismatched answer, duplicate or
 * ambiguous question, wrong page count) — rebuilds with a different seed
 * until it is clean. The rendered/exported worksheet is always the best
 * verified candidate, never an unchecked one.
 */
/**
 * Raised when a pack still fails validation after automatic repair.
 * The message shown to teachers is deliberately friendly; the technical
 * details stay in `details` for internal logging only.
 */
export class WorksheetGenerationError extends Error {
  details: string[];
  diagnostics?: GenerationFailureDiagnostic[];
  constructor(details: string[], diagnostics?: GenerationFailureDiagnostic[]) {
    super(
      "We couldn’t perfectly generate this activity yet. Please try again or adjust your instructions.",
    );
    this.name = "WorksheetGenerationError";
    this.details = details;
    if (diagnostics) this.diagnostics = diagnostics;
  }
}

export function buildValidWorksheetProject(rawSpec: WorksheetSpec, version = 1): WorksheetProject {
  const spec = applyPromptIntent(rawSpec);
  const contractBreaches = (project: WorksheetProject) =>
    explicitMechanicBreaches(project.pagePlanContract, project);
  const errorsOf = (project: WorksheetProject) =>
    checkWorksheetProject(project, spec).issues.filter((i) => i.severity === "error");
  let best = finalizeWorksheetProject(buildWorksheetProject(spec, version), spec);
  let bestErrors = errorsOf(best).length;
  let bestBreaches = contractBreaches(best).length;
  if (bestErrors === 0 && bestBreaches === 0) return best;

  for (let attempt = 1; attempt <= 12 && (bestErrors > 0 || bestBreaches > 0); attempt++) {
    const candidate = finalizeWorksheetProject(
      buildWorksheetProject(spec, version + attempt * 17),
      spec,
    );
    const errors = errorsOf(candidate).length;
    const breaches = contractBreaches(candidate).length;
    // an intact page-plan contract outranks every other quality signal
    if (breaches < bestBreaches || (breaches === bestBreaches && errors < bestErrors)) {
      best = candidate;
      bestErrors = errors;
      bestBreaches = breaches;
    }
  }

  // PAGE-LEVEL REPAIR — rebuild ONLY the pages that still fail, keeping every
  // page that already satisfies the requested plan. Up to 3 attempts.
  for (let repair = 1; repair <= 3 && (bestErrors > 0 || bestBreaches > 0); repair++) {
    const failingIds = new Set<string>([
      ...errorsOf(best)
        .map((i) => i.pageId)
        .filter((id): id is string => Boolean(id)),
      ...contractBreaches(best)
        .map((i) => best.pages[i.page - 1]?.id)
        .filter((id): id is string => Boolean(id)),
    ]);
    const donor = finalizeWorksheetProject(
      buildWorksheetProject(spec, version + 977 + repair * 131),
      spec,
    );
    const pages = best.pages.map((page, index) => {
      const replace = failingIds.size === 0 || failingIds.has(page.id);
      const swap = donor.pages[index];
      return replace && swap ? { ...swap, id: page.id } : page;
    });
    const patched = finalizeWorksheetProject({ ...best, pages }, spec);
    const errors = errorsOf(patched).length;
    const breaches = contractBreaches(patched).length;
    if (breaches < bestBreaches || (breaches === bestBreaches && errors < bestErrors)) {
      best = patched;
      bestErrors = errors;
      bestBreaches = breaches;
    }
  }

  // GRACEFUL ACTIVITY FALLBACK — one page that cannot be represented exactly
  // may not sink the whole pack. That page (and only that page) is rebuilt
  // with the closest educationally equivalent supported activity, keeping the
  // learning objective, age level and difficulty. Every quality check still
  // applies to the substituted page.
  if (bestErrors > 0 || bestBreaches > 0) {
    const failingPages = (project: WorksheetProject) => {
      const numbers = new Set<number>();
      for (const issue of errorsOf(project)) {
        const index = project.pages.findIndex((page) => page.id === issue.pageId);
        if (index >= 0) numbers.add(index + 1);
      }
      for (const breach of contractBreaches(project)) numbers.add(breach.page);
      return [...numbers].sort((a, b) => a - b);
    };
    const overrides: Record<number, WorksheetMechanicId> = {};
    const tried = new Map<number, Set<string>>();
    for (let round = 1; round <= 4 && (bestErrors > 0 || bestBreaches > 0); round++) {
      const failing = failingPages(best);
      if (!failing.length) break;
      let changed = false;
      for (const pageNumber of failing) {
        const index = pageNumber - 1;
        const requested =
          best.pagePlanContract?.[index]?.requestedMechanic ??
          (best.pages[index] ? mechanicOfActivity(best.pages[index]!.activity) : undefined);
        if (!requested) continue;
        const used = tried.get(index) ?? new Set<string>();
        const candidate = equivalentMechanics(spec, requested).find(
          (mechanic) => !used.has(mechanic) && mechanic !== (overrides[index] ?? requested),
        );
        if (!candidate) continue;
        used.add(candidate);
        tried.set(index, used);
        overrides[index] = candidate;
        changed = true;
      }
      if (!changed) break;
      const candidateProject = finalizeWorksheetProject(
        buildWorksheetProject(spec, version + round * 29, { mechanicOverrides: overrides }),
        spec,
      );
      const errors = errorsOf(candidateProject).length;
      const breaches = contractBreaches(candidateProject).length;
      if (breaches < bestBreaches || (breaches <= bestBreaches && errors < bestErrors)) {
        best = candidateProject;
        bestErrors = errors;
        bestBreaches = breaches;
      }
    }
  }

  // UNSUPPORTED-PAGE FLAGGING — a page whose requested interaction has no
  // supported equivalent is flagged (and blocked at render time) instead of
  // being replaced by an unrelated activity. Every other page still ships.
  if (bestErrors > 0 || bestBreaches > 0) {
    const stillFailing = new Set<number>();
    // an issue is page-scoped when it carries a page id or names "Page N"
    const pageOfIssue = (issue: { pageId?: string; message: string }) => {
      const index = best.pages.findIndex((page) => page.id === issue.pageId);
      if (index >= 0) return index + 1;
      const named = /\bPage (\d+)\b/.exec(issue.message);
      const number = named ? Number(named[1]) : NaN;
      return Number.isFinite(number) && number >= 1 && number <= best.pages.length ? number : null;
    };
    let packLevel = false;
    for (const issue of errorsOf(best)) {
      const page = pageOfIssue(issue);
      if (page) stillFailing.add(page);
      else packLevel = true;
    }
    for (const breach of contractBreaches(best)) stillFailing.add(breach.page);

    const flagged = [...stillFailing]
      .map((pageNumber) => {
        const requested =
          best.pagePlanContract?.[pageNumber - 1]?.requestedMechanic ??
          (best.pages[pageNumber - 1]
            ? mechanicOfActivity(best.pages[pageNumber - 1]!.activity)
            : undefined);
        return requested
          ? {
              page: pageNumber,
              requestedMechanic: requested,
              reason: "no supported activity keeps this interaction and learning objective",
            }
          : null;
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
    // Only rescue the pack when the failures are page-scoped and a majority of
    // pages are still valid; anything broader is a real generation failure.
    if (!packLevel && flagged.length && flagged.length < best.pages.length) {
      return { ...best, unsupportedPages: flagged };
    }
  }

  if (bestErrors > 0 || bestBreaches > 0) {
    const details = [
      ...errorsOf(best).map((issue) => `${issue.pageId ?? "pack"}: ${issue.message}`),
      ...contractBreaches(best).map((issue) => `page ${issue.page}: ${issue.message}`),
    ];
    // internal-only diagnostics; never surfaced in the UI
    console.warn("[alfa] worksheet validation failed after repair", details);
    throw new WorksheetGenerationError(details);
  }
  return best;
}

/**
 * Every generated worksheet — deterministic now, AI-generated later — passes
 * through the same Alfa quality gate before it can be rendered or exported.
 */
export function checkWorksheetProject(
  project: WorksheetProject,
  rawSpec: WorksheetSpec,
): ValidationResult {
  const spec = applyPromptIntent(rawSpec);
  const requested = parseInt(spec.pages, 10);
  const subject = resolveSubject(spec);
  const profile = resolveObjectiveProfile(spec);
  const result = validateWorksheetProject(project, {
    level: spec.level,
    requestedPages: Number.isFinite(requested) ? Math.max(1, Math.min(requested, 20)) : undefined,
    allowedAssets: subject.locked ? subject.assets : undefined,
    allowedKinds: allowedActivityKinds(spec),
    expectedMechanic: specHasObjective(spec) ? profile.mechanic : undefined,
    range: rangeForSpec(spec),
    // A page-by-page request may legitimately mix domains (letter hunt +
    // counting + patterns). Per-page directives already lock each mechanic.
    domain:
      specHasObjective(spec) || parsePageDirectives(spec).length ? undefined : domainForSpec(spec),
  });

  // HANDOFF CONTRACT — the generated pack must still be the activity the
  // teacher chose in Idea Lab, not a themed reinterpretation of it.
  const handoff = validateHandoffContract(spec, project).map((issue) => ({
    code: issue.code,
    severity: "error" as const,
    message: issue.message,
  }));
  // GRACEFUL FALLBACK — pages deliberately rebuilt with the closest supported
  // activity are not judged against the activity they replaced. Every other
  // quality check (answers, counts, pairs, sorting, patterns, age, layout)
  // still applies to them unchanged.
  const substituted = new Set((project.substitutions ?? []).map((entry) => entry.page));
  const notSubstituted = (issue: unknown) => {
    const page = (issue as { page?: number }).page;
    return page === undefined || !substituted.has(page);
  };
  // SKILL FIDELITY — no page may practise a cognitive skill the teacher did
  // not ask for (size comparison, patterns, phonics… inside a counting pack).
  const drift = skillFidelityIssues(spec, project)
    .filter(notSubstituted)
    .map((issue) => ({
      code: issue.code,
      severity: "error" as const,
      message: issue.message,
    }));
  // EXACT PAGE FIDELITY — a page the teacher specified must render the
  // activity and the concept that were specified for it.
  const directive = pageDirectiveIssues(spec, project)
    .filter(notSubstituted)
    .map((issue) => ({
      code: issue.code,
      severity: "error" as const,
      message: issue.message,
    }));
  const planned = createWorksheetPagePlan(
    spec,
    planWorksheetPages(spec, Number.isFinite(requested) ? Math.max(1, Math.min(requested, 20)) : 1),
  );
  const pagePlan = pagePlanIssues(planned, project)
    .filter(notSubstituted)
    .map((issue) => ({
      code: issue.code,
      severity: "error" as const,
      message: issue.message,
    }));
  // IMMUTABLE CONTRACT — requested mechanic must equal rendered mechanic on
  // every explicitly specified page. Always an error, never downgraded.
  // LEARNING-OBJECTIVE FIDELITY — a theme may decorate a page but may never
  // replace the objective the pack teaches.
  const objective = objectiveFidelityIssues(spec, project)
    .filter(notSubstituted)
    .map((issue) => ({
      code: issue.code,
      severity: "error" as const,
      message: issue.message,
    }));
  // THEME / PEDAGOGY / AGE FIDELITY
  const quality = packQualityIssues(rawSpec, project).map((issue) => ({
    code: issue.code,
    severity: "error" as const,
    message: issue.message,
  }));
  const contract = explicitMechanicBreaches(project.pagePlanContract, project).map((issue) => ({
    code: issue.code,
    severity: "error" as const,
    message: issue.message,
  }));
  const immutableSpecIssues = project.generationSpecification
    ? [
        ...(project.generationSpecification.rawPrompt !== (rawSpec.prompt ?? "")
          ? [
              {
                code: "generation-spec-prompt",
                severity: "error" as const,
                message: "The generated project does not belong to the current raw prompt.",
              },
            ]
          : []),
        ...(project.pages.length !== project.generationSpecification.requestedPageCount
          ? [
              {
                code: "generation-spec-page-count",
                severity: "error" as const,
                message: `Requested ${project.generationSpecification.requestedPageCount} pages but rendered ${project.pages.length}.`,
              },
            ]
          : []),
      ]
    : [
        {
          code: "generation-spec-missing",
          severity: "error" as const,
          message: "The immutable generation specification is missing.",
        },
      ];
  if (
    handoff.length === 0 &&
    drift.length === 0 &&
    directive.length === 0 &&
    pagePlan.length === 0 &&
    contract.length === 0 &&
    objective.length === 0 &&
    immutableSpecIssues.length === 0
  )
    return result;
  return {
    valid: false,
    issues: [
      ...result.issues,
      ...handoff,
      ...drift,
      ...directive,
      ...pagePlan,
      ...contract,
      ...objective,
      ...quality,
      ...immutableSpecIssues,
    ],
  };
}

/** Swap this for the AI-backed generator when the service is connected. */
export const generateWorksheetProject: WorksheetProjectGenerator = deterministicProjectGenerator;

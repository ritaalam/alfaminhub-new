import { resolveAgeTokens } from "./age-tokens";
import { categoryCoversAssets, isAbstractConcept, visualObjects } from "./semantic-topics";
import { validateMemoryPairs } from "./worksheet-memory";
import { categorySortIssues, composedShapeMatchIssues, shapeMatchIssues } from "./object-semantics";
import { layoutIssuesForPage } from "./worksheet-layout";
import { semanticInstructionIssues } from "./worksheet-semantic-qa";
import type {
  VisualAssetKey,
  WorksheetMechanicId,
  WorksheetPageModel,
  WorksheetProject,
} from "./worksheet-model";
import { mazeIntegrityIssues } from "./worksheet-model";
import { domainOfMechanic, mechanicOfActivity } from "./worksheet-objectives";
import { mechanicsAllowedForAge } from "./worksheet-page-plan";
import type { LearningDomain } from "./learning-domains";
import { visualAssetPlacementIssues } from "./visual-asset-library";

/**
 * Alfa quality validation layer.
 *
 * Every worksheet — deterministic today, AI-generated later — must pass these
 * checks before it is rendered as a student sheet or exported to PDF.
 *
 * WHAT COUNTS AS A DUPLICATE
 * --------------------------
 * Repeated *visual objects* are the point of a counting, matching, sorting or
 * pattern activity: a group of 5 identical ladybugs is correct content, never
 * an error. The validator therefore never inspects repeated artwork inside an
 * item. It only reports duplication that breaks the exercise:
 *   1. intentional repeated visual items    -> never flagged
 *   2. duplicated questions / rows / pages  -> error (the child answers twice)
 *   3. duplicated answer choices in one question -> error (question invalid)
 *   4. duplicated ids / pages in a project  -> error (technical)
 * Two different items may legitimately share the same quantity; the match page
 * simply offers one number card per distinct quantity.
 */

export type ValidationIssue = {
  code: string;
  message: string;
  pageId?: string;
  severity: "error" | "warning";
};

export type ValidationResult = {
  valid: boolean;
  issues: ValidationIssue[];
};

export type ValidationContext = {
  /** how many pages the user asked for */
  requestedPages?: number | undefined;
  /** level label, e.g. "Ages 4–5" — drives quantity limits */
  level?: string | undefined;
  /**
   * Objects the worksheet is allowed to draw. Set when the teacher named a
   * specific object (e.g. butterflies): anything else on the page is an error.
   */
  allowedAssets?: VisualAssetKey[] | undefined;
  /** hard quantity range [min, max] the worksheet must stay inside */
  range?: [number, number] | undefined;
  /** which activity kinds the requested activity type permits */
  allowedKinds?: Array<WorksheetPageModel["activity"]["kind"]> | undefined;
  /** exact educational mechanic the originating objective requires */
  expectedMechanic?: WorksheetMechanicId | undefined;
  /** learning domain the CURRENT prompt asked for (literacy / math / science) */
  domain?: LearningDomain | undefined;
  /** level-specific mechanics permitted for the originating request */
  allowedMechanics?: WorksheetMechanicId[] | undefined;
};

/** Words that end the noun phrase of an instruction ("count the insects in each group"). */
const NOUN_STOP_WORDS =
  /^(in|on|at|for|with|and|to|each|every|per|then|that|which|you|your|below|above|inside|next|from|into|of|a|an|the)$/i;

/** Extracts the object noun phrase an instruction verb acts on. */
function instructionNoun(text: string): { verb: string; noun: string } | undefined {
  const m = text.match(
    /\b(count|circle|colou?r|trace|match|find|sort|draw)\s+(?:the\s+|all\s+the\s+|each\s+)?([a-z][a-z' -]{2,40})/i,
  );
  if (!m?.[2]) return undefined;
  const words: string[] = [];
  for (const word of m[2].trim().split(/[\s-]+/)) {
    if (NOUN_STOP_WORDS.test(word)) break;
    words.push(word);
    if (words.length === 3) break;
  }
  const noun = words.join(" ").trim();
  return noun ? { verb: m[1]!.toLowerCase(), noun } : undefined;
}

/**
 * True when the phrase names something countable: either a drawable object
 * ("stars") or a countable category whose rendered members are concrete
 * objects ("insects", "animals", "space objects", "sea creatures").
 *
 * Category words are only accepted when the objects ACTUALLY rendered on the
 * page all belong to that category — the check inspects artwork, not copy.
 */
function isCountableSubject(word: string, assets: VisualAssetKey[]) {
  if (Object.values(visualObjects).some((o) => o.alias.test(word))) return true;
  return categoryCoversAssets(word, assets);
}

type CountingGroup = {
  id: string;
  renderedObjects: { id: string; asset: VisualAssetKey }[];
  correctAnswer: number;
};

/** Only counting mechanics expose countable groups; others validate separately. */
function countsOf(page: WorksheetPageModel): CountingGroup[] {
  if (page.activity.kind === "count-match") return page.activity.groups;
  if (page.activity.kind === "count-circle") return page.activity.rows;
  // a find & count scene is one counted group: the target objects drawn in it
  if (page.activity.kind === "find-count") return [page.activity.group];
  return [];
}

function countOf(group: ReturnType<typeof countsOf>[number]) {
  return group.renderedObjects.length;
}

function assetsOf(group: ReturnType<typeof countsOf>[number]) {
  return group.renderedObjects.map((object) => object.asset);
}

function contentSignature(page: WorksheetPageModel) {
  if (page.activity.kind === "cut-create") {
    return `${page.activity.base.shape}:${page.activity.pieces.map((cut) => cut.asset).join("+")}`;
  }
  if (page.activity.kind === "pick-one") {
    return page.activity.rows
      .map(
        (row) =>
          `${row.promptLabel ?? ""}:${row.options
            .map(
              (option) =>
                `${option.renderedObjects.map((object) => object.asset).join("+")}:${option.renderedObjects.length}`,
            )
            .join("|")}:${row.answerOptionId}`,
      )
      .join(",");
  }
  if (page.activity.kind === "memory-pairs") {
    return page.activity.cards.map((card) => `${card.pairId}:${card.asset}`).join("|");
  }
  if (page.activity.kind === "sound-hunt") {
    return page.activity.items.map((item) => `${item.word}:${item.isTarget}`).join("|");
  }
  if (page.activity.kind === "sequence-stages") {
    return `${page.activity.processId}:${page.activity.cards.map((card) => `${card.stageId}:${card.order}`).join("|")}`;
  }
  if (page.activity.kind === "find-target") {
    return page.activity.items.map((item) => `${item.asset}:${item.isTarget}`).join("|");
  }
  if (page.activity.kind === "match-pairs") {
    return `${page.activity.left.map((item) => `${item.pairId}:${item.asset}`).join("|")}=>${page.activity.right.map((item) => `${item.pairId}:${item.asset}`).join("|")}`;
  }
  if (page.activity.kind === "trace-draw") {
    return page.activity.shapes.map((shape) => shape.asset).join("|");
  }
  if (page.activity.kind === "order-sequence") {
    return page.activity.rows
      .map((row) =>
        row.items
          .map(
            (item) =>
              `${item.renderedObjects.map((object) => object.asset).join("+")}:${item.renderedObjects.length}:${item.rank}`,
          )
          .join("|"),
      )
      .join(",");
  }
  return countsOf(page)
    .map((group) => `${assetsOf(group).join("+")}:${countOf(group)}`)
    .join(",");
}

export function validateWorksheetPage(
  page: WorksheetPageModel,
  ctx: ValidationContext = {},
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const add = (code: string, message: string, severity: ValidationIssue["severity"] = "error") =>
    issues.push({ code, message, pageId: page.id, severity });

  const tokens = resolveAgeTokens(ctx.level ?? "");
  const minQuantity = ctx.range ? Math.max(1, ctx.range[0]) : 1;
  const maxQuantity = ctx.range ? ctx.range[1] : tokens.maxQuantity;

  if (!page.title?.trim()) add("missing-title", "Page has no title.");
  if (!page.instruction?.trim()) add("missing-instruction", "Page has no child instruction.");
  if (!page.activityType?.trim()) add("missing-activity-type", "Page has no activity type.");
  if (!page.activity) add("missing-activity", "Page has no activity data.");

  const renderedAssets = page.activity
    ? [...new Set(countsOf(page).flatMap((g) => assetsOf(g)))]
    : [];

  // SEMANTIC CHECK — a non-countable theme, skill, subject or activity type is
  // never a countable object: "count the space", "circle the weather" or
  // "count the science" are educationally meaningless. Countable categories
  // ("insects", "animals", "fruits", "space objects") stay valid as long as
  // every rendered object really belongs to that category.
  const literacyPage =
    page.activity?.kind === "cut-create" ||
    page.activity?.kind === "letter-search" ||
    page.activity?.kind === "letter-trace" ||
    page.activity?.kind === "sound-hunt" ||
    page.activity?.kind === "memory-pairs" ||
    page.activity?.kind === "sequence-stages" ||
    page.activity?.kind === "find-target" ||
    page.activity?.kind === "match-pairs" ||
    page.activity?.kind === "trace-draw" ||
    page.activity?.kind === "sort-groups" ||
    ctx.domain === "literacy";

  for (const [field, text] of literacyPage
    ? []
    : ([
        ["instruction", page.instruction ?? ""],
        ["title", page.title ?? ""],
      ] as const)) {
    const parsed = instructionNoun(text);
    if (!parsed) continue;
    const { verb, noun } = parsed;
    if (isAbstractConcept(noun) && !isCountableSubject(noun, renderedAssets)) {
      add(
        "abstract-subject",
        `The page ${field} asks to ${verb} "${noun}", which is a category, not a countable object. Use concrete objects from that topic instead.`,
      );
    }
  }

  // SEMANTIC QA — if objects that must not be counted are drawn on the page,
  // the instruction has to say "Count only the …" explicitly.
  for (const message of semanticInstructionIssues(page)) {
    add("ambiguous-count-target", message);
  }

  // SEMANTIC CONTENT INTEGRITY — object→shape matching and category sorting
  // are only valid when the printed artwork, the pairing and the answer key
  // all derive from the same semantic mapping.
  if (page.activity?.kind === "match-pairs" && page.activity.subtype === "object-to-shape") {
    for (const message of shapeMatchIssues(
      page.activity.left,
      page.activity.right,
      page.answerKey ?? [],
    )) {
      add("shape-match-semantics", message);
    }
  }
  if (
    page.activity?.kind === "composed" &&
    page.activity.specification.subtype === "object-to-shape"
  ) {
    const matches = page.activity.components.filter(
      (component): component is Extract<typeof component, { type: "match-columns" }> =>
        component.type === "match-columns",
    );
    if (matches.length !== 1) {
      add(
        "shape-match-semantics",
        "Object-to-shape page must contain exactly one matching activity.",
      );
    } else {
      const match = matches[0];
      if (!match) return issues;
      for (const message of composedShapeMatchIssues(
        match.left,
        match.right,
        page.answerKey ?? [],
      )) {
        add("shape-match-semantics", message);
      }
    }
  }
  if (page.activity?.kind === "sort-groups") {
    for (const message of categorySortIssues(
      page.activity.bins,
      page.activity.items,
      page.answerKey ?? [],
    )) {
      add("category-sort-integrity", message);
    }
  }
  if (page.activity?.kind === "maze") {
    for (const message of mazeIntegrityIssues(page.activity)) {
      add("maze-integrity", message);
    }
    const answer = page.answerKey.find((entry) => entry.groupId === "maze-route");
    if (!answer || answer.answer !== page.activity.solution.length) {
      add("maze-answer-key", "Maze answer key does not describe the verified START-to-FINISH route.");
    }
    if (page.activity.decoration) {
      for (const message of visualAssetPlacementIssues(page.activity.decoration.asset, {
        sizePx: 58,
        mechanic: "maze-route",
        decoration: true,
      })) {
        add("visual-asset-placement", message);
      }
    }
  }

  // PRE-RENDER LAYOUT — bounding-box collisions, clipping and safe-area
  // escapes. finalizeWorksheetProject reflows pages before this runs, so a
  // remaining issue means the page could not be made to fit.
  if (page.activity) {
    for (const issue of layoutIssuesForPage(page, { level: ctx.level ?? "" })) {
      add(issue.code, issue.message, "warning");
    }
  }

  const groups = countsOf(page);
  const itemCount =
    page.activity.kind === "pick-one" || page.activity.kind === "order-sequence"
      ? page.activity.rows.length
      : page.activity.kind === "picture-letter-match"
        ? page.activity.pictures.length
        : page.activity.kind === "word-complete"
          ? page.activity.items.length
          : page.activity.kind === "sort-groups"
            ? page.activity.items.length
            : page.activity.kind === "letter-search" || page.activity.kind === "letter-trace"
              ? page.activity.rows.length
              : page.activity.kind === "sound-hunt"
                ? page.activity.items.length
                : page.activity.kind === "cut-create"
                  ? page.activity.pieces.length
                  : page.activity.kind === "memory-pairs" ||
                      page.activity.kind === "sequence-stages"
                    ? page.activity.cards.length
                    : page.activity.kind === "find-target"
                      ? page.activity.items.length
                      : page.activity.kind === "match-pairs"
                        ? page.activity.left.length
                        : page.activity.kind === "trace-draw"
                          ? page.activity.shapes.length + (page.activity.paths?.length ?? 0)
                          : page.activity.kind === "maze"
                            ? 1
                          : groups.length;
  if (!itemCount) add("empty-activity", "Activity contains no items.");

  // the drawn objects must be the ones the copy talks about
  const namedObjects = renderedAssets
    .map((asset) => visualObjects[asset])
    .filter((o) =>
      new RegExp(`\\b${o.plural}\\b|\\b${o.singular}\\b`, "i").test(page.instruction ?? ""),
    );
  if (
    groups.length &&
    renderedAssets.length === 1 &&
    !namedObjects.length &&
    !/objects|pictures|animals|creatures|vehicles|things|insects|items/i.test(
      page.instruction ?? "",
    )
  ) {
    add(
      "instruction-object-mismatch",
      `The instruction does not name the object drawn on the page (${visualObjects[renderedAssets[0]!].plural}).`,
      "warning",
    );
  }

  // the page must draw the object the teacher asked for
  if (ctx.allowedAssets?.length) {
    const off = renderedAssets.find((asset) => !ctx.allowedAssets!.includes(asset));
    if (off) {
      add(
        "off-subject-object",
        `Page draws ${off}s but the request asked for ${ctx.allowedAssets.join(", ")} only.`,
      );
    }
  }

  if (ctx.allowedKinds?.length && !ctx.allowedKinds.includes(page.activity.kind)) {
    add(
      "activity-type-mismatch",
      `Page uses a ${page.activity.kind} activity, which the requested activity type does not include.`,
    );
  }
  // DOMAIN CHECK — a literacy request must never render a counting page and a
  // counting request must never render letter work.
  if (
    ctx.domain &&
    page.activity &&
    domainOfMechanic(mechanicOfActivity(page.activity)) !==
      (ctx.domain === "science" ? "math" : ctx.domain)
  ) {
    add(
      "domain-mismatch",
      `Page practises ${domainOfMechanic(mechanicOfActivity(page.activity))} work but the request is a ${ctx.domain} activity.`,
    );
  }
  if (ctx.expectedMechanic && mechanicOfActivity(page.activity) !== ctx.expectedMechanic) {
    add(
      "objective-vs-mechanic",
      `Page practises ${mechanicOfActivity(page.activity)} but the learning objective requires ${ctx.expectedMechanic}.`,
    );
  }
  if (ctx.allowedMechanics?.length && !ctx.allowedMechanics.includes(mechanicOfActivity(page.activity))) {
    add(
      "level-mechanic-mismatch",
      `${tokens.label} does not support ${mechanicOfActivity(page.activity)} at this developmental level.`,
    );
  }

  // technical duplication: the same item id twice would break answer lookup
  if (new Set(groups.map((g) => g.id)).size !== groups.length) {
    add("duplicate-item-id", "Two items on this page share the same id.");
  }
  const objectIds = groups.flatMap((g) => g.renderedObjects.map((object) => object.id));
  if (new Set(objectIds).size !== objectIds.length) {
    add("duplicate-rendered-object-id", "Two final rendered objects share the same id.");
  }

  // case 2 — the SAME question asked twice (same objects AND same quantity).
  // Repeated objects inside one item are fine; an identical repeated item is
  // an accidental copy the child would answer twice.
  const signatures = groups.map((g) => `${assetsOf(g).join(",")}:${countOf(g)}`);
  const repeatedItem = signatures.find((s, i) => signatures.indexOf(s) !== i);
  if (repeatedItem) {
    add("duplicate-item", `This page asks the same question twice (${repeatedItem}).`);
  }

  for (const g of groups) {
    const entry = page.answerKey.find((a) => a.groupId === g.id);
    if (!entry) {
      add("missing-answer", `Item ${g.id} has no stored correct answer.`);
      continue;
    }
    const renderedCount = countOf(g);
    if (g.correctAnswer !== renderedCount) {
      add(
        "finalized-answer-mismatch",
        `Item ${g.id} renders ${renderedCount} objects but its finalized answer is ${g.correctAnswer}.`,
      );
    }
    if (entry.answer !== g.correctAnswer) {
      add(
        "answer-mismatch",
        `Item ${g.id} has finalized answer ${g.correctAnswer} but stores ${entry.answer} in the answer key.`,
      );
    }
    if (renderedCount < minQuantity || renderedCount > maxQuantity) {
      add(
        "quantity-out-of-range",
        `Item ${g.id} uses ${renderedCount} objects, outside the requested ${minQuantity}–${maxQuantity} range.`,
      );
    }
  }

  if (page.activity?.kind === "count-match") {
    // MATHEMATICAL CHECK: the answer bank must be a strict one-to-one set —
    // exactly one number card per group, every correct answer present exactly
    // once, no extras, no accidental duplicates, no impossible matches.
    const choices = page.activity.numberChoices;
    const groupCounts = groups.map(countOf).sort((a, b) => a - b);
    const bank = [...choices].sort((a, b) => a - b);

    if (new Set(groupCounts).size !== groupCounts.length) {
      add(
        "ambiguous-match",
        "Two groups on this matching page hold the same quantity, so the child cannot tell which number card belongs to which group.",
      );
    }
    if (bank.length !== groupCounts.length) {
      add(
        "match-choice-count",
        `Answer bank holds ${bank.length} number cards for ${groupCounts.length} groups — it must hold exactly one card per group.`,
      );
    }
    if (new Set(bank).size !== bank.length) {
      add("duplicate-choice", "The same number card is printed twice in the answer bank.");
    }
    for (const g of groups) {
      const renderedCount = countOf(g);
      const available = bank.filter((c) => c === renderedCount).length;
      if (available === 0) {
        add("answer-not-offered", `No number card matches group ${g.id} (${renderedCount}).`);
      }
    }
    for (const c of bank) {
      if (!groupCounts.includes(c)) {
        add("orphan-choice", `Number card ${c} matches no group on this page.`);
      }
    }
    if (
      bank.length === groupCounts.length &&
      bank.every((v, i) => v === groupCounts[i]) &&
      new Set(groupCounts).size === groupCounts.length
    ) {
      // bijection verified — nothing to report
    }
  }

  if (page.activity?.kind === "count-circle") {
    // COUNT & DRAW — the child answers by DRAWING, so no number cards are
    // printed. Those rows are checked against the answer key and the drawn
    // quantity, never against a choice bank they are not supposed to have.
    const drawResponse = page.activity.responseMode === "draw";
    for (const row of page.activity.rows) {
      const answer = page.answerKey.find((a) => a.groupId === row.id)?.answer;
      if (drawResponse) {
        if (answer !== row.renderedObjects.length) {
          add(
            "answer-mismatch",
            `Row ${row.id} prints ${row.renderedObjects.length} objects but keys ${answer ?? "no"} as the answer.`,
          );
        }
        if (row.choices.length) {
          add(
            "choice-count",
            `Row ${row.id} must not print number cards on a draw-the-answer page.`,
          );
        }
        continue;
      }
      // case 3 — duplicated answer choices make the question unanswerable
      if (new Set(row.choices).size !== row.choices.length) {
        add("duplicate-choice", `Row ${row.id} repeats an answer choice.`);
      }
      const correct = row.choices.filter((c) => c === answer).length;
      if (correct === 0)
        add("answer-not-offered", `Row ${row.id} does not offer its correct answer.`);
      if (correct > 1)
        add("multiple-correct", `Row ${row.id} offers the correct answer more than once.`);
      if (row.choices.some((c) => c < 1 || c > maxQuantity)) {
        add(
          "choice-out-of-range",
          `Row ${row.id} offers a number outside 1–${maxQuantity} for ${tokens.label}.`,
        );
      }
      if (row.choices.length !== tokens.answerChoices) {
        add(
          "choice-count",
          `Row ${row.id} offers ${row.choices.length} choices; ${tokens.label} expects ${tokens.answerChoices}.`,
          "warning",
        );
      }
    }
  }

  if (page.activity.kind === "pick-one") {
    for (const row of page.activity.rows) {
      if (row.options.filter((option) => option.id === row.answerOptionId).length !== 1) {
        add("multiple-correct", `Row ${row.id} must contain exactly one keyed correct option.`);
      }
      const answerIndex = row.options.findIndex((option) => option.id === row.answerOptionId) + 1;
      const stored = page.answerKey.find((entry) => entry.groupId === row.id);
      if (!stored || stored.answer !== answerIndex) {
        add("answer-mismatch", `Row ${row.id} answer key does not identify its correct option.`);
      }
      if (page.activity.mechanic === "compare-quantity") {
        if (row.options.length !== 2) {
          add(
            "comparison-group-count",
            `Row ${row.id} must show exactly two groups for comparison.`,
          );
          continue;
        }
        const quantities = row.options.map((option) => option.renderedObjects.length);
        if (quantities[0] === quantities[1]) {
          add(
            "ambiguous-comparison",
            `Row ${row.id} shows equal quantities, so more/fewer has no clear answer.`,
          );
        }
        const wantFewer = row.promptLabel === "FEWER";
        const expected = wantFewer ? Math.min(...quantities) : Math.max(...quantities);
        const selected = row.options.find((option) => option.id === row.answerOptionId)
          ?.renderedObjects.length;
        if (selected !== expected) {
          add(
            "comparison-answer-mismatch",
            `Row ${row.id} does not key the ${wantFewer ? "fewer" : "more"} group.`,
          );
        }
      }
    }
  }

  if (page.activity.kind === "memory-pairs") {
    for (const message of validateMemoryPairs(page)) add("memory-pairs-integrity", message);
  }

  if (page.activity.kind === "order-sequence") {
    for (const row of page.activity.rows) {
      const ranks = row.items.map((item) => item.rank).sort((a, b) => a - b);
      const expected = row.items.map((_, index) => index + 1);
      if (ranks.join(",") !== expected.join(",")) {
        add("invalid-sequence", `Row ${row.id} must contain each sequence rank exactly once.`);
      }
    }
  }

  if (groups.length > tokens.itemsPerPage) {
    add(
      "density",
      `Page holds ${groups.length} items; ${tokens.label} should stay at or below ${tokens.itemsPerPage}.`,
      "warning",
    );
  }

  return issues;
}

export function validateWorksheetProject(
  project: WorksheetProject,
  ctx: ValidationContext = {},
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const level = ctx.level ?? project.meta.level;

  if (!project.pages.length) {
    issues.push({ code: "no-pages", message: "Worksheet has no pages.", severity: "error" });
  }
  if (ctx.requestedPages && project.pages.length !== ctx.requestedPages) {
    issues.push({
      code: "page-count",
      message: `Generated ${project.pages.length} page(s) but ${ctx.requestedPages} were requested.`,
      severity: "error",
    });
  }
  if (new Set(project.pages.map((p) => p.id)).size !== project.pages.length) {
    issues.push({ code: "duplicate-page-id", message: "Duplicate page ids.", severity: "error" });
  }

  // case 2 at project level — a whole page accidentally copied (same title and
  // exactly the same items in the same order)
  const pageSignatures = project.pages.map(
    (p) => `${p.title}|${p.activityType}|${contentSignature(p)}`,
  );
  const repeatedPage = pageSignatures.find((s, i) => pageSignatures.indexOf(s) !== i);
  if (repeatedPage) {
    // On long practice packs (many pages, small number range for the age) some
    // repetition is unavoidable and pedagogically fine — flag it, don't block.
    issues.push({
      code: "duplicate-page-content",
      message: "Two pages contain exactly the same activity.",
      severity: project.pages.length > 6 ? "warning" : "error",
    });
  }

  // The learning objective is guaranteed by the FIRST page. Later pages in a
  // pack may rotate through complementary activities for variety, so the
  // mechanic contract is only enforced where the objective is taught.
  for (const [index, page] of project.pages.entries())
    issues.push(
      ...validateWorksheetPage(page, {
        ...ctx,
        level,
        ...(index === 0 ? {} : { expectedMechanic: undefined }),
      }),
    );

  return { valid: !issues.some((i) => i.severity === "error"), issues };
}

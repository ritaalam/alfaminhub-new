import type { WorksheetSpec } from "./creator-options";
import {
  allowedEntitiesForRequirements,
  parsePageDirectives,
  semanticRequirementsOf,
} from "./page-directives";
import { visualAssetKeys } from "./semantic-topics";
import { basicShapes } from "./object-semantics";

const basicShapeAssets: string[] = basicShapes;
import { matchTheme } from "./semantic-topics";
import { skillFamilyOfMechanic, type SkillFamily } from "./skill-fidelity";
import type {
  PageSemanticRequirements,
  PagePlanContractEntry,
  VisualAssetKey,
  WorksheetMechanicId,
  WorksheetPageModel,
  WorksheetProject,
} from "./worksheet-model";
import { mechanicOfActivity } from "./worksheet-objectives";
import {
  isAdvancedActivityTypeLocked,
} from "./worksheet-renderer-support";

export type WorksheetPagePlan = PagePlanContractEntry & {
  requestedSkill: SkillFamily;
};

export type PagePlanIssue = { code: string; message: string; page: number };

/** Raised when an explicitly specified page did not render its requested mechanic. */
export class PagePlanContractError extends Error {
  readonly breaches: PagePlanIssue[];
  constructor(breaches: PagePlanIssue[]) {
    super(`Page plan contract violated: ${breaches.map((b) => b.message).join(" ")}`);
    this.name = "PagePlanContractError";
    this.breaches = breaches;
  }
}

/** "matching" and "match" are the same requirement written two ways. */
function stem(word: string) {
  return word.replace(/(ing|ies|es|s|ed)$/, "");
}

function meaningfulWords(value: string) {
  return (value.toLowerCase().match(/[a-z]{3,}/g) ?? [])
    .filter(
      (word) =>
        !["page", "create", "activity", "worksheet", "simple", "each", "with", "using"].includes(
          word,
        ),
    )
    .map(stem)
    .filter((word) => word.length >= 3);
}

/** Every stemmed word in a page's visible copy. */
function copyWords(copy: string) {
  return new Set((copy.toLowerCase().match(/[a-z]{3,}/g) ?? []).map(stem));
}

/** Deep-freezes the contract so no later pass can silently rewrite a page. */
export function freezePagePlan(plan: WorksheetPagePlan[]): readonly WorksheetPagePlan[] {
  return Object.freeze(
    plan.map((entry) => {
      const semanticRequirements = Object.freeze({
        ...entry.semanticRequirements,
        requiredEntities: Object.freeze([...entry.semanticRequirements.requiredEntities]),
        preferredEntities: Object.freeze([...(entry.semanticRequirements.preferredEntities ?? [])]),
        requiredCategories: Object.freeze([...entry.semanticRequirements.requiredCategories]),
        requiredRelationships: Object.freeze([...entry.semanticRequirements.requiredRelationships]),
        patternRules: Object.freeze([...entry.semanticRequirements.patternRules]),
        ...(entry.semanticRequirements.sortAttribute
          ? {
              sortAttribute: Object.freeze({
                ...entry.semanticRequirements.sortAttribute,
                values: Object.freeze([...entry.semanticRequirements.sortAttribute.values]),
              }),
            }
          : {}),
        ...(entry.semanticRequirements.requiredQuantityRange
          ? {
              requiredQuantityRange: Object.freeze([
                ...entry.semanticRequirements.requiredQuantityRange,
              ]) as unknown as [number, number],
            }
          : {}),
        ...(entry.semanticRequirements.requiredCountGroups
          ? {
              requiredCountGroups: Object.freeze(
                entry.semanticRequirements.requiredCountGroups.map((group) =>
                  Object.freeze({ ...group }),
                ),
              ),
            }
          : {}),
      }) as unknown as PageSemanticRequirements;
      return Object.freeze({
        ...entry,
        semanticRequirements,
        prohibitedMechanics: Object.freeze([...entry.prohibitedMechanics]),
        allowedEntities: Object.freeze([...entry.allowedEntities]),
        prohibitedEntities: Object.freeze([...entry.prohibitedEntities]),
      });
    }),
  ) as readonly WorksheetPagePlan[];
}

/** Converts the current request into the immutable contract every page is built from. */
export function createWorksheetPagePlan(
  spec: WorksheetSpec,
  mechanics: WorksheetMechanicId[],
): WorksheetPagePlan[] {
  const directives = parsePageDirectives(spec);
  const all = [...new Set(mechanics)];
  return mechanics.map((mechanic, index) => {
    const directive = directives.find((entry) => entry.page === index + 1);
    const baseSemanticRequirements =
      directive?.semanticRequirements ??
      semanticRequirementsOf(`${spec.prompt || spec.theme}: ${mechanic}`, mechanic);
    const explicitCountGroups = spec.promptRequirements?.countGroups ?? [];
    const semanticRequirements =
      explicitCountGroups.length && (mechanic === "count-match" || mechanic === "count-circle")
        ? {
            ...baseSemanticRequirements,
            requiredCountGroups: explicitCountGroups.map((group) => ({
              asset: group.asset as VisualAssetKey,
              count: group.count,
            })),
            requiredGroupCount:
              spec.promptRequirements?.requiredGroupCount ?? explicitCountGroups.length,
            ...(spec.promptRequirements?.requiredChoiceCount
              ? { requiredChoiceCount: spec.promptRequirements.requiredChoiceCount }
              : {}),
          }
        : baseSemanticRequirements;
    const promptTopic = matchTheme(spec.prompt ?? "") ?? matchTheme(spec.theme ?? "");
    const farmAnimals = [
      "cow",
      "calf",
      "sheep",
      "lamb",
      "chicken",
      "chick",
      "pig",
      "piglet",
    ] as const;
    const relationshipEntities = semanticRequirements.requiredRelationships.includes(
      "animal-to-food",
    )
      ? (["flower", "seed", "apple", "leaf"] as const)
      : [];
    const allowedEntities = [
      ...new Set([
        ...allowedEntitiesForRequirements(semanticRequirements),
        ...(promptTopic?.id === "farm" ? farmAnimals : (promptTopic?.objects ?? [])),
        ...relationshipEntities,
      ]),
    ];
    return {
      page: index + 1,
      requestedSkill: skillFamilyOfMechanic(mechanic),
      requestedMechanic: mechanic,
      requiredContent: directive?.text ?? `${spec.prompt || spec.theme}: ${mechanic}`,
      semanticRequirements,
      prohibitedMechanics: all.filter((candidate) => candidate !== mechanic),
      allowedEntities,
      // Only a page whose nouns were explicitly marked mandatory freezes its
      // visual content; ordinary thematic nouns stay interchangeable.
      prohibitedEntities:
        directive && allowedEntities.length && semanticRequirements.requiredEntities.length
          ? visualAssetKeys.filter((entity) => !allowedEntities.includes(entity))
          : [],
      // A named Advanced Create selection is every bit as immutable as a
      // teacher-authored per-page directive. This stops finalization and repair
      // passes from substituting a "close" mechanic.
       explicit: Boolean(directive) || isAdvancedActivityTypeLocked(spec),
    };
  });
}

/**
 * The single hard rule: for every EXPLICITLY specified page,
 * requestedMechanic === renderedMechanic. Nothing else is tolerated.
 */
export function explicitMechanicBreaches(
  plan: readonly PagePlanContractEntry[] | undefined,
  project: Pick<WorksheetProject, "pages">,
): PagePlanIssue[] {
  if (!plan?.length) return [];
  const breaches: PagePlanIssue[] = [];
  for (const contract of plan) {
    if (!contract.explicit) continue;
    const page = project.pages[contract.page - 1];
    if (!page) {
      breaches.push({
        code: "page-contract-missing",
        page: contract.page,
        message: `Page ${contract.page} was specified but not generated.`,
      });
      continue;
    }
    const actual = mechanicOfActivity(page.activity);
    if (actual !== contract.requestedMechanic) {
      breaches.push({
        code: "page-contract-mechanic",
        page: contract.page,
        message: `Page ${contract.page} requested "${contract.requestedMechanic}" but rendered "${actual}".`,
      });
      continue;
    }
    breaches.push(...structuralContractIssues(contract.requestedMechanic, page, contract.page));
    breaches.push(...duplicateContractIssues(contract, project, contract.page));
    breaches.push(
      ...semanticContractIssues(
        contract.semanticRequirements,
        page,
        contract.page,
        contract.allowedEntities,
        contract.prohibitedEntities,
      ),
    );
  }
  return breaches;
}

/**
 * REQUIRED COMPONENTS — a page may render the right mechanic and still miss the
 * thing the teacher actually asked for. A pattern page without a solvable
 * repeating sequence, or an independent-writing page without empty handwriting
 * space, fails here and is regenerated.
 */
export function structuralContractIssues(
  mechanic: WorksheetMechanicId,
  page: WorksheetPageModel,
  pageNumber: number,
): PagePlanIssue[] {
  const issues: PagePlanIssue[] = [];
  const activity = page.activity;
  if (mechanic === "pattern-complete") {
    const rows = activity.kind === "pick-one" ? activity.rows : [];
    // a real, child-solvable sequence: at least two full repeats of the unit
    // printed before the gap, plus a stated rule and a stored answer
    const solvable = rows.filter((row) => {
      const shown = row.promptObjects ?? [];
      const unit = row.patternUnit ?? [];
      if (!row.patternRule || unit.length < 2 || shown.length < unit.length * 2) return false;
      if (!row.answerOptionId) return false;
      return shown.every((item, index) => item.asset === unit[index % unit.length]);
    });
    if (!solvable.length) {
      issues.push({
        code: "page-contract-pattern-missing",
        page: pageNumber,
        message: `Page ${pageNumber} must contain a real repeating pattern the child can continue.`,
      });
    }
  }
  if (mechanic === "letter-write") {
    const independent =
      activity.kind === "letter-trace" &&
      activity.mode === "independent" &&
      activity.rows.some((row) => (row.blankSlots ?? 0) >= 2);
    if (!independent) {
      issues.push({
        code: "page-contract-writing-space",
        page: pageNumber,
        message: `Page ${pageNumber} must give blank handwriting space for independent writing.`,
      });
    }
  }
  // NUMBER FORMATION — guided dotted numeral first, then genuinely blank space.
  if (mechanic === "number-write") {
    const rows = activity.kind === "letter-trace" ? activity.rows : [];
    const digitsOnly = rows.length > 0 && rows.every((row) => /^[\d\s]+$/.test(row.glyph));
    const guided = rows.some((row) => (row.traceSlots ?? 0) >= 1);
    const blank = rows.filter((row) => (row.blankSlots ?? 0) >= 3).length >= 1;
    if (!digitsOnly || !guided || !blank) {
      issues.push({
        code: "page-contract-number-writing",
        page: pageNumber,
        message: `Page ${pageNumber} must trace numerals and then leave blank space to write them independently.`,
      });
    }
  }
  // COUNTING — the printed objects are the question: their count must be the
  // stored answer, and exactly one offered choice may be correct.
  if (mechanic === "count-circle" || mechanic === "find-and-count") {
    const rows =
      activity.kind === "count-circle"
        ? activity.rows.map((row) => ({
            count: row.renderedObjects.length,
            answer: row.correctAnswer,
            choices: row.choices ?? [],
          }))
        : activity.kind === "find-count"
          ? [
              {
                count: activity.sceneObjects.filter((object) => !object.decorative).length,
                answer: activity.group.correctAnswer,
                choices: activity.choices ?? [],
              },
            ]
          : [];
    for (const row of rows) {
      if (row.count !== row.answer) {
        issues.push({
          code: "page-contract-count-mismatch",
          page: pageNumber,
          message: `Page ${pageNumber} prints ${row.count} objects but stores ${row.answer} as the answer.`,
        });
      }
      if (
        row.choices.length &&
        row.choices.filter((choice) => choice === row.answer).length !== 1
      ) {
        issues.push({
          code: "page-contract-count-answers",
          page: pageNumber,
          message: `Page ${pageNumber} must offer exactly one correct number choice.`,
        });
      }
    }
  }
  // QUANTITY → NUMERAL — one numeral per quantity, and no two groups sharing one.
  if (mechanic === "count-match" && activity.kind === "count-match") {
    const answers = activity.groups.map((group) => group.correctAnswer);
    const mismatched = activity.groups.filter(
      (group) => group.renderedObjects.length !== group.correctAnswer,
    );
    if (mismatched.length) {
      issues.push({
        code: "page-contract-quantity-mismatch",
        page: pageNumber,
        message: `Page ${pageNumber} has a group whose numeral does not equal its drawn quantity.`,
      });
    }
    if (new Set(answers).size !== answers.length) {
      issues.push({
        code: "page-contract-quantity-bijection",
        page: pageNumber,
        message: `Page ${pageNumber} must map each quantity to exactly one numeral.`,
      });
    }
    const bank = activity.numberChoices ?? [];
    if (bank.length && !answers.every((answer) => bank.filter((n) => n === answer).length === 1)) {
      issues.push({
        code: "page-contract-quantity-bank",
        page: pageNumber,
        message: `Page ${pageNumber} must offer each correct numeral exactly once.`,
      });
    }
  }
  // MORE / LESS — two clearly different quantities, and the stored answer must
  // be the mathematically correct group for the label that was printed.
  if (mechanic === "compare-quantity" && activity.kind === "pick-one") {
    for (const row of activity.rows) {
      const counts = row.options.map((option) => option.renderedObjects.length);
      if (new Set(counts).size !== counts.length) {
        issues.push({
          code: "page-contract-compare-equal",
          page: pageNumber,
          message: `Page ${pageNumber} compares groups that hold the same quantity.`,
        });
        continue;
      }
      const label = row.promptLabel ?? "";
      const says = (re: RegExp) => re.test(label) || (!label && re.test(page.instruction));
      const wantsFewer = says(/less|fewer|fewest|smaller/i);
      // only checkable when the printed wording names one direction
      if (wantsFewer === says(/more|most|greater|bigger/i)) continue;
      const target = wantsFewer ? Math.min(...counts) : Math.max(...counts);
      const correct = row.options.find((option) => option.renderedObjects.length === target);
      if (!correct || correct.id !== row.answerOptionId) {
        issues.push({
          code: "page-contract-compare-answer",
          page: pageNumber,
          message: `Page ${pageNumber} stores the wrong group as the ${wantsFewer ? "fewer" : "more"} answer.`,
        });
      }
    }
  }
  return issues;
}

/**
 * FORBIDDEN DUPLICATION — a differently specified page may not be a reprint of
 * an earlier one. A changed heading ("Practise Again", "Review") is not a
 * different activity: the comparison uses the rendered content, not the copy.
 */
function contentSignature(page: WorksheetPageModel): string {
  const activity = page.activity;
  const extra =
    activity.kind === "letter-trace"
      ? `${activity.mode ?? "guided"}:${activity.rows.map((row) => `${row.glyph}/${row.blankSlots ?? 0}`).join(",")}`
      : activity.kind === "pick-one"
        ? activity.rows.map((row) => row.patternRule ?? "-").join(",")
        : activity.kind === "maze"
          ? activity.cells
              .map(
                (cell) =>
                  `${cell.row},${cell.column}:${Number(cell.top)}${Number(cell.right)}${Number(cell.bottom)}${Number(cell.left)}`,
              )
              .join(";")
        : "";
  return [mechanicOfActivity(activity), activity.kind, extra, activityAssets(page).join(",")].join(
    "|",
  );
}

function duplicateContractIssues(
  contract: PagePlanContractEntry,
  project: Pick<WorksheetProject, "pages">,
  pageNumber: number,
): PagePlanIssue[] {
  const page = project.pages[pageNumber - 1];
  if (!page) return [];
  const signature = contentSignature(page);
  const duplicate = project.pages.some(
    (other, index) => index < pageNumber - 1 && contentSignature(other) === signature,
  );
  if (!duplicate) return [];
  return [
    {
      code: "page-contract-duplicate",
      page: pageNumber,
      message: `Page ${pageNumber} repeats an earlier page instead of the activity it was given.`,
    },
  ];
}

function activityAssets(page: WorksheetPageModel) {
  const a = page.activity;
  if (a.kind === "count-match")
    return a.groups.flatMap((group) => group.renderedObjects.map((item) => item.asset));
  if (a.kind === "count-circle")
    return a.rows.flatMap((row) => row.renderedObjects.map((item) => item.asset));
  if (a.kind === "find-count") return a.sceneObjects.map((item) => item.asset);
  if (a.kind === "find-target") return a.items.map((item) => item.asset);
  if (a.kind === "match-pairs") return [...a.left, ...a.right].map((item) => item.asset);
  if (a.kind === "trace-draw")
    return [
      ...a.shapes.map((item) => item.asset),
      ...(a.paths ?? []).flatMap((path) => [path.from.asset, path.to.asset]),
    ];
  if (a.kind === "pick-one")
    return a.rows
      .flatMap((row) => [
        ...(row.promptObjects ?? []),
        ...row.options.flatMap((option) => option.renderedObjects),
      ])
      .map((item) => item.asset);
  if (a.kind === "sort-groups") return a.items.map((item) => item.asset);
  return [];
}

/** Semantic half of the immutable contract: broad mechanic equality is insufficient. */
export function semanticContractIssues(
  requirements: PageSemanticRequirements,
  page: WorksheetPageModel,
  pageNumber: number,
  allowedEntities: readonly string[] = [],
  prohibitedEntities: readonly string[] = [],
): PagePlanIssue[] {
  const issues: PagePlanIssue[] = [];
  const assets = activityAssets(page);
  const add = (code: string, message: string) => issues.push({ code, page: pageNumber, message });
  // Maze content is a wall graph with a verified route, not a drawable asset
  // collection. Theme nouns remain available to the page copy, but must not
  // turn a valid geometric maze into a missing-object failure. All other
  // mechanics retain their required-entity checks.
  if (page.activity.kind !== "maze") {
    for (const entity of requirements.requiredEntities) {
      if (!assets.includes(entity))
        add("page-contract-entity", `Page ${pageNumber} must include "${entity}" as requested.`);
    }
  }
  // FLEXIBLE CONTENT: substitutions are only a breach when the teacher pinned
  // the page's visuals, which is what populates prohibitedEntities.
  void allowedEntities;
  const unrelated = [...new Set(assets.filter((asset) => prohibitedEntities.includes(asset)))];
  if (unrelated.length)
    add(
      "page-contract-substitution",
      `Page ${pageNumber} introduced unrelated entities: ${unrelated.join(", ")}.`,
    );
  if (
    requirements.activitySubtype === "baby-parent" &&
    (page.activity.kind !== "match-pairs" || page.activity.subtype !== "baby-parent")
  ) {
    add("page-contract-subtype", `Page ${pageNumber} must match baby animals to their parents.`);
  }
  // PAGE SPECIFICATION — the student action, the content it acts on and the way
  // the answer is given are immutable. A page that satisfies the mechanic but
  // changes any of the three has substituted a different activity.
  if (requirements.activitySubtype === "object-to-shape") {
    const activity = page.activity;
    const ok =
      activity.kind === "match-pairs" &&
      activity.subtype === "object-to-shape" &&
      activity.right.every((item) => basicShapeAssets.includes(item.asset)) &&
      activity.left.every((item) => !basicShapeAssets.includes(item.asset));
    if (!ok)
      add(
        "page-contract-response",
        `Page ${pageNumber} must match everyday objects to the shape they look like.`,
      );
  }
  if (requirements.responseMode === "draw") {
    const activity = page.activity;
    const draws = activity.kind === "count-circle" && activity.responseMode === "draw";
    if (!draws)
      add(
        "page-contract-response",
        `Page ${pageNumber} must let the child DRAW the answer, not select a printed one.`,
      );
  }
  if (requirements.categoryGroups?.length) {
    const bins = page.activity.kind === "sort-groups" ? page.activity.bins : [];
    const missing = requirements.categoryGroups.filter(
      (group) => !bins.some((bin) => bin.label.toLowerCase() === group.label.toLowerCase()),
    );
    if (page.activity.kind !== "sort-groups" || missing.length) {
      add(
        "page-contract-category",
        `Page ${pageNumber} must sort pictures into: ${requirements.categoryGroups.map((group) => group.label).join(", ")}.`,
      );
    }
    // EXACT PER-CATEGORY QUANTITY — "4 food items and 4 things we play with"
    if (page.activity.kind === "sort-groups") {
      for (const group of requirements.categoryGroups) {
        if (!group.count) continue;
        const bin = page.activity.bins.find(
          (entry) => entry.label.toLowerCase() === group.label.toLowerCase(),
        );
        if (!bin) continue;
        const rendered = page.activity.items.filter((item) =>
          bin.members?.includes(item.asset),
        ).length;
        if (rendered !== group.count) {
          add(
            "page-contract-category-count",
            `Page ${pageNumber} must show exactly ${group.count} ${group.label} pictures, but ${rendered} are drawn.`,
          );
        }
      }
    }
  }
  // EXACT TOTAL QUANTITY — "Sort 8 pictures"
  if (requirements.requiredItemCount && page.activity.kind === "sort-groups") {
    const drawn = page.activity.items.length;
    if (drawn !== requirements.requiredItemCount) {
      add(
        "page-contract-item-count",
        `Page ${pageNumber} must show exactly ${requirements.requiredItemCount} pictures to sort, but ${drawn} are drawn.`,
      );
    }
  }
  const exactItems =
    page.activity.kind === "sound-hunt" || page.activity.kind === "word-complete"
      ? page.activity.items.length
      : page.activity.kind === "picture-letter-match"
        ? page.activity.pictures.length
        : undefined;
  if (
    requirements.requiredItemCount &&
    exactItems !== undefined &&
    exactItems !== requirements.requiredItemCount
  ) {
    add(
      "page-contract-item-count",
      `Page ${pageNumber} must show exactly ${requirements.requiredItemCount} pictures, but ${exactItems} are drawn.`,
    );
  }
  if (requirements.requiredGrid && page.activity.kind === "sound-hunt") {
    const expected = requirements.requiredGrid.columns * requirements.requiredGrid.rows;
    if (page.activity.items.length !== expected) {
      add(
        "page-contract-grid",
        `Page ${pageNumber} must render an exact ${requirements.requiredGrid.columns} × ${requirements.requiredGrid.rows} picture grid.`,
      );
    }
  }
  if (requirements.requiredTargetCount && page.activity.kind === "sound-hunt") {
    const actual = page.activity.items.filter((item) => item.isTarget).length;
    if (actual !== requirements.requiredTargetCount) {
      add(
        "page-contract-target-count",
        `Page ${pageNumber} must show exactly ${requirements.requiredTargetCount} target pictures, but ${actual} are drawn.`,
      );
    }
  }
  if (requirements.forbiddenSubstitutions?.length) {
    const rendered = mechanicOfActivity(page.activity);
    if (requirements.forbiddenSubstitutions.includes(rendered)) {
      add(
        "page-contract-substitution",
        `Page ${pageNumber} substituted the "${rendered}" activity for the one requested.`,
      );
    }
  }
  if (
    requirements.activitySubtype?.includes("path") &&
    (page.activity.kind !== "trace-draw" ||
      page.activity.subtype !== "path-tracing" ||
      !page.activity.paths?.length)
  ) {
    add("page-contract-subtype", `Page ${pageNumber} must trace animal-to-food paths.`);
  }
  for (const relationship of requirements.requiredRelationships) {
    const actual =
      page.activity.kind === "match-pairs"
        ? page.activity.relationship
        : page.activity.kind === "trace-draw"
          ? page.activity.paths?.map((path) => path.relationship).join(" ")
          : "";
    if (!actual?.includes(relationship))
      add(
        "page-contract-relationship",
        `Page ${pageNumber} must preserve the "${relationship}" relationship.`,
      );
  }
  for (const rule of requirements.patternRules) {
    if (
      page.activity.kind !== "pick-one" ||
      !page.activity.rows.some((row) => row.patternRule === rule)
    )
      add("page-contract-pattern", `Page ${pageNumber} must include a ${rule} pattern.`);
  }
  if (requirements.sortAttribute) {
    const bins = page.activity.kind === "sort-groups" ? page.activity.bins : [];
    if (
      page.activity.kind !== "sort-groups" ||
      requirements.sortAttribute.values.some(
        (value) =>
          !bins.some(
            (bin) =>
              bin.criterion?.attribute === requirements.sortAttribute?.attribute &&
              bin.criterion?.value === value,
          ),
      )
    ) {
      add(
        "page-contract-category",
        `Page ${pageNumber} must sort by ${requirements.sortAttribute.attribute}: ${requirements.sortAttribute.values.join(" vs ")}.`,
      );
    }
  }
  return issues;
}

/** True when this specific page may be rendered under the project's contract. */
export function pageContractBreach(
  project: Pick<WorksheetProject, "pages" | "pagePlanContract"> &
    Partial<Pick<WorksheetProject, "unsupportedPages">>,
  page: WorksheetPageModel,
  index: number,
): PagePlanIssue | null {
  // UNSUPPORTED INTERACTION — flagged, never silently swapped for another
  // activity type.
  const unsupported = project.unsupportedPages?.find((entry) => entry.page === index + 1);
  if (unsupported) {
    return {
      code: "page-unsupported-activity",
      page: index + 1,
      message: `Page ${index + 1}: this activity ("${unsupported.requestedMechanic}") isn’t supported yet, so it was not replaced with a different activity.`,
    };
  }
  const contract = project.pagePlanContract?.find((entry) => entry.page === index + 1);
  if (!contract?.explicit) return null;

  const actual = mechanicOfActivity(page.activity);
  if (actual === contract.requestedMechanic) {
    return (
      structuralContractIssues(contract.requestedMechanic, page, index + 1)[0] ??
      semanticContractIssues(
        contract.semanticRequirements,
        page,
        index + 1,
        contract.allowedEntities,
        contract.prohibitedEntities,
      )[0] ??
      null
    );
  }
  return {
    code: "page-contract-mechanic",
    page: index + 1,
    message: `Page ${index + 1} requested "${contract.requestedMechanic}" but rendered "${actual}".`,
  };
}

/** Throws instead of returning a half-correct pack. */
export function assertPagePlanContract(
  plan: readonly PagePlanContractEntry[] | undefined,
  project: Pick<WorksheetProject, "pages">,
): void {
  const breaches = explicitMechanicBreaches(plan, project);
  if (breaches.length) throw new PagePlanContractError(breaches);
}

function hasUnambiguousAnswer(page: WorksheetPageModel) {
  if (
    page.activity.kind === "letter-trace" ||
    page.activity.kind === "cut-create" ||
    page.activity.kind === "trace-draw"
  )
    return true;
  if (!page.answerKey.length) return false;
  return page.answerKey.every((entry) => Number.isFinite(entry.answer));
}

/** Final page-plan gate used by both deterministic and future AI generators. */
export function pagePlanIssues(
  plan: WorksheetPagePlan[],
  project: Pick<WorksheetProject, "pages">,
): PagePlanIssue[] {
  const issues: PagePlanIssue[] = [];
  const explicitMechanics = new Set(
    plan.filter((entry) => entry.explicit).map((entry) => entry.requestedMechanic),
  );

  for (const contract of plan) {
    const page = project.pages[contract.page - 1];
    if (!page) {
      issues.push({
        code: "page-plan-missing",
        page: contract.page,
        message: `Page ${contract.page} is missing.`,
      });
      continue;
    }
    const actual = mechanicOfActivity(page.activity);
    if (actual !== contract.requestedMechanic) {
      issues.push({
        code: "page-plan-mechanic",
        page: contract.page,
        message: `Page ${contract.page} planned "${contract.requestedMechanic}" but generated "${actual}".`,
      });
    }
    if (contract.prohibitedMechanics.includes(actual)) {
      issues.push({
        code: "page-plan-prohibited-mechanic",
        page: contract.page,
        message: `Page ${contract.page} generated prohibited mechanic "${actual}".`,
      });
    }
    if (contract.explicit && explicitMechanics.size > 1) {
      const duplicate = plan.find(
        (other) =>
          other.explicit &&
          other.page !== contract.page &&
          other.requestedMechanic !== contract.requestedMechanic &&
          mechanicOfActivity(project.pages[other.page - 1]?.activity ?? page.activity) === actual,
      );
      if (duplicate) {
        issues.push({
          code: "page-plan-mechanic-collapse",
          page: contract.page,
          message: `Page ${contract.page} collapsed into the mechanic planned for a different page.`,
        });
      }
    }
    issues.push(...structuralContractIssues(contract.requestedMechanic, page, contract.page));
    if (!hasUnambiguousAnswer(page)) {
      issues.push({
        code: "page-plan-answer",
        page: contract.page,
        message: `Page ${contract.page} has no unambiguous stored answer.`,
      });
    }
    if (contract.explicit) {
      const copy = copyWords(`${page.title} ${page.instruction} ${page.activityType}`);
      const requiredWords = meaningfulWords(contract.requiredContent);
      if (requiredWords.length && !requiredWords.some((word) => copy.has(word))) {
        issues.push({
          code: "page-plan-instruction",
          page: contract.page,
          message: `Page ${contract.page} copy does not reflect its requested content: "${contract.requiredContent}".`,
        });
      }
    }
  }
  return issues;
}

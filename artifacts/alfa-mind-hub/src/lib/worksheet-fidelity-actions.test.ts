import { defaultSpec } from "./creator-options";
import { applyPromptIntent } from "./learning-domains";
import { applyStudioAction } from "./worksheet-actions";
import { buildWorksheetProject } from "./worksheet-builder";
import { parsePageDirectives } from "./page-directives";
import { mechanicOfActivity } from "./worksheet-objectives";
import {
  buildValidWorksheetProject,
  checkWorksheetProject,
  finalizeWorksheetProject,
} from "./worksheet-service";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PrintablePage } from "@/components/studio/PrintablePage";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Worksheet fidelity/actions: ${message}`);
}

/**
 * Covers the production path Creator → Studio → final validation. These checks
 * intentionally exercise request fields that used to be metadata-only.
 */
export function runWorksheetFidelityAndActionTests() {
  const promptFirst = applyPromptIntent({
    ...defaultSpec,
    level: "Ages 2–3",
    language: "English",
    printing: "Color",
    prompt:
      "Spanish Grade 4 worksheet: count exactly 5 butterflies in two columns, black and white, on A5 paper.",
  });
  assert(promptFirst.level === "Grade 4", "an explicit prompt level must override a stale selected level.");
  assert(promptFirst.language === "Spanish", "an explicit prompt language must override the UI.");
  assert(promptFirst.paper === "A5", "an explicit paper request must be retained.");
  assert(promptFirst.printing === "Black & White", "a black-and-white prompt must set print mode.");
  assert(
    promptFirst.promptRequirements?.exactObjects.includes("butterfly") &&
      promptFirst.promptRequirements.exactQuantities.includes(5) &&
      promptFirst.promptRequirements.layouts.includes("two-columns"),
    "the requirement contract must retain exact object, quantity, and layout facts.",
  );
  const promptFirstProject = buildValidWorksheetProject(promptFirst, 41);
  assert(
    checkWorksheetProject(promptFirstProject, promptFirst).valid,
    "an exact prompt requirement contract must remain valid through generation.",
  );
  const normalizedFallback = applyPromptIntent({
    ...defaultSpec,
    prompt: "Make a unicorn maze for Grade 2.",
  });
  assert(
    !normalizedFallback.promptRequirements?.unsupported.length,
    "an unavailable visual or activity must normalize to a printable equivalent instead of blocking generation.",
  );
  assert(
    checkWorksheetProject(buildValidWorksheetProject(normalizedFallback, 47), normalizedFallback).valid,
    "a normalized activity fallback must remain printable and request-valid.",
  );

  const oceanCountingPrompt =
    "Create a 2-page ocean counting worksheet for Grade 1. Page 1: Count groups from 1–5. Page 2: Match numbers 1–5 to groups.";
  const oceanCountingSpec = applyPromptIntent({
    ...defaultSpec,
    prompt: oceanCountingPrompt,
    level: "Grade 1",
    pages: "2",
    theme: "Ocean",
    skill: "Counting",
    activityType: "Matching",
  });
  assert(
    parsePageDirectives(oceanCountingSpec).map((directive) => directive.mechanic).join(",") ===
      "count-circle,count-match",
    "count groups must resolve to Count & Circle while numeral matching resolves to Count & Match.",
  );
  const oceanCountingProject = buildValidWorksheetProject(oceanCountingSpec, 53);
  assert(
    oceanCountingProject.pages.map((page) => mechanicOfActivity(page.activity)).join(",") ===
      "count-circle,count-match",
    "the frozen page plan must preserve the distinct explicit counting and matching directives.",
  );
  const countCircle = oceanCountingProject.pages[0]!.activity;
  assert(countCircle.kind === "count-circle", "page 1 must render Count & Circle.");
  if (countCircle.kind === "count-circle") {
    const counts = countCircle.rows
      .map((row) => row.renderedObjects.length)
      .sort((left, right) => left - right);
    const keyedCounts = oceanCountingProject.pages[0]!.answerKey
      .map((entry) => entry.answer)
      .sort((left, right) => left - right);
    assert(
      counts.join(",") === "1,2,3,4,5" && keyedCounts.join(",") === counts.join(","),
      "the Count & Circle page must draw and key every requested quantity from 1 to 5.",
    );
    assert(
      countCircle.rows.every(
        (row) =>
          row.choices.filter(
            (choice) =>
              choice === oceanCountingProject.pages[0]!.answerKey.find((entry) => entry.groupId === row.id)
                ?.answer,
          ).length === 1,
      ),
      "each Count & Circle row must offer exactly one correct numeral.",
    );
  }
  const countMatch = oceanCountingProject.pages[1]!.activity;
  assert(countMatch.kind === "count-match", "page 2 must render Count & Match.");
  if (countMatch.kind === "count-match") {
    const counts = countMatch.groups
      .map((group) => group.renderedObjects.length)
      .sort((left, right) => left - right);
    const bank = [...countMatch.numberChoices].sort((left, right) => left - right);
    const keyedCounts = oceanCountingProject.pages[1]!.answerKey
      .map((entry) => entry.answer)
      .sort((left, right) => left - right);
    assert(
      counts.join(",") === "1,2,3,4,5",
      "the Count & Match page must draw exactly one group for every requested quantity.",
    );
    assert(
      bank.join(",") === counts.join(",") && keyedCounts.join(",") === counts.join(","),
      "the visible matching bank and answer key must exactly match the drawn ocean group quantities.",
    );
  }

  const spec = applyPromptIntent({
    ...defaultSpec,
    prompt: "Spanish ocean vocabulary memory pairs for Grade 3.",
    level: "Grade 3",
    pages: "1",
    skill: "Vocabulary",
    activityType: "Memory Pairs",
    difficulty: "Easy",
    theme: "Ocean",
    language: "Spanish",
    objectiveId: "vocabulary-theme",
    mechanicId: "memory",
    activityMechanic: "memory-pairs",
    source: "idea-lab",
  });
  const initial = finalizeWorksheetProject(buildWorksheetProject(spec, 73), spec);
  assert(checkWorksheetProject(initial, spec).valid, "the original request must be valid.");

  const languageDrift = checkWorksheetProject(initial, { ...spec, language: "English" });
  assert(
    languageDrift.issues.some((issue) => issue.code === "generation-spec-language"),
    "a different worksheet language must be blocked by the immutable request contract.",
  );
  const themeDrift = checkWorksheetProject(initial, { ...spec, theme: "Space" });
  assert(
    themeDrift.issues.some((issue) => issue.code === "generation-spec-theme"),
    "a different theme must be blocked by the immutable request contract.",
  );

  const visualized = applyStudioAction(initial, spec, {
    type: "change-visuals",
    pageId: initial.pages[0]!.id,
  });
  assert(
    visualized.pages[0]!.illustrationStyle.directionId !==
      initial.pages[0]!.illustrationStyle.directionId,
    "Change visuals must affect every activity type, not only count activities.",
  );
  const finalVisualized = finalizeWorksheetProject(visualized, spec);
  assert(checkWorksheetProject(finalVisualized, spec).valid, "visual edits must remain valid.");

  const recolored = applyStudioAction(initial, spec, {
    type: "change-colors",
    palette: "Soft Pastel",
  });
  assert(
    recolored.colorPaletteOverride === "Soft Pastel",
    "Change colors must set the renderer palette override, not only metadata.",
  );

  const added = applyStudioAction(initial, spec, { type: "add-page" });
  assert(added !== initial, "Add page must create a new editable practice page.");
  const editedSpec = { ...spec, pages: String(added.pages.length) };
  assert(
    added.generationSpecification?.requestedPageCount === added.pages.length,
    "manual page addition must update the saved page-count contract.",
  );
  const finalAdded = finalizeWorksheetProject(added, editedSpec);
  assert(
    checkWorksheetProject(finalAdded, editedSpec).valid,
    "a Studio-added page must remain printable and request-valid.",
  );

  const spanishA5Spec = applyPromptIntent({
    ...spec,
    prompt: "Spanish A5 ocean vocabulary memory pairs for Grade 3.",
    language: "Spanish",
    paper: "A5",
  });
  const spanishA5 = finalizeWorksheetProject(buildWorksheetProject(spanishA5Spec, 91), spanishA5Spec);
  const spanishA5Markup = renderToStaticMarkup(
    createElement(PrintablePage, {
      project: spanishA5,
      page: spanishA5.pages[0]!,
      index: 0,
      mode: "premium",
    }),
  );
  assert(spanishA5Markup.includes(">Nombre<"), "Spanish worksheets must localize the student field.");
  assert(spanishA5Markup.includes(">Fecha<"), "Spanish worksheets must localize the date field.");
  assert(!spanishA5Markup.includes(">Name<"), "Spanish headers must not leak English labels.");
  assert(
    spanishA5Markup.includes("width:27mm") && spanishA5Markup.includes("width:18mm"),
    "A5 headers must use the compact field widths.",
  );
}
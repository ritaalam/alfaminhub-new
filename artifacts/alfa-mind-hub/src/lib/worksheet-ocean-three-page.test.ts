import { defaultSpec } from "./creator-options";
import { buildValidWorksheetProject, checkWorksheetProject } from "./worksheet-service";
import { validatePatternRow } from "./worksheet-patterns";

const prompt = `Create a 3-page colorful ocean-themed math worksheet for ages 4–5. Page 1 – Count the Sea Animals: Show 5 different groups of cute sea animals (fish, starfish, crabs, turtles, and octopuses). Each group must contain between 1 and 5 animals. Put three number choices next to each group, with exactly one correct answer. Page 2 – Match the Number: Show numbers 1–5 on the left and five different groups of sea animals on the right. Children draw a line from each number to the group containing exactly that many animals. Do not arrange the groups in number order. Page 3 – Ocean Pattern: Create 4 simple AB or ABB patterns using different sea animals. Leave the final position empty for the child to complete. Use large, cute, colorful visuals, clean spacing, minimal text, and an attractive Pinterest-quality preschool worksheet design. Every quantity, answer choice, and answer key must be mathematically correct. Make all three pages visually different while keeping the same ocean theme. Follow exactly 3 pages and do not substitute another activity.`;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

export function runOceanThreePageWorksheetTests() {
  const spec = { ...defaultSpec, level: "Ages 4–5", pages: "3", prompt };
  const project = buildValidWorksheetProject(spec, 1);
  const [countPage, matchPage, patternPage] = project.pages;

  assert(project.pages.length === 3, "Ocean request must render exactly three pages.");
  assert(countPage?.activity.kind === "count-circle", "Page 1 must remain Count & Circle.");
  assert(matchPage?.activity.kind === "count-match", "Page 2 must remain Count & Match.");
  assert(patternPage?.activity.kind === "pick-one", "Page 3 must remain pattern completion.");
  if (
    !countPage ||
    countPage.activity.kind !== "count-circle" ||
    !matchPage ||
    matchPage.activity.kind !== "count-match" ||
    !patternPage ||
    patternPage.activity.kind !== "pick-one"
  ) {
    return;
  }

  assert(countPage.activity.rows.length === 5, "Page 1 must show exactly five animal groups.");
  const requiredAnimals = ["fish", "starfish", "crab", "turtle", "octopus"];
  const displayedAnimals = new Set(countPage.activity.rows.map((row) => row.renderedObjects[0]?.asset));
  assert(
    requiredAnimals.every((animal) => displayedAnimals.has(animal)),
    "Page 1 must preserve each named sea animal.",
  );
  for (const row of countPage.activity.rows) {
    assert(
      row.renderedObjects.length >= 1 && row.renderedObjects.length <= 5,
      "Page 1 quantities must stay within 1–5.",
    );
    assert(row.choices.length === 3, "Each Page 1 group must have exactly three number choices.");
    assert(
      row.choices.filter((choice) => choice === row.correctAnswer).length === 1,
      "Each Page 1 group must have exactly one correct choice.",
    );
  }

  assert(matchPage.activity.groups.length === 5, "Page 2 must show exactly five animal groups.");
  assert(matchPage.activity.numberBankSide === "left", "Page 2 number bank must render on the left.");
  const quantities = matchPage.activity.groups.map((group) => group.correctAnswer).sort((a, b) => a - b);
  assert(JSON.stringify(quantities) === JSON.stringify([1, 2, 3, 4, 5]), "Page 2 must map 1–5 one-to-one.");
  assert(
    !matchPage.activity.numberChoices.every(
      (choice, index) => choice === matchPage.activity.groups[index]?.correctAnswer,
    ),
    "Page 2 number bank must not be arranged in group order.",
  );

  assert(patternPage.activity.rows.length === 4, "Page 3 must show exactly four patterns.");
  for (const row of patternPage.activity.rows) {
    assert(row.patternRule === "AB" || row.patternRule === "ABB", "Page 3 must use AB or ABB patterns.");
    assert(row.promptGap, "Every Page 3 pattern must leave its final position empty.");
    assert(row.options.length === 3, "Every Page 3 pattern must offer exactly three choices.");
    const answer = row.options.find((option) => option.id === row.answerOptionId);
    assert(answer?.renderedObjects[0], "Every Page 3 pattern must have one answer option.");
    assert(
      validatePatternRow({
        rule: row.patternRule,
        unit: row.patternUnit,
        sequence: (row.promptObjects ?? []).map((object) => object.asset),
        answer: answer.renderedObjects[0].asset,
        choices: row.options.map((option) => option.renderedObjects[0]!.asset),
      }).length === 0,
      "Every Page 3 pattern must have a mathematically valid answer key.",
    );
  }

  const errors = checkWorksheetProject(project, spec).issues.filter((issue) => issue.severity === "error");
  assert(errors.length === 0, `Ocean request must pass validation: ${errors.map((issue) => issue.message).join(" | ")}`);
}
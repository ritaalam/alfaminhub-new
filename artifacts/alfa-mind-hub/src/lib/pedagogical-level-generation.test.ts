import { defaultSpec, type WorksheetSpec } from "./creator-options";
import { resolveAgeTokens } from "./age-tokens";
import { rangeForSpec } from "./worksheet-builder";
import { buildValidWorksheetProject, checkWorksheetProject } from "./worksheet-service";
import { mechanicOfActivity } from "./worksheet-objectives";

const levels = [
  "Ages 2–3",
  "Ages 3–4",
  "Ages 4–5",
  "Preschool",
  "Pre-K",
  "Kindergarten",
  "Grade 1",
  "Grade 2",
  "Grade 3",
  "Grade 4",
  "Grade 5",
  "Grade 6",
  "My mixed-age intervention group",
] as const;

const makeSpec = (level: string): WorksheetSpec => ({
  ...defaultSpec,
  level,
  pages: "5",
  difficulty: "Standard",
  prompt: "Create a 5-page early math worksheet about insects.",
});

function pageItemCount(project: ReturnType<typeof buildValidWorksheetProject>) {
  return project.pages.reduce((total, page) => {
    if (page.activity.kind === "count-match") return total + page.activity.groups.length;
    if (page.activity.kind === "count-circle") return total + page.activity.rows.length;
    if (page.activity.kind === "pick-one" || page.activity.kind === "order-sequence")
      return total + page.activity.rows.length;
    if (page.activity.kind === "find-count") return total + page.activity.sceneObjects.length;
    if (page.activity.kind === "sort-groups") return total + page.activity.items.length;
    return total;
  }, 0);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function equal(actual: unknown, expected: unknown, message: string) {
  assert(JSON.stringify(actual) === JSON.stringify(expected), `${message}\nExpected: ${JSON.stringify(expected)}\nReceived: ${JSON.stringify(actual)}`);
}

function fingerprint(level: string) {
  const spec = makeSpec(level);
  const profile = resolveAgeTokens(level);
  const project = buildValidWorksheetProject(spec);
  return {
    profile: profile.id,
    mechanics: project.pages.map((page) => mechanicOfActivity(page.activity)),
    range: rangeForSpec(spec),
    density: pageItemCount(project),
    instruction: project.pages[0]?.instruction,
    content: JSON.stringify(project.pages.map((page) => page.activity)),
    writing: profile.writingDemand,
    distractors: profile.distractorCount,
    scaffolding: profile.visualScaffolding,
    validation: checkWorksheetProject(project, spec).issues.filter((issue) => issue.severity === "error"),
  };
}

/**
 * Executed by scripts/run-pedagogical-level-tests.mjs through Vite's SSR
 * loader. Keeping this dependency-free makes it runnable in the workspace
 * while the package firewall blocks Vitest downloads.
 */
export function runPedagogicalLevelGenerationTests() {
  for (const level of levels) {
    const profile = resolveAgeTokens(level);
    assert(Boolean(profile.id), `${level}: profile id is missing`);
    assert(profile.allowedMechanics.length > 0, `${level}: no allowed mechanics`);
    assert(
      profile.difficultyRanges.Standard[1] <= profile.maxQuantity,
      `${level}: standard range exceeds its concrete quantity ceiling`,
    );
    assert(profile.instructionSteps >= 1, `${level}: instruction steps are missing`);
  }

  const results = Object.fromEntries(
    ["Ages 4–5", "Kindergarten", "Grade 2", "Grade 4", "Grade 6"].map((level) => [
      level,
      fingerprint(level),
    ]),
  );

  for (const [level, result] of Object.entries(results)) {
    equal(result.validation, [], `${level}: generated an invalid worksheet`);
  }

  // A comparison fingerprint protects all of the level-sensitive dimensions:
  // activity sequence, concrete range, item density, language, and generated
  // content. These are deliberately not label-only differences.
  equal(results["Ages 4–5"]!.range, [2, 8], "Ages 4–5: unexpected range");
  equal(results.Kindergarten!.range, [5, 12], "Kindergarten: unexpected range");
  equal(results["Grade 2"]!.range, [10, 20], "Grade 2: unexpected range");
  equal(results["Grade 4"]!.range, [14, 20], "Grade 4: unexpected range");
  equal(results["Grade 6"]!.range, [17, 20], "Grade 6: unexpected range");
  assert(
    JSON.stringify(results["Grade 2"]!.mechanics) !== JSON.stringify(results["Grade 4"]!.mechanics),
    "Grade 2 and Grade 4 must use a different mechanic sequence",
  );
  assert(
    JSON.stringify(results["Grade 4"]!.mechanics) !== JSON.stringify(results["Grade 6"]!.mechanics),
    "Grade 4 and Grade 6 must use a different mechanic sequence",
  );
  assert(
    results["Ages 4–5"]!.instruction !== results["Grade 6"]!.instruction,
    "Early years and Grade 6 must use different instructional scaffolding",
  );
  assert(
    results["Ages 4–5"]!.density !== results["Grade 6"]!.density,
    "Early years and Grade 6 must use a different visual density",
  );
  assert(
    results["Ages 4–5"]!.content !== results["Grade 6"]!.content,
    "Early years and Grade 6 must generate different activity content",
  );

  const craftSpec: WorksheetSpec = {
    ...defaultSpec,
    level: "Ages 4–5",
    pages: "2",
    prompt: "Create a 2-page cut and create underwater aquarium craft pack with fish.",
  };
  const mixedSpec: WorksheetSpec = {
    ...defaultSpec,
    level: "Grade 2",
    pages: "2",
    prompt: [
      "Create a 2-page worksheet for Grade 2.",
      "Page 1: Find and circle every letter B and b.",
      "Page 2: Count the insects and circle the correct number.",
    ].join("\n"),
  };
  for (const spec of [craftSpec, mixedSpec]) {
    const project = buildValidWorksheetProject(spec);
    equal(
      checkWorksheetProject(project, spec).issues.filter((issue) => issue.severity === "error"),
      [],
      `${spec.level}: supported craft or mixed-domain request became invalid`,
    );
  }

  const levelConstrainedRequests: Array<{ level: string; prompt: string; literacy?: boolean }> = [
    { level: "Ages 2–3", prompt: "Create a 3-page alphabet and phonics worksheet about letter B.", literacy: true },
    { level: "Ages 3–4", prompt: "Create a 3-page alphabet and phonics worksheet about letter B.", literacy: true },
    { level: "Grade 6", prompt: "Create a 3-page alphabet and phonics worksheet about letter B.", literacy: true },
    { level: "Ages 2–3", prompt: "Create a handwriting worksheet to trace and write numbers 1-5." },
    { level: "Ages 4–5", prompt: "Create a handwriting worksheet to trace and write numbers 1-5." },
    { level: "Grade 6", prompt: "Create a handwriting worksheet to trace and write numbers 1-5." },
  ];
  for (const request of levelConstrainedRequests) {
    const spec = { ...defaultSpec, level: request.level, pages: "3", prompt: request.prompt };
    const project = buildValidWorksheetProject(spec);
    const profile = resolveAgeTokens(request.level);
    const permitted = request.literacy ? profile.literacyMechanics : profile.allowedMechanics;
    equal(
      checkWorksheetProject(project, spec).issues.filter((issue) => issue.severity === "error"),
      [],
      `${request.level}: a supported literacy or handwriting request became invalid`,
    );
    for (const page of project.pages) {
      assert(
        permitted.includes(mechanicOfActivity(page.activity)),
        `${request.level}: planned an age-disallowed ${mechanicOfActivity(page.activity)} mechanic`,
      );
    }
  }
}
import { createServer } from "vite";

const server = await createServer({
  root: process.cwd(),
  server: { middlewareMode: true },
  appType: "custom",
});

try {
  const pedagogical = await server.ssrLoadModule("/src/lib/pedagogical-level-generation.test.ts");
  const studio = await server.ssrLoadModule("/src/lib/studio-differentiation.test.ts");
  const hybridPlanner = await server.ssrLoadModule("/src/lib/worksheet-ai-planner.test.ts");
  const oceanThreePage = await server.ssrLoadModule("/src/lib/worksheet-ocean-three-page.test.ts");
  const advancedActivityFidelity = await server.ssrLoadModule(
    "/src/lib/advanced-activity-type-fidelity.test.ts",
  );
  const quickActivityTypeContract = await server.ssrLoadModule(
    "/src/lib/quick-activity-type-contract.runtime-test.ts",
  );
  const fidelityActions = await server.ssrLoadModule("/src/lib/worksheet-fidelity-actions.test.ts");
  const illustrations = await server.ssrLoadModule("/src/lib/illustration-library.runtime-test.ts");
  const printQuality = await server.ssrLoadModule("/src/lib/print-quality.runtime-test.tsx");
  pedagogical.runPedagogicalLevelGenerationTests();
  studio.runStudioDifferentiationTests();
  fidelityActions.runWorksheetFidelityAndActionTests();
  illustrations.runIllustrationLibraryTests();
  printQuality.runPrintQualityTests();
  await hybridPlanner.runHybridWorksheetPlannerTests();
  oceanThreePage.runOceanThreePageWorksheetTests();
  advancedActivityFidelity.runAdvancedActivityTypeFidelityTests();
  await quickActivityTypeContract.runQuickActivityTypeContractTests();
  console.log("Pedagogical level, Studio, fidelity, and hybrid AI planner checks passed.");
} finally {
  await server.close();
}
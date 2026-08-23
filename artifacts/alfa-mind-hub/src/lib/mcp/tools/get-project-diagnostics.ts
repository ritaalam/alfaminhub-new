import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { runPreset, type CommandPreset, type CommandResult } from "../project-fs";
import { jsonResult, requireAuth } from "../tool-result";

const DEFAULT_CHECKS: CommandPreset[] = ["typecheck", "lint", "test"];

function summarise(result: CommandResult) {
  const output = `${result.stdout}\n${result.stderr}`;
  const failureLines = output
    .split("\n")
    .filter((line) => /\berror\b|\bfailed\b|✗|FAIL|TS\d{4}/i.test(line))
    .slice(0, 40)
    .map((line) => line.trim());

  return {
    check: result.preset,
    label: result.label,
    passed: result.exitCode === 0 && !result.timedOut,
    exitCode: result.exitCode,
    timedOut: result.timedOut,
    failures: failureLines,
  };
}

export default defineTool({
  name: "get_project_diagnostics",
  title: "Get project diagnostics",
  description:
    "Run the allowlisted checks and return typecheck / lint / test / build failures in structured form.",
  inputSchema: {
    checks: z
      .array(z.enum(["typecheck", "lint", "test", "build"]))
      .max(4)
      .optional()
      .describe("Defaults to typecheck, lint and test."),
  },
  annotations: { readOnlyHint: false, openWorldHint: false },
  handler: async ({ checks }, ctx) => {
    const denied = requireAuth(ctx);
    if (denied) return denied;

    const selected = (checks?.length ? checks : DEFAULT_CHECKS) as CommandPreset[];
    const results: Record<string, unknown>[] = [];
    const unavailable: { check: string; reason: string }[] = [];

    for (const preset of selected) {
      const result = await runPreset(preset);
      if ("success" in result) {
        unavailable.push({ check: preset, reason: result.error });
        continue;
      }
      results.push(summarise(result));
    }

    const allPassed =
      unavailable.length === 0 && results.every((r) => (r as { passed: boolean }).passed);

    return jsonResult({
      success: true,
      allPassed,
      diagnostics: results,
      unavailable,
    });
  },
});

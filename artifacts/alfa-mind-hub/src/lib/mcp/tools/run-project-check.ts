import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { COMMAND_PRESETS, runPreset, type CommandPreset } from "../project-fs";
import { jsonError, jsonResult, requireAuth } from "../tool-result";

export default defineTool({
  name: "run_project_check",
  title: "Run project check",
  description:
    "Run one allowlisted project check (typecheck, lint, test or build). Arbitrary shell commands are not accepted.",
  inputSchema: {
    commandPreset: z
      .enum(["typecheck", "lint", "test", "build"])
      .describe("One of: typecheck | lint | test | build"),
  },
  annotations: { readOnlyHint: false, openWorldHint: false },
  handler: async ({ commandPreset }, ctx) => {
    const denied = requireAuth(ctx);
    if (denied) return denied;

    const preset = commandPreset as CommandPreset;
    if (!(preset in COMMAND_PRESETS)) {
      return jsonError(
        "unknown_preset",
        `Allowed presets: ${Object.keys(COMMAND_PRESETS).join(", ")}`,
      );
    }

    const result = await runPreset(preset);
    if ("success" in result) return jsonError(result.code, result.error);

    return jsonResult({
      success: result.exitCode === 0 && !result.timedOut,
      ...result,
    });
  },
});

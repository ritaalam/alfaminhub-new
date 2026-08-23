import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { readTextFile, safeRelativePath, writeTextFile } from "../project-fs";
import { jsonError, jsonResult, requireAuth } from "../tool-result";

export default defineTool({
  name: "apply_project_patch",
  title: "Apply project patch",
  description:
    "Make a targeted edit to one repository file by replacing an exact snippet, leaving the rest of the file untouched.",
  inputSchema: {
    path: z.string().min(1).max(400).describe("Repo-relative file path"),
    find: z.string().min(1).max(200_000).describe("Exact existing snippet to replace"),
    replace: z.string().max(200_000).describe("Replacement text (empty string deletes the snippet)"),
    expectedOccurrences: z
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .describe("Required number of matches; defaults to 1 (edit fails if it differs)"),
  },
  annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  handler: async ({ path, find, replace, expectedOccurrences }, ctx) => {
    const denied = requireAuth(ctx);
    if (denied) return denied;

    const safe = safeRelativePath(path);
    if ("success" in safe) return jsonError(safe.code, safe.error);

    const file = await readTextFile(safe.rel);
    if ("success" in file) return jsonError(file.code, file.error);

    const occurrences = file.content.split(find).length - 1;
    const expected = expectedOccurrences ?? 1;
    if (occurrences === 0) {
      return jsonError("no_match", `The snippet was not found in "${safe.rel}".`);
    }
    if (occurrences !== expected) {
      return jsonError(
        "ambiguous_match",
        `Found ${occurrences} occurrences but expected ${expected}. Provide a longer, unique snippet.`,
      );
    }

    const next = file.content.split(find).join(replace);
    const result = await writeTextFile(safe.rel, next);
    if ("success" in result) return jsonError(result.code, result.error);

    return jsonResult({
      success: true,
      path: safe.rel,
      replacements: occurrences,
      bytes: result.bytes,
    });
  },
});

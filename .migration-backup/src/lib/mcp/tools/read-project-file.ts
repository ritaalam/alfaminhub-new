import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { readTextFile, safeRelativePath } from "../project-fs";
import { jsonError, jsonResult, requireAuth } from "../tool-result";

export default defineTool({
  name: "read_project_file",
  title: "Read project file",
  description: "Read a text source file from inside the repository. Secret and config-sensitive files are blocked.",
  inputSchema: {
    path: z.string().min(1).max(400).describe("Repo-relative file path"),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ path }, ctx) => {
    const denied = requireAuth(ctx);
    if (denied) return denied;

    const safe = safeRelativePath(path);
    if ("success" in safe) return jsonError(safe.code, safe.error);

    const result = await readTextFile(safe.rel);
    if ("success" in result) return jsonError(result.code, result.error);

    const lines = result.content.split("\n");
    return jsonResult({
      success: true,
      path: safe.rel,
      lineCount: lines.length,
      content: result.content,
    });
  },
});

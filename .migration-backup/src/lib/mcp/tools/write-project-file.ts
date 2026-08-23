import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { safeRelativePath, writeTextFile } from "../project-fs";
import { jsonError, jsonResult, requireAuth } from "../tool-result";

export default defineTool({
  name: "write_project_file",
  title: "Write project file",
  description:
    "Create or replace a text source file inside the repository. Secrets, credentials, keys, .git, node_modules and build output are blocked.",
  inputSchema: {
    path: z.string().min(1).max(400).describe("Repo-relative file path"),
    content: z.string().max(400_000).describe("Full new file contents"),
  },
  annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  handler: async ({ path, content }, ctx) => {
    const denied = requireAuth(ctx);
    if (denied) return denied;

    const safe = safeRelativePath(path);
    if ("success" in safe) return jsonError(safe.code, safe.error);

    const result = await writeTextFile(safe.rel, content);
    if ("success" in result) return jsonError(result.code, result.error);

    return jsonResult({
      success: true,
      path: safe.rel,
      created: result.created,
      bytes: result.bytes,
    });
  },
});

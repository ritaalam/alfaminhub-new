import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { listDirectory, matchesGlob, safeRelativePath } from "../project-fs";
import { jsonError, jsonResult, requireAuth } from "../tool-result";

export default defineTool({
  name: "list_project_files",
  title: "List project files",
  description:
    "List repository files and directories (node_modules, build output, .git, caches and secret files are excluded).",
  inputSchema: {
    path: z.string().max(400).optional().describe('Repo-relative directory, default: repo root ("")'),
    recursive: z.boolean().optional().describe("Walk subdirectories (default true)"),
    glob: z.string().max(200).optional().describe('Optional filter, e.g. "src/**/*.ts"'),
    limit: z.number().int().min(1).max(2000).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ path, recursive, glob, limit }, ctx) => {
    const denied = requireAuth(ctx);
    if (denied) return denied;

    let rel = "";
    if (path && path !== "." && path !== "/") {
      const safe = safeRelativePath(path);
      if ("success" in safe) return jsonError(safe.code, safe.error);
      rel = safe.rel;
    }

    try {
      const entries = await listDirectory(rel, {
        recursive: recursive ?? true,
        limit: limit ?? 800,
      });
      const filtered = glob
        ? entries.filter((e) => e.type === "directory" || matchesGlob(e.path, glob))
        : entries;
      return jsonResult({
        success: true,
        root: rel || ".",
        count: filtered.length,
        entries: filtered,
      });
    } catch (error) {
      return jsonError("list_failed", error instanceof Error ? error.message : String(error));
    }
  },
});

import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { isTextPath, listDirectory, matchesGlob, readTextFile } from "../project-fs";
import { jsonError, jsonResult, requireAuth } from "../tool-result";

export default defineTool({
  name: "search_project_code",
  title: "Search project code",
  description:
    "Search repository source files for a literal string or regular expression and return matching paths with line snippets.",
  inputSchema: {
    query: z.string().min(1).max(200).describe("Literal text or regular expression"),
    glob: z.string().max(200).optional().describe('Optional path filter, e.g. "src/lib/**/*.ts"'),
    regex: z.boolean().optional().describe("Treat query as a regular expression (default false)"),
    maxResults: z.number().int().min(1).max(300).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, glob, regex, maxResults }, ctx) => {
    const denied = requireAuth(ctx);
    if (denied) return denied;

    let matcher: RegExp;
    try {
      matcher = regex
        ? new RegExp(query, "i")
        : new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    } catch (error) {
      return jsonError("invalid_query", error instanceof Error ? error.message : String(error));
    }

    const limit = maxResults ?? 100;
    const matches: { path: string; line: number; text: string }[] = [];

    try {
      const entries = await listDirectory("", { recursive: true, limit: 4000 });
      for (const entry of entries) {
        if (matches.length >= limit) break;
        if (entry.type !== "file" || !isTextPath(entry.path)) continue;
        if (!matchesGlob(entry.path, glob)) continue;
        const file = await readTextFile(entry.path);
        if ("success" in file) continue;
        const lines = file.content.split("\n");
        for (let i = 0; i < lines.length; i += 1) {
          if (matches.length >= limit) break;
          const text = lines[i] ?? "";
          if (matcher.test(text)) {
            matches.push({ path: entry.path, line: i + 1, text: text.trim().slice(0, 300) });
          }
        }
      }
    } catch (error) {
      return jsonError("search_failed", error instanceof Error ? error.message : String(error));
    }

    return jsonResult({
      success: true,
      query,
      truncated: matches.length >= limit,
      count: matches.length,
      matches,
    });
  },
});

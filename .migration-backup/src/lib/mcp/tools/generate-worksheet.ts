import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { defaultSpec, type WorksheetSpec } from "@/lib/creator-options";
import { buildValidWorksheetProject, checkWorksheetProject } from "@/lib/worksheet-service";

const str = z.string().trim().min(1).max(80);

export default defineTool({
  name: "generate_worksheet",
  title: "Generate worksheet",
  description:
    "Generate a structured, print-ready Alfa Mind Hub worksheet project (pages, activities, answer key, art direction) from a creator spec. Any field left out falls back to the app default. Use list_worksheet_options for allowed values.",
  inputSchema: {
    level: str.optional().describe('e.g. "Ages 4–5", "Kindergarten", "Grade 1"'),
    duration: str.optional().describe('e.g. "10 minutes"'),
    pages: z.coerce.number().int().min(1).max(20).optional().describe("1–20 pages"),
    approach: str.optional().describe('e.g. "Montessori", "Waldorf"'),
    skill: str.optional().describe('e.g. "Counting"'),
    activityType: str.optional(),
    difficulty: str.optional().describe('"Very Easy" | "Easy" | "Standard" | "Challenge"'),
    theme: str.optional().describe('e.g. "Insects"'),
    palette: str.optional(),
    inspiration: str.optional(),
    language: str.optional(),
    paper: str.optional().describe('"A4" | "Letter" | "A5"'),
    printing: str.optional().describe('e.g. "Color", "Ink-saver", "Black & White"'),
    version: z.coerce
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .describe("Bump for a different deterministic variation of the same spec."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: (input) => {
    const { version, pages, ...rest } = input;
    const spec: WorksheetSpec = {
      ...defaultSpec,
      ...Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined)),
      ...(pages ? { pages: String(pages) } : {}),
    };

    const project = buildValidWorksheetProject(spec, version ?? 1);
    const result = checkWorksheetProject(project, spec);

    if (!result.valid) {
      throw new ToolError(
        `Generated worksheet failed Alfa quality validation: ${result.issues
          .filter((i) => i.severity === "error")
          .map((i) => i.message)
          .join(" ")}`,
      );
    }

    const payload = { spec, project, validation: result };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});

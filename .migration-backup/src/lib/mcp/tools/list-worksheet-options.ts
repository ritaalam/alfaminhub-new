import { defineTool } from "@lovable.dev/mcp-js";
import {
  basicsGroups,
  learningGroups,
  outputGroups,
  styleGroups,
  defaultSpec,
} from "@/lib/creator-options";

export default defineTool({
  name: "list_worksheet_options",
  title: "List worksheet options",
  description:
    "List every field the worksheet creator accepts (level, duration, pages, approach, skill, theme, palette, paper, printing…) with its allowed values and the defaults.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => {
    const groups = [
      { step: "Basics", fields: basicsGroups },
      { step: "Learning", fields: learningGroups },
      { step: "Style", fields: styleGroups },
      { step: "Output", fields: outputGroups },
    ].map((g) => ({
      step: g.step,
      fields: g.fields.map((f) => ({
        key: f.key,
        label: f.label,
        options: f.options,
        allowCustom: f.allowCustom ?? false,
      })),
    }));

    const payload = { defaults: defaultSpec, groups };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});

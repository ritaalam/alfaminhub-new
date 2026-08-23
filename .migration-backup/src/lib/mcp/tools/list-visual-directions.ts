import { defineTool } from "@lovable.dev/mcp-js";
import { printModes, visualDirections } from "@/lib/visual-directions";

export default defineTool({
  name: "list_visual_directions",
  title: "List visual directions",
  description:
    "List Alfa Mind Hub's original art-direction presets (visual DNA, palette, print suitability) and the available print modes.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => {
    const payload = {
      printModes,
      directions: visualDirections.map((d) => ({
        id: d.id,
        name: d.name,
        tagline: d.tagline,
        description: d.description,
        signatureCharacters: d.signatureCharacters,
        dna: d.dna,
        palette: d.palette,
      })),
    };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});

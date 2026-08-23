import { auth, defineMcp } from "@lovable.dev/mcp-js";
import generateWorksheet from "./tools/generate-worksheet";
import listVisualDirections from "./tools/list-visual-directions";
import listWorksheetOptions from "./tools/list-worksheet-options";
import listProjectFiles from "./tools/list-project-files";
import readProjectFile from "./tools/read-project-file";
import searchProjectCode from "./tools/search-project-code";
import writeProjectFile from "./tools/write-project-file";
import applyProjectPatch from "./tools/apply-project-patch";
import runProjectCheck from "./tools/run-project-check";
import getProjectDiagnostics from "./tools/get-project-diagnostics";

// Direct Supabase auth host: the runtime SUPABASE_URL becomes a proxy URL after
// publish, which would fail the RFC 8414 issuer match.
const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "alfa-mind-hub",
  title: "Alfa Mind Hub",
  version: "0.1.0",
  instructions:
    "Tools for Alfa Mind Hub's worksheet creator. Call `list_worksheet_options` for the allowed spec values, `list_visual_directions` for the art-direction presets and print modes, and `generate_worksheet` to build a validated, print-ready worksheet project with its answer key.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listWorksheetOptions, listVisualDirections, generateWorksheet] as never,
});

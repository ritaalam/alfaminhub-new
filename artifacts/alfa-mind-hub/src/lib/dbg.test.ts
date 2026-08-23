import { it } from "vitest";
import { defaultSpec, type WorksheetSpec } from "@/lib/creator-options";
import { buildWorksheetProject } from "@/lib/worksheet-builder";
import {
  finalizeWorksheetProject,
  checkWorksheetProject,
  buildValidWorksheetProject,
} from "@/lib/worksheet-service";
import { explicitMechanicBreaches } from "@/lib/worksheet-page-contract";

const prompt = [
  "Page 1: Trace the basic shapes: circle, square, triangle and rectangle.",
  "Page 2: Match everyday objects to the shape they look like.",
  "Page 3: Sort the pictures into things we eat and things we play with.",
  "Page 4: Complete the repeating shape patterns (AB and AAB).",
  "Page 5: Count the pictures in each row and draw the same number of circles in the box.",
].join("\n");
const spec: WorksheetSpec = { ...defaultSpec, prompt, level: "Ages 4-5", pages: "5" };

it("dbg", () => {
  const fin = finalizeWorksheetProject(buildWorksheetProject(spec, 1), spec);
  console.log(
    "kinds",
    fin.pages.map((p) => p.activity.kind),
  );
  console.log(
    "issues",
    checkWorksheetProject(fin, spec).issues.map(
      (i) => `${i.severity} ${i.pageId ?? ""} ${i.message}`,
    ),
  );
  console.log(
    "breaches",
    explicitMechanicBreaches(fin.pagePlanContract, fin).map((b) => b.message),
  );
  try {
    buildValidWorksheetProject(spec, 1);
    console.log("VALID OK");
  } catch (e) {
    console.log("FAIL", (e as { details?: string[] }).details);
  }
});

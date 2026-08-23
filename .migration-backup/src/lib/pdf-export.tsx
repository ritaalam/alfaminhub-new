import { createRoot } from "react-dom/client";
import { PrintablePage } from "@/components/studio/PrintablePage";
import type { RenderMode, WorksheetProject } from "@/lib/worksheet-model";

/**
 * Real PDF export.
 *
 * The Studio already renders every worksheet page as a millimetre-accurate A4
 * sheet, so the PDF is produced from those exact same components: each page is
 * mounted offscreen at 1:1 scale, rasterised at high resolution and placed on
 * an A4 page in the document. Page order, artwork, text and the selected print
 * mode/palette are therefore identical to what the teacher sees on screen.
 *
 * The browser print dialog stays available as a separate action / fallback.
 */

const MM_PER_PX = 25.4 / 96;
const A4 = { w: 210, h: 297 };

function safeFileName(title: string) {
  const base = title
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
  return `${base || "alfa-worksheet"}.pdf`;
}

/** wait for fonts + two frames so SVG art and web fonts are painted */
async function settle() {
  try {
    await (document as Document & { fonts?: FontFaceSet }).fonts?.ready;
  } catch {
    /* fonts API unavailable — continue */
  }
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null))));
}

export type PdfExportResult = { ok: true; fileName: string } | { ok: false; reason: string };

export async function exportProjectToPdf(
  project: WorksheetProject,
  mode: RenderMode,
): Promise<PdfExportResult> {
  if (typeof window === "undefined") return { ok: false, reason: "unavailable" };

  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import("jspdf"),
    import("html2canvas-pro"),
  ]);

  const host = document.createElement("div");
  host.setAttribute("data-pdf-export-host", "");
  host.style.cssText = [
    "position:fixed",
    "left:-20000px",
    "top:0",
    "z-index:-1",
    `width:${A4.w}mm`,
    "background:#ffffff",
    "pointer-events:none",
  ].join(";");
  document.body.appendChild(host);

  const root = createRoot(host);

  try {
    root.render(
      <div>
        {project.pages.map((page, i) => (
          <div key={page.id} data-pdf-page={i} style={{ background: "#ffffff" }}>
            <PrintablePage project={project} page={page} index={i} mode={mode} scale={1} />
          </div>
        ))}
      </div>,
    );

    await settle();

    const nodes = [...host.querySelectorAll<HTMLElement>("[data-pdf-page]")];
    if (nodes.length !== project.pages.length) {
      return { ok: false, reason: "render" };
    }

    // Same integrity rule the on-screen export gate uses: every counting
    // exercise must render exactly as many objects as its correct answer.
    const exercises = host.querySelectorAll<HTMLElement>("[data-count-exercise-id]");
    const countsMatch = [...exercises].every((exercise) => {
      const expected = Number(exercise.dataset["correctAnswer"]);
      const actual = exercise.querySelectorAll(":scope [data-rendered-object-id]").length;
      return Number.isFinite(expected) && actual === expected;
    });
    if (!countsMatch) return { ok: false, reason: "validation" };

    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });

    for (let i = 0; i < nodes.length; i += 1) {
      const node = nodes[i]!;
      const sheet = node.querySelector<HTMLElement>(".worksheet-page") ?? node;
      const canvas = await html2canvas(sheet, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false,
        windowWidth: Math.ceil(A4.w / MM_PER_PX),
      });
      const image = canvas.toDataURL("image/jpeg", 0.94);
      if (i > 0) pdf.addPage("a4", "portrait");
      pdf.addImage(image, "JPEG", 0, 0, A4.w, A4.h, undefined, "FAST");
    }

    const fileName = safeFileName(project.title);
    pdf.save(fileName);
    return { ok: true, fileName };
  } catch (error) {
    console.error("[alfa] pdf export failed", error);
    return { ok: false, reason: "error" };
  } finally {
    // unmount outside the React commit phase
    setTimeout(() => {
      root.unmount();
      host.remove();
    }, 0);
  }
}

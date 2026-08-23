import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Copy,
  Download,
  Eye,
  Loader2,
  Minus,
  Palette,
  Plus,
  Printer,
  RefreshCw,
  Save,
  Shapes,
  Sparkles,
  Trash2,
  Type,
  Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorksheetSpec } from "@/lib/creator-options";
import { applyStudioAction, type StudioAction } from "@/lib/worksheet-actions";
import { printPalettes, type RenderMode, type WorksheetProject } from "@/lib/worksheet-model";
import {
  printModes,
  resolveVisualDirection,
  visualDirections,
  applyPrintMode,
} from "@/lib/visual-directions";
import {
  checkWorksheetProject,
  finalizeWorksheetProject,
  validateFinalizedPageData,
} from "@/lib/worksheet-service";
import { exportProjectToPdf } from "@/lib/pdf-export";

import { PrintablePage } from "./PrintablePage";

type Props = {
  project: WorksheetProject;
  spec: WorksheetSpec;
  onProjectChange: (project: WorksheetProject) => void;
  onBack: () => void;
  /** workspace autosave state, surfaced as Saving… → Saved */
  saveState?: "idle" | "saving" | "saved" | "error";
  /** message shown when persistence failed — never show "Saved" in that case */
  saveError?: string | null;
  onSave?: () => void;
  /** timestamp of the last verified persistence, shown as "Saved 14:02" */
  lastSavedAt?: number | null;
  /** open the browser print dialog once, e.g. "Download PDF" from My Workspace */
  autoPrint?: boolean;
  /** restore the exact screen the teacher left (page + print mode) */
  initialPageId?: string | undefined;
  initialPrintMode?: string | undefined;
  /** persist view state so Continue Editing reopens the same page/mode */
  onStudioStateChange?: (state: { activePageId: string; printMode: RenderMode }) => void;
};

const paletteChoices = Object.keys(printPalettes).filter((p) => p !== "Ink Saving");

export function WorksheetStudio({
  project,
  spec,
  onProjectChange,
  onBack,
  saveState = "idle",
  saveError = null,
  onSave,
  lastSavedAt = null,
  autoPrint = false,
  initialPageId,
  initialPrintMode,
  onStudioStateChange,
}: Props) {
  const [mode, setMode] = useState<RenderMode>(
    (initialPrintMode as RenderMode | undefined) ?? project.printMode ?? "premium",
  );
  const [activeId, setActiveId] = useState(
    initialPageId && project.pages.some((p) => p.id === initialPageId)
      ? initialPageId
      : project.pages[0]!.id,
  );
  const [version, setVersion] = useState(1);
  const [showAnswers, setShowAnswers] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(1);
  const printed = useRef(false);
  const validation = useMemo(() => checkWorksheetProject(project, spec), [project, spec]);
  const runtimeErrors = useMemo(() => project.pages.flatMap(validateFinalizedPageData), [project]);
  const productionValid = validation.valid && runtimeErrors.length === 0;

  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const renderedDomIsValid = () => {
    const exercises = document.querySelectorAll<HTMLElement>(
      ".print-area [data-count-exercise-id]",
    );
    // Pages without counting exercises (phonics, patterns, crafts) have nothing
    // to cross-check here — they are already covered by the validation gate.
    if (exercises.length === 0) return true;
    return [...exercises].every((exercise) => {
      const expected = Number(exercise.dataset["correctAnswer"]);
      const actual = exercise.querySelectorAll(":scope [data-rendered-object-id]").length;
      return Number.isFinite(expected) && actual === expected;
    });
  };

  const handlePrint = () => {
    if (!productionValid || !renderedDomIsValid()) return;
    window.print();
  };

  /** Real PDF file; falls back to the print dialog if the browser can't render it. */
  const handleDownloadPdf = async () => {
    if (!productionValid || exporting) return;
    setExporting(true);
    setExportError(null);
    try {
      const result = await exportProjectToPdf(project, mode);
      if (!result.ok) {
        if (result.reason === "validation") {
          setExportError("This worksheet failed its accuracy check, so the PDF was not created.");
        } else {
          setExportError("We couldn't build the PDF here — opening the print dialog instead.");
          window.print();
        }
      }
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    if (!autoPrint || printed.current || !productionValid) return;
    printed.current = true;
    const t = setTimeout(() => {
      if (renderedDomIsValid()) void handleDownloadPdf();
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPrint, productionValid]);


  /* keep the workspace copy of the view state in sync (restored on reopen) */
  useEffect(() => {
    onStudioStateChange?.({ activePageId: activeId, printMode: mode });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, mode]);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const PAGE_PX = 210 * 3.7795;
    const update = () => setFit(Math.min(1, el.clientWidth / PAGE_PX));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const activeIndex = Math.max(
    0,
    project.pages.findIndex((p) => p.id === activeId),
  );
  const activePage = project.pages[activeIndex] ?? project.pages[0]!;

  const dispatch = (action: StudioAction) => {
    const next = finalizeWorksheetProject(applyStudioAction(project, spec, action), spec);
    onProjectChange(next);
    if (action.type === "delete-page" || action.type === "regenerate") {
      setActiveId(next.pages[0]!.id);
    }
    if (action.type === "add-page" || action.type === "duplicate-page") {
      setActiveId(next.pages[next.pages.length - 1]!.id);
    }
  };

  const answerSummary = useMemo(
    () => activePage.answerKey.map((a) => a.answerText ?? a.answer).join(" · "),
    [activePage],
  );

  return (
    <div className="worksheet-studio min-h-screen bg-cream/40">
      {/* Toolbar */}
      <div className="no-print sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1500px] flex-wrap items-center gap-2 px-4 py-2.5">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-cream"
          >
            <ArrowLeft className="size-4" strokeWidth={1.8} /> Back to Creator
          </button>

          <span className="ml-1 hidden min-w-0 truncate font-display text-sm text-foreground sm:block">
            {project.title} · {project.pages.length} pages
          </span>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onSave?.()}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
                saveState === "error"
                  ? "border-destructive text-destructive hover:bg-destructive/5"
                  : "border-border hover:bg-cream",
              )}
            >
              <Save className="size-4" strokeWidth={1.8} />
              {saveState === "saving"
                ? "Saving…"
                : saveState === "saved"
                  ? "Saved"
                  : saveState === "error"
                    ? "Retry save"
                    : "Save"}
            </button>
            <span
              aria-live="polite"
              className={cn(
                "hidden max-w-[240px] truncate text-xs sm:inline",
                saveState === "error" ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {saveState === "saving"
                ? "Saving…"
                : saveState === "saved"
                  ? lastSavedAt
                    ? `Saved ${new Date(lastSavedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                    : "All changes saved"
                  : saveState === "error"
                    ? (saveError ?? "Could not save — changes are not stored.")
                    : ""}
            </span>

            <button
              type="button"
              onClick={() => setShowAnswers((s) => !s)}
              aria-pressed={showAnswers}
              className={cn(
                "flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm transition-colors hover:bg-cream",
                showAnswers && "bg-sage-soft text-secondary-foreground",
              )}
            >
              <Eye className="size-4" strokeWidth={1.8} /> Preview key
            </button>
            <div className="inline-flex rounded-full border border-border p-0.5">
              {printModes.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMode(m.id)}
                  aria-pressed={mode === m.id}
                  title={m.hint}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs transition-colors",
                    mode === m.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={handlePrint}
              disabled={!productionValid}
              title={
                productionValid
                  ? "Open the browser print dialog"
                  : "Export blocked: this worksheet failed validation"
              }
              className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-cream disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Printer className="size-4" strokeWidth={1.8} /> Print
            </button>
            <button
              type="button"
              onClick={() => void handleDownloadPdf()}
              disabled={!productionValid || exporting}
              aria-busy={exporting}
              title={
                productionValid
                  ? "Download an A4 PDF of every page"
                  : "Export blocked: this worksheet failed validation"
              }
              className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {exporting ? (
                <Loader2 className="size-4 animate-spin" strokeWidth={1.8} />
              ) : (
                <Download className="size-4" strokeWidth={1.8} />
              )}
              {exporting ? "Preparing PDF…" : "Download PDF"}
            </button>

          </div>
        </div>
      </div>

      {!productionValid ? (
        <div className="no-print mx-auto w-full max-w-[1500px] px-4 pt-4">
          <div className="rounded-xl border border-terracotta/40 bg-terracotta-soft/40 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <AlertTriangle className="size-4" strokeWidth={1.8} /> We couldn’t perfectly generate
              this activity yet. Please try again or adjust your instructions.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Downloading is paused until the worksheet matches your request.
            </p>
          </div>
        </div>
      ) : null}

      <div className="mx-auto grid w-full max-w-[1500px] gap-5 px-4 py-5 lg:grid-cols-[150px_minmax(0,1fr)_290px]">
        {/* Thumbnails */}
        <aside className="no-print order-2 flex gap-3 overflow-x-auto lg:order-1 lg:sticky lg:top-20 lg:block lg:self-start lg:overflow-visible">
          {project.pages.map((page, i) => (
            <button
              key={page.id}
              type="button"
              onClick={() => setActiveId(page.id)}
              className={cn(
                "mb-3 shrink-0 overflow-hidden rounded-lg border bg-background p-1 text-left transition-shadow",
                page.id === activePage.id
                  ? "border-primary shadow-[var(--shadow-soft)]"
                  : "border-border hover:border-sage",
              )}
              style={{ width: 118 }}
            >
              <div style={{ width: 110, height: 155, overflow: "hidden" }}>
                <PrintablePage
                  project={project}
                  page={page}
                  index={i}
                  mode={mode}
                  scale={110 / (210 * 3.7795)}
                />
              </div>
              <span className="mt-1 block px-1 pb-0.5 text-[11px] text-muted-foreground">
                Page {i + 1}
              </span>
            </button>
          ))}
        </aside>

        {/* Canvas */}
        <div ref={canvasRef} className="order-1 min-w-0 lg:order-2">
          <div className="print-area flex flex-col items-center gap-6">
            {project.pages.map((page, i) => (
              <div
                key={page.id}
                onClick={() => setActiveId(page.id)}
                className={cn(
                  "worksheet-sheet bg-background shadow-[var(--shadow-lift)] ring-1 transition-shadow",
                  page.id === activePage.id ? "ring-primary/40" : "ring-border",
                )}
              >
                <PrintablePage
                  project={project}
                  page={page}
                  index={i}
                  mode={mode}
                  scale={fit}
                  showAnswers={showAnswers}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Editing panel */}
        <aside className="no-print order-3 space-y-4 lg:sticky lg:top-20 lg:self-start">
          <section className="surface-card p-4">
            <h2 className="font-display text-base text-foreground">Page {activeIndex + 1}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{activePage.activityType}</p>

            <label className="mt-3 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Title
            </label>
            <input
              value={activePage.title}
              onChange={(e) =>
                dispatch({
                  type: "edit-text",
                  pageId: activePage.id,
                  field: "title",
                  value: e.target.value,
                })
              }
              className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-sage focus:ring-2 focus:ring-ring/25"
            />
            <label className="mt-3 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Instruction
            </label>
            <textarea
              rows={2}
              value={activePage.instruction}
              onChange={(e) =>
                dispatch({
                  type: "edit-text",
                  pageId: activePage.id,
                  field: "instruction",
                  value: e.target.value,
                })
              }
              className="mt-1.5 w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-sage focus:ring-2 focus:ring-ring/25"
            />
          </section>

          <section className="surface-card p-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Adjust this page
            </h3>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <PanelButton
                icon={Shapes}
                label="Change activity"
                onClick={() => dispatch({ type: "change-activity", pageId: activePage.id })}
              />
              <PanelButton
                icon={Wand2}
                label="Change visuals"
                onClick={() => dispatch({ type: "change-visuals", pageId: activePage.id })}
              />
              <PanelButton
                icon={Minus}
                label="Make easier"
                onClick={() => dispatch({ type: "make-easier", pageId: activePage.id })}
              />
              <PanelButton
                icon={Plus}
                label="Make harder"
                onClick={() => dispatch({ type: "make-harder", pageId: activePage.id })}
              />
              <PanelButton
                icon={Copy}
                label="Duplicate page"
                onClick={() => dispatch({ type: "duplicate-page", pageId: activePage.id })}
              />
              <PanelButton
                icon={Trash2}
                label="Delete page"
                disabled={project.pages.length <= 1}
                onClick={() => dispatch({ type: "delete-page", pageId: activePage.id })}
              />
              <PanelButton
                icon={Plus}
                label="Add page"
                onClick={() => dispatch({ type: "add-page" })}
              />
              <PanelButton
                icon={Type}
                label="Edit text"
                onClick={() =>
                  document.querySelector<HTMLInputElement>(".surface-card input")?.focus()
                }
              />
            </div>
          </section>

          <section className="surface-card p-4">
            <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              <Sparkles className="size-3.5" strokeWidth={1.8} /> Visual direction
            </h3>
            <div className="mt-3 space-y-1.5">
              {visualDirections.map((d) => {
                const pal = applyPrintMode(d.palette, mode);
                const active = project.visualDirection === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() =>
                      onProjectChange({
                        ...project,
                        visualDirection: d.id,
                        illustrationStyle: { ...project.illustrationStyle, directionId: d.id },
                        pages: project.pages.map((pg) => ({
                          ...pg,
                          illustrationStyle: { ...pg.illustrationStyle, directionId: d.id },
                        })),
                      })
                    }
                    className={cn(
                      "flex w-full items-start gap-2.5 rounded-lg border px-2.5 py-2 text-left text-xs transition-colors",
                      active ? "border-primary bg-cream" : "border-border hover:bg-cream",
                    )}
                  >
                    <span className="mt-0.5 flex shrink-0 overflow-hidden rounded-full border border-border/70">
                      {[pal.surface, pal.wing, pal.wingAlt, pal.accent].map((c) => (
                        <span key={c} className="size-3" style={{ backgroundColor: c }} />
                      ))}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-medium text-foreground">{d.name}</span>
                      <span className="block text-[11px] leading-snug text-muted-foreground">
                        {d.tagline}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
              {resolveVisualDirection(project.visualDirection).dna.printSuitability.notes}
            </p>
          </section>

          <section className="surface-card p-4">
            <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              <Palette className="size-3.5" strokeWidth={1.8} /> Change colors
            </h3>
            <div className="mt-3 space-y-1.5">
              {paletteChoices.map((name) => {
                const pal = printPalettes[name]!;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => dispatch({ type: "change-colors", palette: name })}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left text-xs transition-colors",
                      project.meta.palette === name
                        ? "border-primary bg-cream"
                        : "border-border hover:bg-cream",
                    )}
                  >
                    <span className="flex overflow-hidden rounded-full border border-border/70">
                      {[pal.surface, pal.wing, pal.wingAlt, pal.accent].map((c) => (
                        <span key={c} className="size-3" style={{ backgroundColor: c }} />
                      ))}
                    </span>
                    {name}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="surface-card p-4">
            <button
              type="button"
              onClick={() => {
                const v = version + 1;
                setVersion(v);
                dispatch({ type: "regenerate", version: v });
              }}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              <RefreshCw className="size-4" strokeWidth={1.8} /> Generate Another Version
            </button>
            <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
              <Sparkles className="mt-0.5 size-3 shrink-0" strokeWidth={1.8} />
              Deterministic prototype content. Answers stored for a future teacher key:{" "}
              <span className="font-medium text-foreground">{answerSummary}</span>
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}

function PanelButton({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-2 text-left text-xs text-foreground transition-colors hover:bg-cream disabled:opacity-40"
    >
      <Icon className="size-3.5 shrink-0" strokeWidth={1.8} />
      {label}
    </button>
  );
}

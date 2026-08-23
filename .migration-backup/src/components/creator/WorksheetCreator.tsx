import { useEffect, useMemo, useRef, useState } from "react";
import { applyPromptIntent } from "@/lib/learning-domains";
import { ChevronUp, Sparkles, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  basicsGroups,
  defaultSpec,
  steps,
  type WorksheetField,
  type WorksheetSpec,
} from "@/lib/creator-options";
import {
  generateWorksheet,
  generateWorksheetProject,
  finalizeWorksheetProject,
  type WorksheetDocument,
} from "@/lib/worksheet-service";
import type { WorksheetProject } from "@/lib/worksheet-model";
import { WorksheetStudio } from "@/components/studio/WorksheetStudio";
import { OptionChips } from "./OptionChips";
import { WorksheetPreview } from "./WorksheetPreview";
import { WorksheetBrief, briefChips, briefTitle } from "./WorksheetBrief";
import { demoIdeas } from "@/lib/idea-lab";
import { decodeIdeaId, ideaToSpecPatch } from "@/lib/ideas/engine";
import { quickStartPatch } from "@/lib/quick-start";
import { getDraft, saveDraft, useWorkspace } from "@/lib/workspace/store";
import type { ClassProfile } from "@/lib/workspace/types";

export type SaveState = "idle" | "saving" | "saved" | "error";

function specFromClass(spec: WorksheetSpec, profile: ClassProfile): WorksheetSpec {
  return {
    ...spec,
    level: profile.level,
    language: profile.language,
    approach: profile.approach,
    difficulty: profile.difficulty,
    duration: profile.duration,
    printing: profile.printing,
  };
}

const examplePrompt = "Create a 10-minute butterfly counting activity for a 4-year-old.";

const levelGroup = basicsGroups.find((g) => g.key === "level")!;
const pagesGroup = basicsGroups.find((g) => g.key === "pages")!;

type Props = {
  /** resume an existing saved project */
  draftId?: string | null;
  /** demo idea coming from the Idea Lab */
  ideaId?: string | null;
  /** create for a saved class profile */
  classId?: string | null;
  /** Quick Start preset from My Workspace */
  presetId?: string | null;
  /** open the print dialog once a resumed draft is on screen */
  autoPrint?: boolean;
};

export function WorksheetCreator({
  draftId = null,
  ideaId = null,
  classId = null,
  presetId = null,
  autoPrint = false,
}: Props = {}) {
  const workspace = useWorkspace();
  const [spec, setSpec] = useState<WorksheetSpec>(defaultSpec);
  const [mode, setMode] = useState<"quick" | "advanced">("quick");
  const [stepIndex, setStepIndex] = useState(0);
  const [doc, setDoc] = useState<WorksheetDocument | null>(null);
  const [project, setProject] = useState<WorksheetProject | null>(null);
  const [loading, setLoading] = useState(false);
  const [slow, setSlow] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeClassId, setActiveClassId] = useState<string | null>(classId);
  const [savedDraftId, setSavedDraftId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [studioState, setStudioState] = useState<
    { activePageId?: string | undefined; printMode?: string | undefined } | undefined
  >(undefined);
  const [restoredStudio, setRestoredStudio] = useState<
    { activePageId?: string | undefined; printMode?: string | undefined } | undefined
  >(undefined);
  const bootstrapped = useRef<string>("");
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const studioRef = useRef<typeof studioState>(undefined);
  studioRef.current = studioState;

  /* ---- bootstrap: resume a draft, apply an idea, or apply class defaults ---- */
  useEffect(() => {
    // Class data may hydrate after mount; only include readiness when a class
    // was actually requested. Plain Create must not reboot just because the
    // workspace class list changed in the background.
    const classReady = !classId || workspace.classes.some((entry) => entry.id === classId);
    const key = `${draftId ?? ""}|${ideaId ?? ""}|${classId ?? ""}|${presetId ?? ""}|${classReady}`;
    if (bootstrapped.current === key) return;
    bootstrapped.current = key;

    if (draftId) {
      const draft = getDraft(draftId);
      if (draft) {
        // restore the project exactly as it was saved: pages, content, art,
        // palette, print mode, spec, class and the last open studio screen
        setSpec(draft.spec);
        setProject(finalizeWorksheetProject(draft.project, draft.spec));
        setSavedDraftId(draft.id);
        setActiveClassId(draft.classId ?? null);
        setRestoredStudio(draft.studio);
        setStudioState(draft.studio);
        setLastSavedAt(draft.updatedAt);
        setSaveState("saved");
        return;
      }
    }

    // "Create New" (no ?draft=) must never continue writing into the project
    // that was open before — start a genuinely new, unsaved worksheet
    setSavedDraftId(null);
    setProject(null);
    setRestoredStudio(undefined);
    setStudioState(undefined);
    setLastSavedAt(null);
    setSaveState("idle");

    let next: WorksheetSpec | null = null;
    if (ideaId) {
      // composed Idea Lab ideas encode their whole specification in the id;

      // the older hand-written demo ideas remain supported
      const composed = decodeIdeaId(ideaId);
      const patch = composed
        ? ideaToSpecPatch(composed)
        : demoIdeas.find((i) => i.id === ideaId)?.spec;
      if (patch) next = { ...defaultSpec, ...patch } as WorksheetSpec;
    }
    const preset = quickStartPatch(presetId);
    if (preset) next = { ...(next ?? defaultSpec), ...preset };
    if (classId) {
      const profile = workspace.classes.find((c) => c.id === classId);
      if (profile) {
        // A class associates the worksheet with its learners, but a composed
        // Idea Lab brief is already a complete educational specification.
        // Preserve its selected age, difficulty, duration and approach rather
        // than silently replacing them with class defaults.
        if (!ideaId) next = specFromClass(next ?? defaultSpec, profile);
        setActiveClassId(profile.id);
      }
    }
    if (next) {
      setSpec(next);
      setMode(ideaId || presetId ? "advanced" : "quick");
    } else {
      // A plain Create route is a fresh request, not an editor for the last
      // worksheet that happened to occupy this component instance.
      setSpec(defaultSpec);
      setDoc(null);
    }
  }, [draftId, ideaId, classId, presetId, workspace.classes]);

  /**
   * Writes the complete project to the workspace store and only reports
   * "Saved" once the write is verified in persistent storage.
   */
  function persist(nextProject: WorksheetProject, nextSpec = spec) {
    setSaveState("saving");
    try {
      const draft = saveDraft({
        id: savedDraftId,
        spec: nextSpec,
        project: nextProject,
        classId: activeClassId,
        ideaId,
        ...(studioRef.current ? { studio: studioRef.current } : {}),
      });
      if (!getDraft(draft.id)) throw new Error("Worksheet was not persisted.");
      setSavedDraftId(draft.id);
      setSaveState("saved");
      setLastSavedAt(draft.updatedAt);
      setSaveError(null);
      return draft;
    } catch (err) {
      setSaveState("error");
      setSaveError(err instanceof Error ? err.message : "Could not save this worksheet.");
      return null;
    }
  }

  /* autosave: any change made in the Studio is written back to the workspace */
  useEffect(() => {
    if (!project || !savedDraftId) return;
    setSaveState("saving");
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      persist(project, spec);
    }, 700);
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project, spec, studioState]);

  /* never let a teacher lose unsaved work by closing the tab mid-edit */
  useEffect(() => {
    if (!project) return;
    const unsaved = saveState === "saving" || saveState === "error" || saveState === "idle";
    if (!unsaved) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [project, saveState]);

  /* reassure the teacher when a large pack takes longer than a moment */
  useEffect(() => {
    if (!loading) {
      setSlow(false);
      return;
    }
    const t = setTimeout(() => setSlow(true), 3500);
    return () => clearTimeout(t);
  }, [loading]);

  function applyClass(id: string) {
    setActiveClassId(id || null);
    const profile = workspace.classes.find((c) => c.id === id);
    if (profile) setSpec((prev) => specFromClass(prev, profile));
  }

  const step = steps[Math.min(stepIndex, steps.length - 1)]!;

  // the summary must preview what the CURRENT prompt will actually generate,
  // not the untouched defaults (a phonics prompt must never read "Counting")
  const previewSpec = useMemo(() => applyPromptIntent(spec), [spec]);

  const set = (key: WorksheetField | "prompt", value: string) =>
    setSpec((prev) => ({ ...prev, [key]: value }));

  async function handleGenerate() {
    // a second click while a worksheet is already being built must never start
    // a competing generation run
    if (loading) return;
    setLoading(true);
    setMobileOpen(false);
    // never generate on top of the previous result: the CURRENT prompt decides
    // the subject, domain and page count of the new worksheet
    setDoc(null);
    setProject(null);
    setGenerationError(null);
    // the prompt is the source of truth — reflect what it asked for in the spec
    // Snapshot the request once. Async generation and persistence must consume
    // this exact immutable value, never a state object from the previous run.
    const activeSpec = structuredClone(applyPromptIntent(spec));
    if (activeSpec !== spec) setSpec(activeSpec);
    try {
      const [document, structured] = await Promise.all([
        generateWorksheet(activeSpec),
        generateWorksheetProject(activeSpec),
      ]);
      const profile = workspace.classes.find((c) => c.id === activeClassId);
      const finalProject = profile
        ? { ...structured, visualDirection: profile.visualDirection }
        : structured;
      setDoc(document);
      const finalizedProject = finalizeWorksheetProject(finalProject, activeSpec);
      setProject(finalizedProject);
      persist(finalizedProject, activeSpec);
    } catch (err) {
      // Internal validation details are logged for the team only — teachers
      // always see a calm, friendly message.
      const failure = err as {
        name?: string;
        message?: string;
        details?: string[];
        diagnostics?: unknown;
      };
      console.warn("[alfa] worksheet generation failed", {
        name: failure?.name,
        message: failure?.message,
        details: failure?.details,
        diagnostics: failure?.diagnostics,
      });
      setGenerationError(
        "We couldn’t perfectly generate this activity yet. Please try again or adjust your instructions.",
      );
    } finally {
      setLoading(false);
    }
  }

  const refiningNote = (
    <p
      role="status"
      aria-live="polite"
      className="mb-3 rounded-xl bg-sage-soft/60 px-4 py-3 text-xs text-secondary-foreground"
    >
      {slow
        ? "✨ Still creating your worksheet — this one has a few pages, so it takes a moment longer. Your settings are safe."
        : "✨ Creating your worksheet…"}
    </p>
  );

  const generationFallback = (
    <div role="status" className="mb-3 rounded-xl border border-border bg-cream/60 px-4 py-3">
      <p className="text-xs text-foreground">{generationError}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleGenerate}
          className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          Try Again
        </button>
        <button
          type="button"
          onClick={() => {
            setGenerationError(null);
            setMode("advanced");
            setStepIndex(0);
            setMobileOpen(true);
          }}
          className="rounded-full border border-border px-4 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-cream hover:text-foreground"
        >
          Edit Instructions
        </button>
      </div>
    </div>
  );

  if (project) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-background">
        <WorksheetStudio
          project={project}
          spec={spec}
          onProjectChange={setProject}
          onBack={() => setProject(null)}
          saveState={saveState}
          saveError={saveError}
          lastSavedAt={lastSavedAt}
          onSave={() => persist(project)}
          autoPrint={autoPrint}
          initialPageId={restoredStudio?.activePageId}
          initialPrintMode={restoredStudio?.printMode}
          onStudioStateChange={(s) =>
            setStudioState((prev) =>
              prev?.activePageId === s.activePageId && prev?.printMode === s.printMode
                ? prev
                : { activePageId: s.activePageId, printMode: s.printMode },
            )
          }
        />
      </div>
    );
  }

  return (
    <div id="create" className="scroll-mt-20 space-y-6 pb-28 lg:pb-0">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="space-y-4">
          {/* Mode switch */}
          <div className="inline-flex rounded-full border border-border bg-cream p-1">
            {(
              [
                { id: "quick", label: "Quick Create", icon: Sparkles },
                { id: "advanced", label: "Advanced Create", icon: SlidersHorizontal },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                aria-pressed={mode === m.id}
                onClick={() => setMode(m.id)}
                className={cn(
                  "flex items-center gap-2 rounded-full px-4 py-1.5 text-sm transition-colors",
                  mode === m.id
                    ? "bg-background font-medium text-foreground shadow-[var(--shadow-soft)]"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <m.icon className="size-3.5" strokeWidth={1.8} />
                {m.label}
              </button>
            ))}
          </div>

          {/* Prompt */}
          <div className="surface-card p-4 sm:p-5">
            <label htmlFor="prompt" className="text-[13px] font-semibold text-foreground">
              Describe your activity
            </label>
            <textarea
              id="prompt"
              rows={2}
              value={spec.prompt}
              onChange={(e) => set("prompt", e.target.value)}
              placeholder={examplePrompt}
              className="mt-2.5 w-full resize-none rounded-xl border border-border bg-background px-3.5 py-3 text-sm leading-relaxed outline-none placeholder:text-muted-foreground/70 focus:border-sage focus:ring-2 focus:ring-ring/25"
            />
            <button
              type="button"
              onClick={() => set("prompt", examplePrompt)}
              className="mt-2 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              Use the example prompt
            </button>
          </div>

          {mode === "quick" ? (
            <div className="surface-card space-y-5 p-4 sm:p-5">
              {workspace.classes.length > 0 ? (
                <label className="block text-[13px] font-semibold text-foreground">
                  Create for
                  <select
                    value={activeClassId ?? ""}
                    onChange={(e) => applyClass(e.target.value)}
                    className="mt-2 block w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-normal text-foreground"
                  >
                    <option value="">No class — choose settings manually</option>
                    {workspace.classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} · {c.level}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <OptionChips
                compact
                group={levelGroup}
                value={spec.level}
                onChange={(v) => set("level", v)}
              />
              <OptionChips
                compact
                group={pagesGroup}
                value={spec.pages}
                onChange={(v) => set("pages", v)}
              />
              {loading ? refiningNote : null}
              {generationError ? generationFallback : null}
              <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={loading}
                  className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {loading ? "Creating your worksheet…" : "Generate My Worksheet"}
                </button>
                <button
                  type="button"
                  onClick={() => setMode("advanced")}
                  className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
                >
                  Need more control? Switch to Advanced Create
                </button>
              </div>
            </div>
          ) : (
            <div className="surface-card p-4 sm:p-5">
              <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-2">
                {steps.map((s, i) => (
                  <li key={s.id} className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setStepIndex(i)}
                      className={cn(
                        "flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition-colors",
                        i === stepIndex
                          ? "bg-sage-soft font-medium text-secondary-foreground"
                          : "text-muted-foreground hover:bg-cream hover:text-foreground",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-5 items-center justify-center rounded-full text-[11px]",
                          i <= stepIndex
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {i + 1}
                      </span>
                      {s.title}
                    </button>
                    {i < steps.length - 1 ? (
                      <span aria-hidden className="hidden h-px w-5 bg-border sm:block" />
                    ) : null}
                  </li>
                ))}
              </ol>

              <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }}
                />
              </div>

              <div className="mt-5 space-y-5">
                {step.groups.map((group) => (
                  <OptionChips
                    key={group.key}
                    group={group}
                    value={spec[group.key]}
                    onChange={(v) => set(group.key, v)}
                  />
                ))}
              </div>

              <div className="mt-4">
                {loading ? refiningNote : null}
                {generationError ? generationFallback : null}
              </div>

              <div className="mt-6 flex items-center justify-between gap-3 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
                  disabled={stepIndex === 0}
                  className="rounded-full border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-cream hover:text-foreground disabled:opacity-40"
                >
                  Back
                </button>
                <span className="text-xs text-muted-foreground">
                  Step {stepIndex + 1} of {steps.length}
                </span>
                {stepIndex === steps.length - 1 ? (
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={loading}
                    className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
                  >
                    {loading ? "Creating…" : "Generate My Worksheet"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setStepIndex((i) => Math.min(steps.length - 1, i + 1))}
                    className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                  >
                    Continue
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Desktop sticky brief */}
        <aside className="surface-card hidden p-5 lg:sticky lg:top-20 lg:block">
          <WorksheetBrief spec={previewSpec} loading={loading} onGenerate={handleGenerate} />
        </aside>
      </div>

      {doc ? <WorksheetPreview doc={doc} /> : null}

      {/* Mobile collapsible brief bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 lg:hidden">
        {mobileOpen ? (
          <div className="max-h-[70vh] overflow-y-auto border-t border-border bg-background p-5 shadow-[var(--shadow-lift)]">
            <WorksheetBrief spec={previewSpec} loading={loading} onGenerate={handleGenerate} />
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => setMobileOpen((o) => !o)}
          aria-expanded={mobileOpen}
          className="flex w-full items-center justify-between gap-3 border-t border-border bg-cream px-5 py-3 text-left"
        >
          <span className="min-w-0">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Your Worksheet
            </span>
            <span className="block truncate text-sm font-medium text-foreground">
              {briefTitle(previewSpec)}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {briefChips(previewSpec).join(" · ")}
            </span>
          </span>
          <ChevronUp
            className={cn(
              "size-5 shrink-0 text-muted-foreground transition-transform",
              mobileOpen && "rotate-180",
            )}
          />
        </button>
      </div>
    </div>
  );
}

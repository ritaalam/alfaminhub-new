import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  BookmarkCheck,
  BookmarkPlus,
  Clock,
  Layers,
  Printer,
  Shuffle,
  SlidersHorizontal,
  Sparkles,
  Target,
  Users,
  Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  difficulties,
  durations,
  levels,
  themes,
  composeIdea,
  mechanicMap,
  objectiveMap,
  type IdeaSpec,
} from "@/lib/ideas/engine";
import {
  checkIdeaQuality,
  differentiate,
  enrichIdea,
  variationOf,
  variationStyles,
  withPrintable,
} from "@/lib/ideas/rich";
import { createThreeLevels } from "@/lib/ideas/printables";
import { saveIdea, useWorkspace } from "@/lib/workspace/store";

type Props = {
  idea: IdeaSpec;
  classId?: string | null;
  /** replace this idea in place (customise, differentiate, variation) */
  onReplace?: (next: IdeaSpec) => void;
  /** ask for a completely different idea in this slot */
  onAnother?: () => void;
};

const chip = "rounded-full bg-cream px-2.5 py-0.5 text-[11px] text-muted-foreground";
const action =
  "flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-cream hover:text-foreground";
const selectCls =
  "rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-foreground";

/**
 * A complete teacher brief for one activity: objective, skills, materials,
 * preparation, teacher script, child instruction, recommended printables,
 * differentiation and genuinely different variations.
 */
export function RichIdeaCard({ idea, classId, onReplace, onAnother }: Props) {
  const ws = useWorkspace();
  const navigate = useNavigate();
  const [panel, setPanel] = useState<"none" | "customize" | "differentiate" | "variations">("none");
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<string | null>(null);

  const rich = enrichIdea(idea);
  const issues = checkIdeaQuality(rich);
  const blocking = issues.filter((i) => i.severity === "error");
  const saved = ws.ideas.some((i) => i.idea.id === idea.id);

  const recompose = (
    patch: Partial<Record<"level" | "difficulty" | "duration" | "theme", string>>,
  ) => {
    const objective = objectiveMap[idea.objectiveId];
    const mechanic = mechanicMap[idea.mechanicId];
    if (!objective || !mechanic || !onReplace) return;
    onReplace(
      composeIdea({
        objective,
        mechanic,
        theme: patch.theme ?? idea.theme,
        season: idea.season,
        level: patch.level ?? idea.level,
        difficulty: patch.difficulty ?? idea.difficulty,
        duration: patch.duration ?? idea.duration,
        approach: idea.approach,
        pages: idea.pages,
      }),
    );
  };

  const makeThreeLevels = () => {
    setBusy(true);
    try {
      const drafts = createThreeLevels(idea, classId ?? null);
      setCreated(`Created ${drafts.length} printable levels in My Workspace.`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="surface-card flex flex-col p-5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="rounded-full bg-sage-soft px-2.5 py-0.5 text-[11px] font-medium text-secondary-foreground">
          {idea.subject}
        </span>
        <span className={chip}>{idea.level}</span>
        <span className={chip}>{idea.theme}</span>
        <span className={chip}>{idea.difficulty}</span>
        {rich.variation ? <span className={chip}>{rich.variation}</span> : null}
      </div>

      <h3 className="mt-2.5 font-display text-lg leading-snug text-foreground">{idea.title}</h3>

      <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
        <Target className="mt-0.5 size-3.5 shrink-0" strokeWidth={1.8} />
        <span>
          <span className="font-medium text-foreground">Learning objective: </span>
          {rich.objective}
        </span>
      </p>

      <dl className="mt-3 grid gap-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Clock className="size-3.5" strokeWidth={1.8} /> {rich.duration} · {rich.prep}
        </div>
        <div className="flex items-center gap-1.5">
          <Users className="size-3.5" strokeWidth={1.8} /> {rich.grouping} · {idea.approach}
        </div>
        <div className="flex items-center gap-1.5">
          <Layers className="size-3.5" strokeWidth={1.8} /> Skills: {rich.skills.join(", ")}
        </div>
      </dl>

      <div className="mt-3 rounded-2xl bg-cream/60 p-3 text-xs leading-relaxed text-muted-foreground">
        <p className="font-medium text-foreground">What children do</p>
        <p className="mt-0.5">{rich.studentInstruction}</p>
        <p className="mt-2 font-medium text-foreground">Materials</p>
        <p className="mt-0.5">{rich.materials.join(" · ")}</p>
        <p className="mt-2 font-medium text-foreground">Teacher steps</p>
        <ol className="mt-0.5 list-decimal space-y-0.5 pl-4">
          {rich.teacherInstructions.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>

      {/* recommended printables */}
      <div className="mt-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Suggested printable
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {rich.printables.map((p, i) => (
            <button
              key={p.label}
              type="button"
              title={p.why}
              onClick={() => onReplace?.(withPrintable(idea, p.activityType))}
              className={cn(
                "rounded-full border px-3 py-1.5 text-[11px] transition-colors",
                p.activityType === idea.activityType
                  ? "border-sage bg-sage-soft text-secondary-foreground"
                  : "border-border text-muted-foreground hover:bg-cream hover:text-foreground",
                i > 0 && !onReplace && "hidden",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {blocking.length > 0 ? (
        <p className="mt-3 rounded-xl border border-destructive/40 px-3 py-2 text-[11px] text-destructive">
          Quality check: {blocking.map((i) => i.message).join(" ")}
        </p>
      ) : null}

      {/* primary actions */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link
          to="/"
          search={classId ? { idea: idea.id, classId } : { idea: idea.id }}
          className={cn(
            "flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90",
            blocking.length > 0 && "pointer-events-none opacity-50",
          )}
        >
          <Printer className="size-4" strokeWidth={1.8} /> Create printable
        </Link>
        <button
          type="button"
          onClick={() => saveIdea(idea)}
          disabled={saved}
          className={cn(action, saved && "border-sage text-secondary-foreground")}
        >
          {saved ? (
            <>
              <BookmarkCheck className="size-3.5" strokeWidth={1.8} /> Saved
            </>
          ) : (
            <>
              <BookmarkPlus className="size-3.5" strokeWidth={1.8} /> Save idea
            </>
          )}
        </button>
        {onReplace ? (
          <button
            type="button"
            className={action}
            onClick={() => setPanel(panel === "customize" ? "none" : "customize")}
          >
            <SlidersHorizontal className="size-3.5" strokeWidth={1.8} /> Customize
          </button>
        ) : null}
        {onReplace ? (
          <button
            type="button"
            className={action}
            onClick={() => setPanel(panel === "variations" ? "none" : "variations")}
          >
            <Shuffle className="size-3.5" strokeWidth={1.8} /> Try another version
          </button>
        ) : null}
        {onAnother ? (
          <button type="button" className={action} onClick={onAnother}>
            <Sparkles className="size-3.5" strokeWidth={1.8} /> Another idea
          </button>
        ) : null}
        <button
          type="button"
          className={action}
          onClick={() => setPanel(panel === "differentiate" ? "none" : "differentiate")}
        >
          <Wand2 className="size-3.5" strokeWidth={1.8} /> Differentiate this activity
        </button>
      </div>

      {panel === "customize" ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <select
            aria-label="Age or grade"
            className={selectCls}
            value={idea.level}
            onChange={(e) => recompose({ level: e.target.value })}
          >
            {levels.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
          <select
            aria-label="Duration"
            className={selectCls}
            value={idea.duration}
            onChange={(e) => recompose({ duration: e.target.value })}
          >
            {durations.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
          <select
            aria-label="Difficulty"
            className={selectCls}
            value={idea.difficulty}
            onChange={(e) => recompose({ difficulty: e.target.value })}
          >
            {difficulties.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
          <select
            aria-label="Theme"
            className={selectCls}
            value={idea.theme}
            onChange={(e) => recompose({ theme: e.target.value })}
          >
            {themes.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
      ) : null}

      {panel === "variations" ? (
        <div className="mt-3 border-t border-border pt-3">
          <p className="text-[11px] text-muted-foreground">
            Each version changes what children actually do — not just the pictures.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {variationStyles.map((style) => (
              <button
                key={style.id}
                type="button"
                title={style.change}
                onClick={() => {
                  const next = variationOf(idea, style);
                  if (next) onReplace?.(next);
                }}
                className="rounded-full border border-border px-3 py-1.5 text-[11px] text-muted-foreground transition-colors hover:bg-cream hover:text-foreground"
              >
                {style.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {panel === "differentiate" ? (
        <DifferentiationPanel
          idea={idea}
          busy={busy}
          created={created}
          onUse={(next) => onReplace?.(next)}
          onCreateLevels={makeThreeLevels}
          onOpenWorkspace={() => void navigate({ to: "/workspace" })}
        />
      ) : null}
    </article>
  );
}

function DifferentiationPanel({
  idea,
  busy,
  created,
  onUse,
  onCreateLevels,
  onOpenWorkspace,
}: {
  idea: IdeaSpec;
  busy: boolean;
  created: string | null;
  onUse: (next: IdeaSpec) => void;
  onCreateLevels: () => void;
  onOpenWorkspace: () => void;
}) {
  const plan = differentiate(idea);
  const columns = [
    { key: "support", label: "Make it easier", data: plan.support },
    { key: "standard", label: "Standard", data: plan.standard },
    { key: "challenge", label: "Make it harder", data: plan.challenge },
  ] as const;

  return (
    <div className="mt-3 border-t border-border pt-3">
      <div className="grid gap-3 sm:grid-cols-3">
        {columns.map((col) => (
          <div key={col.key} className="rounded-2xl border border-border p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {col.label}
            </p>
            <ul className="mt-1.5 space-y-0.5 text-[11px] text-muted-foreground">
              {col.data.changes.map((c) => (
                <li key={c}>· {c}</li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => onUse(col.data.idea)}
              className="mt-2 w-full rounded-full border border-border px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-cream hover:text-foreground"
            >
              Use this level
            </button>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onCreateLevels}
          disabled={busy}
          className="rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground disabled:opacity-60"
        >
          {busy ? "Creating…" : "Create 3 levels"}
        </button>
        {created ? (
          <span className="flex items-center gap-2 text-[11px] text-muted-foreground">
            {created}
            <button
              type="button"
              onClick={onOpenWorkspace}
              className="underline underline-offset-4"
            >
              Open My Workspace
            </button>
          </span>
        ) : (
          <span className="text-[11px] text-muted-foreground">
            Creates Support, Standard and Challenge printables in My Workspace.
          </span>
        )}
      </div>
    </div>
  );
}

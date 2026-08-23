import { Link } from "@tanstack/react-router";
import {
  ArrowLeftRight,
  BookmarkCheck,
  BookmarkPlus,
  Clock,
  Layers,
  Minus,
  Plus,
  Repeat,
  Target,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  changeTheme,
  makeEasier,
  makeHarder,
  similarIdea,
  type IdeaSpec,
} from "@/lib/ideas/engine";
import { saveIdea, useWorkspace } from "@/lib/workspace/store";

type Props = {
  idea: IdeaSpec;
  /** when provided, differentiation buttons replace the idea in place */
  onReplace?: (next: IdeaSpec) => void;
  /** ask for a completely different idea in this slot */
  onAnother?: () => void;
  classId?: string | null;
  compact?: boolean;
};

/**
 * One composed activity concept. Every action here works on the *structured*
 * specification, so "Create this activity" always hands the Creator a complete
 * brief the teacher can still change before generating.
 */
export function IdeaCard({ idea, onReplace, onAnother, classId, compact }: Props) {
  const ws = useWorkspace();
  const saved = ws.ideas.some((i) => i.idea.id === idea.id);

  const chip = "rounded-full bg-cream px-2.5 py-0.5 text-[11px] text-muted-foreground";
  const action =
    "flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-cream hover:text-foreground";

  return (
    <article className="surface-card flex flex-col p-5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="rounded-full bg-sage-soft px-2.5 py-0.5 text-[11px] font-medium text-secondary-foreground">
          {idea.subject}
        </span>
        <span className={chip}>{idea.theme}</span>
        {idea.season !== "Any season" ? <span className={chip}>{idea.season}</span> : null}
      </div>

      <h3 className="mt-2.5 font-display text-lg leading-snug text-foreground">{idea.title}</h3>

      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{idea.whatChildrenDo}</p>

      {!compact ? (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
          <Target className="mt-0.5 size-3.5 shrink-0" strokeWidth={1.8} />
          {idea.objective}
        </p>
      ) : null}

      <dl className="mt-3 grid gap-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Clock className="size-3.5" strokeWidth={1.8} /> {idea.duration} · {idea.level} ·{" "}
          {idea.difficulty}
        </div>
        <div className="flex items-center gap-1.5">
          <Layers className="size-3.5" strokeWidth={1.8} /> {idea.format} · {idea.pages} page
          {idea.pages === "1" ? "" : "s"} · {idea.prep}
        </div>
        <div className="flex items-center gap-1.5">
          <Users className="size-3.5" strokeWidth={1.8} /> {idea.grouping} · {idea.approach}
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link
          to="/"
          search={classId ? { idea: idea.id, classId } : { idea: idea.id }}
          className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Create this activity
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
      </div>

      {onReplace || onAnother ? (
        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border pt-3">
          {onAnother ? (
            <button type="button" className={action} onClick={onAnother}>
              <Repeat className="size-3.5" strokeWidth={1.8} /> Another idea
            </button>
          ) : null}
          {onReplace ? (
            <>
              <button type="button" className={action} onClick={() => onReplace(makeEasier(idea))}>
                <Minus className="size-3.5" strokeWidth={1.8} /> Make easier
              </button>
              <button type="button" className={action} onClick={() => onReplace(makeHarder(idea))}>
                <Plus className="size-3.5" strokeWidth={1.8} /> Make harder
              </button>
              <button
                type="button"
                className={action}
                onClick={() => onReplace(changeTheme(idea, Date.now()))}
              >
                <ArrowLeftRight className="size-3.5" strokeWidth={1.8} /> Change theme
              </button>
              <button
                type="button"
                className={action}
                onClick={() => onReplace(similarIdea(idea, Date.now()))}
              >
                <Repeat className="size-3.5" strokeWidth={1.8} /> Similar idea
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Copy, Minus, Plus, Star, Trash2 } from "lucide-react";
import {
  deleteSavedIdea,
  duplicateSavedIdea,
  moveIdeaToFolder,
  updateSavedIdea,
  useWorkspace,
} from "@/lib/workspace/store";
import { makeEasier, makeHarder } from "@/lib/ideas/engine";

/** Ideas kept before the worksheet exists — the top of the creative funnel. */
export function SavedIdeas() {
  const ws = useWorkspace();
  const [confirmId, setConfirmId] = useState<string | null>(null);

  if (ws.ideas.length === 0) {
    return (
      <section className="space-y-3">
        <h2 className="font-display text-xl text-foreground">Saved ideas</h2>
        <div className="surface-card p-8 text-center text-sm text-muted-foreground">
          No saved ideas yet. In the{" "}
          <Link to="/idea-lab" className="underline underline-offset-4">
            Idea Lab
          </Link>{" "}
          press “Save idea” to keep a concept for later.
        </div>
      </section>
    );
  }

  const action =
    "flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-cream hover:text-foreground";

  return (
    <section className="space-y-3">
      <h2 className="font-display text-xl text-foreground">Saved ideas ({ws.ideas.length})</h2>
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {ws.ideas.map((saved) => {
          const idea = saved.idea;
          return (
            <li key={saved.id} className="surface-card flex flex-col p-4">
              <h3 className="font-display text-base text-foreground">{idea.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{idea.objective}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {[
                  idea.level,
                  idea.skill,
                  idea.theme,
                  idea.mechanic,
                  idea.difficulty,
                  idea.duration,
                ].map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full bg-cream px-2.5 py-0.5 text-[11px] text-muted-foreground"
                  >
                    {chip}
                  </span>
                ))}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Link
                  to="/"
                  search={{ idea: idea.id }}
                  className="rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
                >
                  Create this activity
                </Link>
                <button
                  type="button"
                  className={action}
                  onClick={() => updateSavedIdea(saved.id, { idea: makeEasier(idea) })}
                >
                  <Minus className="size-3.5" strokeWidth={1.8} /> Easier
                </button>
                <button
                  type="button"
                  className={action}
                  onClick={() => updateSavedIdea(saved.id, { idea: makeHarder(idea) })}
                >
                  <Plus className="size-3.5" strokeWidth={1.8} /> Harder
                </button>
                <button
                  type="button"
                  className={action}
                  onClick={() => duplicateSavedIdea(saved.id)}
                >
                  <Copy className="size-3.5" strokeWidth={1.8} /> Duplicate
                </button>
                <button
                  type="button"
                  aria-pressed={saved.favorite ? true : false}
                  className={action}
                  onClick={() => updateSavedIdea(saved.id, { favorite: !saved.favorite })}
                >
                  <Star
                    className={saved.favorite ? "size-3.5 fill-current text-sage" : "size-3.5"}
                    strokeWidth={1.8}
                  />{" "}
                  {saved.favorite ? "Favourited" : "Favourite"}
                </button>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <select
                  aria-label="Move idea to folder"
                  value={saved.folderId ?? ""}
                  onChange={(e) => moveIdeaToFolder(saved.id, e.target.value || null)}
                  className="rounded-full border border-border bg-background px-2 py-1 text-[11px]"
                >
                  <option value="">No folder</option>
                  {ws.folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
                {confirmId === saved.id ? (
                  <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    Delete this idea?
                    <button
                      type="button"
                      onClick={() => {
                        deleteSavedIdea(saved.id);
                        setConfirmId(null);
                      }}
                      className="rounded-full bg-destructive px-2 py-0.5 text-[11px] text-destructive-foreground"
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmId(null)}
                      className="underline underline-offset-2"
                    >
                      Cancel
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    aria-label={`Delete idea ${idea.title}`}
                    onClick={() => setConfirmId(saved.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" strokeWidth={1.8} />
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

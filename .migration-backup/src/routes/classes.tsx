import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { basicsGroups, learningGroups, styleGroups, outputGroups } from "@/lib/creator-options";
import { visualDirections } from "@/lib/visual-directions";
import { deleteClass, saveClass, useWorkspace } from "@/lib/workspace/store";
import type { ClassProfile } from "@/lib/workspace/types";

export const Route = createFileRoute("/classes")({
  head: () => ({
    meta: [
      { title: "My Classes — Alfa Mind Hub Class Profiles" },
      {
        name: "description",
        content:
          "Save class profiles with age, language, teaching approach, difficulty, duration and visual style so every new worksheet is prefilled for that group.",
      },
      { property: "og:title", content: "My Classes — Alfa Mind Hub Class Profiles" },
      {
        property: "og:description",
        content:
          "Create class profiles that prefill worksheet settings: age, language, approach, difficulty, duration and visual style.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ClassesPage,
});

const options = (key: string) =>
  [...basicsGroups, ...learningGroups, ...styleGroups, ...outputGroups].find((g) => g.key === key)
    ?.options ?? [];

type Draft = Omit<ClassProfile, "id" | "createdAt">;

const blank: Draft = {
  name: "",
  level: "Ages 4–5",
  language: "English",
  approach: "Montessori",
  difficulty: "Easy",
  duration: "15 minutes",
  visualDirection: "magical-nature",
  printing: "Color",
  goals: [],
  activityStyles: [],
  ability: "Mixed",
  notes: "",
};

const goalOptions = options("skill");
const styleOptions = options("activityType");
const abilityOptions = ["Emerging", "Mixed", "Confident"];

function ClassesPage() {
  const ws = useWorkspace();
  const [form, setForm] = useState<Draft>(blank);
  const [editingId, setEditingId] = useState<string | null>(null);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main id="main-content" className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8">
        <header className="space-y-1.5">
          <h1 className="font-display text-3xl text-foreground">My Classes</h1>
          <p className="text-sm text-muted-foreground">
            Save how each group learns. When you create a worksheet, pick the class and everything
            is prefilled.
          </p>
        </header>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          <section className="space-y-4">
            {ws.classes.length === 0 ? (
              <div className="surface-card p-10 text-center text-sm text-muted-foreground">
                No classes yet. Create your first class profile, for example “Kindergarten A”.
              </div>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2">
                {ws.classes.map((c) => (
                  <li key={c.id} className="surface-card p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="font-display text-lg text-foreground">{c.name}</h2>
                      <button
                        type="button"
                        aria-label={`Delete ${c.name}`}
                        onClick={() => deleteClass(c.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-4" strokeWidth={1.8} />
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {c.level} · {c.language} · {c.approach}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {[
                        c.duration,
                        c.difficulty,
                        visualDirections.find((v) => v.id === c.visualDirection)?.name ??
                          c.visualDirection,
                        c.printing,
                      ].map((chip) => (
                        <span
                          key={chip}
                          className="rounded-full bg-cream px-2.5 py-0.5 text-[11px] text-muted-foreground"
                        >
                          {chip}
                        </span>
                      ))}
                    </div>
                    {c.goals?.length ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Goals: {c.goals.join(", ")}
                      </p>
                    ) : null}
                    {c.activityStyles?.length ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Preferred styles: {c.activityStyles.join(", ")}
                      </p>
                    ) : null}
                    {c.ability ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">Ability: {c.ability}</p>
                    ) : null}
                    {c.notes ? (
                      <p className="mt-1.5 text-xs italic text-muted-foreground">{c.notes}</p>
                    ) : null}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link
                        to="/"
                        search={{ classId: c.id }}
                        className="rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
                      >
                        Create for {c.name}
                      </Link>
                      <Link
                        to="/idea-lab"
                        className="rounded-full border border-border px-3 py-1.5 text-xs hover:bg-cream"
                      >
                        Find ideas
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(c.id);
                          setForm({
                            name: c.name,
                            level: c.level,
                            language: c.language,
                            approach: c.approach,
                            difficulty: c.difficulty,
                            duration: c.duration,
                            visualDirection: c.visualDirection,
                            printing: c.printing,
                            goals: c.goals ?? [],
                            activityStyles: c.activityStyles ?? [],
                            ability: c.ability ?? "Mixed",
                            notes: c.notes ?? "",
                          });
                        }}
                        className="rounded-full border border-border px-3 py-1.5 text-xs hover:bg-cream"
                      >
                        Edit
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <aside className="surface-card space-y-3 p-5">
            <h2 className="font-display text-lg text-foreground">
              {editingId ? "Edit class" : "New class"}
            </h2>
            <label className="block text-xs font-medium text-muted-foreground">
              Class name
              <input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Kindergarten A"
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-sage focus:ring-2 focus:ring-ring/25"
              />
            </label>

            {(
              [
                ["level", "Age / grade", options("level")],
                ["language", "Language", options("language")],
                ["approach", "Teaching approach", options("approach")],
                ["difficulty", "Default difficulty", options("difficulty")],
                ["duration", "Preferred duration", options("duration")],
                ["printing", "Printing preference", options("printing")],
              ] as const
            ).map(([key, label, opts]) => (
              <label key={key} className="block text-xs font-medium text-muted-foreground">
                {label}
                <select
                  value={form[key]}
                  onChange={(e) => set(key, e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                >
                  {opts.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </label>
            ))}

            <label className="block text-xs font-medium text-muted-foreground">
              Preferred visual style
              <select
                value={form.visualDirection}
                onChange={(e) => set("visualDirection", e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
              >
                {visualDirections.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs font-medium text-muted-foreground">
              General ability of the group
              <select
                value={form.ability ?? "Mixed"}
                onChange={(e) => set("ability", e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
              >
                {abilityOptions.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </label>

            {(
              [
                ["goals", "Learning goals", goalOptions],
                ["activityStyles", "Preferred activity styles", styleOptions],
              ] as const
            ).map(([key, label, opts]) => (
              <fieldset key={key} className="block text-xs font-medium text-muted-foreground">
                <legend>{label}</legend>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {opts.map((o) => {
                    const selected = (form[key] ?? []).includes(o);
                    return (
                      <button
                        key={o}
                        type="button"
                        aria-pressed={selected}
                        onClick={() =>
                          set(
                            key,
                            selected
                              ? (form[key] ?? []).filter((v) => v !== o)
                              : [...(form[key] ?? []), o],
                          )
                        }
                        className={
                          selected
                            ? "rounded-full border border-sage bg-sage-soft px-2.5 py-1 text-[11px] text-secondary-foreground"
                            : "rounded-full border border-border px-2.5 py-1 text-[11px] hover:bg-cream"
                        }
                      >
                        {o}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            ))}

            <label className="block text-xs font-medium text-muted-foreground">
              Notes about how this group learns
              <textarea
                rows={3}
                value={form.notes ?? ""}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Loves movement, needs short tasks, works best in pairs…"
                className="mt-1 w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-sage focus:ring-2 focus:ring-ring/25"
              />
            </label>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                disabled={!form.name.trim()}
                onClick={() => {
                  saveClass(editingId ? { ...form, id: editingId } : form);
                  setForm(blank);
                  setEditingId(null);
                }}
                className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                <Plus className="size-4" strokeWidth={1.8} />
                {editingId ? "Save changes" : "Create class"}
              </button>
              {editingId ? (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setForm(blank);
                  }}
                  className="rounded-full border border-border px-4 py-2 text-sm hover:bg-cream"
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

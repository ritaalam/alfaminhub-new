import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { IdeaCard } from "@/components/ideas/IdeaCard";
import { cn } from "@/lib/utils";
import {
  difficulties,
  durations,
  generateIdeas,
  groupings,
  ideaCategories,
  levels,
  seasons,
  skills,
  startingPoints,
  subjects,
  themes,
  type IdeaConstraints,
  type IdeaSpec,
} from "@/lib/ideas/engine";
import { learningGroups } from "@/lib/creator-options";
import { useWorkspace } from "@/lib/workspace/store";

export const Route = createFileRoute("/idea-lab")({
  head: () => ({
    meta: [
      { title: "Idea Lab — Alfa Mind Hub Activity Ideas" },
      {
        name: "description",
        content:
          "Discover activity ideas by age, subject, skill, theme, season, duration and teaching approach — then send any structured idea straight into the Worksheet Creator.",
      },
      { property: "og:title", content: "Idea Lab — Compose Teaching Activity Ideas" },
      {
        property: "og:description",
        content:
          "Composable teacher ideas: pick a starting point, press Inspire Me and turn any concept into a printable activity.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: IdeaLabPage,
});

const printableFormats = [
  "Single worksheet",
  "2-page set",
  "Activity cards",
  "Mini booklet",
  "Center mat",
];

const approaches = learningGroups.find((g) => g.key === "approach")?.options ?? [];

function IdeaLabPage() {
  const ws = useWorkspace();
  const [classId, setClassId] = useState("");
  const [constraints, setConstraints] = useState<IdeaConstraints>({ level: "Ages 4–5" });
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [seed, setSeed] = useState(1);
  /** ideas replaced in place by differentiation / variation actions */
  const [overrides, setOverrides] = useState<Record<number, IdeaSpec>>({});

  const activeClass = ws.classes.find((c) => c.id === classId);

  const merged: IdeaConstraints = useMemo(() => {
    const category = ideaCategories.find((c) => c.id === categoryId);
    return {
      ...(category?.constraints ?? {}),
      ...Object.fromEntries(Object.entries(constraints).filter(([, v]) => v)),
      ...(activeClass
        ? { level: activeClass.level, approach: constraints.approach ?? activeClass.approach }
        : {}),
    } as IdeaConstraints;
  }, [constraints, categoryId, activeClass]);

  const base = useMemo(() => generateIdeas(merged, 6, seed), [merged, seed]);
  const ideas = base.map((idea, i) => overrides[i] ?? idea);

  const reroll = () => {
    setSeed((s) => s + 1);
    setOverrides({});
  };

  const set = (key: keyof IdeaConstraints, value: string) => {
    setOverrides({});
    setConstraints((c) => ({ ...c, [key]: value }));
  };

  const selectClass =
    "mt-1 block rounded-full border border-border bg-background px-3 py-1.5 text-sm text-foreground";

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main id="main-content" className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8">
        <header className="space-y-2">
          <h1 className="font-display text-3xl text-foreground sm:text-4xl">
            What could we create today?
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Every idea below is composed from a learning objective, an activity mechanic, an age
            adaptation, a theme and a printable format — so you always get genuinely different
            concepts, not five versions of the same page.
          </p>
        </header>

        {/* Creative starting points */}
        <section className="mt-6">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Start from a moment in your day
          </h2>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {startingPoints.map((sp) => (
              <button
                key={sp.label}
                type="button"
                onClick={() => {
                  setCategoryId(null);
                  setOverrides({});
                  setConstraints({
                    ...sp.constraints,
                    ...(constraints.level ? { level: constraints.level } : {}),
                  });
                  setSeed((s) => s + 1);
                }}
                className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-cream hover:text-foreground"
              >
                {sp.label}
              </button>
            ))}
          </div>
        </section>

        {/* Filters */}
        <section className="surface-card mt-5 flex flex-wrap items-end gap-3 p-4">
          {ws.classes.length > 0 ? (
            <label className="text-xs font-medium text-muted-foreground">
              Class
              <select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className={selectClass}
              >
                <option value="">Any class</option>
                {ws.classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {(
            [
              ["Age / Grade", "level", levels as unknown as string[], false],
              ["Subject", "subject", subjects, true],
              ["Skill", "skill", skills, true],
              ["Theme", "theme", themes, true],
              ["Season", "season", seasons as unknown as string[], true],
              ["Duration", "duration", durations as unknown as string[], true],
              ["Difficulty", "difficulty", difficulties as unknown as string[], true],
              ["Approach", "approach", approaches, true],
              ["Grouping", "grouping", groupings, true],
              ["Printable", "format", printableFormats, true],
            ] as const
          ).map(([label, key, list, anyOption]) => (
            <label key={key} className="text-xs font-medium text-muted-foreground">
              {label}
              <select
                value={(constraints[key] as string) ?? ""}
                onChange={(e) => set(key, e.target.value)}
                className={selectClass}
              >
                {anyOption ? <option value="">Any</option> : null}
                {list.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </label>
          ))}

          <button
            type="button"
            onClick={reroll}
            className="ml-auto flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Sparkles className="size-4" strokeWidth={1.8} /> Inspire Me
          </button>
        </section>

        {/* Categories */}
        <section className="mt-5 space-y-2.5">
          {(["Time & moment", "Learning area", "Approach"] as const).map((group) => (
            <div key={group} className="flex flex-wrap items-center gap-1.5">
              <span className="w-28 shrink-0 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                {group}
              </span>
              {ideaCategories
                .filter((c) => c.group === group)
                .map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setOverrides({});
                      setCategoryId(categoryId === c.id ? null : c.id);
                    }}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs transition-colors",
                      categoryId === c.id
                        ? "border-sage bg-sage-soft text-secondary-foreground"
                        : "border-border text-muted-foreground hover:bg-cream hover:text-foreground",
                    )}
                  >
                    {c.label}
                  </button>
                ))}
            </div>
          ))}
        </section>

        {ideas.length === 0 ? (
          <div className="surface-card mt-6 p-10 text-center text-sm text-muted-foreground">
            No ideas match every filter. Try removing one — for example the printable format or the
            grouping.
          </div>
        ) : (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ideas.map((idea, i) => (
              <li key={`${idea.id}-${i}`} className="contents">
                <IdeaCard
                  idea={idea}
                  classId={classId || null}
                  onReplace={(next) => setOverrides((o) => ({ ...o, [i]: next }))}
                  onAnother={() => {
                    const fresh = generateIdeas(merged, 12, seed + i + 7);
                    const pick = fresh.find((f) => !ideas.some((x) => x.id === f.id)) ?? fresh[0];
                    if (pick) setOverrides((o) => ({ ...o, [i]: pick }));
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

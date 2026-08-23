import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, Layers, Plus, Trash2 } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { DraftThumb } from "@/components/workspace/DraftThumb";
import { demoIdeas } from "@/lib/idea-lab";
import { visualDirections } from "@/lib/visual-directions";
import {
  createCollection,
  deleteCollection,
  toggleDraftCollection,
  useWorkspace,
} from "@/lib/workspace/store";

export const Route = createFileRoute("/library")({
  head: () => ({
    meta: [
      { title: "Library — Alfa Mind Hub Favourites & Collections" },
      {
        name: "description",
        content:
          "Your Alfa library: favourite worksheets, custom collections, ready-made starter activities and the original Alfa visual direction presets.",
      },
      { property: "og:title", content: "Library — Favourites, Collections & Starters" },
      {
        property: "og:description",
        content:
          "Favourites, collections, starter activities and Alfa visual direction presets in one calm place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LibraryPage,
});

function LibraryPage() {
  const ws = useWorkspace();
  const [activeCollection, setActiveCollection] = useState<string | null>(null);
  const favorites = ws.drafts.filter((d) => d.favorite);
  const inCollection = activeCollection
    ? ws.drafts.filter((d) => d.collectionIds.includes(activeCollection))
    : [];

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main id="main-content" className="mx-auto w-full max-w-6xl space-y-10 px-5 py-10 sm:px-8">
        <header className="space-y-1.5">
          <h1 className="font-display text-3xl text-foreground">Library</h1>
          <p className="text-sm text-muted-foreground">
            Favourites, collections and Alfa starters. A worksheet can sit in a class, a folder and
            a collection at the same time — there is only ever one copy.
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="flex items-center gap-2 font-display text-xl text-foreground">
            <Heart className="size-4 text-terracotta" strokeWidth={1.8} /> Favorites
          </h2>
          {favorites.length === 0 ? (
            <p className="surface-card p-6 text-sm text-muted-foreground">
              Nothing favourited yet — tap the heart on any worksheet in your workspace.
            </p>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {favorites.map((d) => (
                <li key={d.id} className="surface-card p-3">
                  <DraftThumb
                    directionId={d.project.visualDirection}
                    pages={d.project.pages.length}
                  />
                  <h3 className="mt-2 truncate text-sm font-medium text-foreground">{d.title}</h3>
                  <p className="truncate text-xs text-muted-foreground">
                    {d.spec.level} · {d.spec.skill}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {ws.collections.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggleDraftCollection(d.id, c.id)}
                        className={`rounded-full border px-2 py-0.5 text-[11px] ${
                          d.collectionIds.includes(c.id)
                            ? "border-sage bg-sage-soft text-secondary-foreground"
                            : "border-border text-muted-foreground"
                        }`}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                  <Link
                    to="/"
                    search={{ draft: d.id }}
                    className="mt-2 inline-block text-xs underline underline-offset-4 text-muted-foreground hover:text-foreground"
                  >
                    Continue Editing
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-display text-xl text-foreground">
              <Layers className="size-4 text-sage" strokeWidth={1.8} /> Collections
            </h2>
            <button
              type="button"
              onClick={() => {
                const name = window.prompt("Collection name");
                if (name?.trim()) createCollection(name.trim());
              }}
              className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm hover:bg-cream"
            >
              <Plus className="size-4" strokeWidth={1.8} /> New collection
            </button>
          </div>
          {ws.collections.length === 0 ? (
            <p className="surface-card p-6 text-sm text-muted-foreground">
              Collections group worksheets across classes and folders, e.g. “Spring”, “Circle time”.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {ws.collections.map((c) => (
                  <span key={c.id} className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setActiveCollection(activeCollection === c.id ? null : c.id)}
                      className={`rounded-full border px-3 py-1.5 text-sm ${
                        activeCollection === c.id
                          ? "border-sage bg-sage-soft text-secondary-foreground"
                          : "border-border text-muted-foreground hover:bg-cream"
                      }`}
                    >
                      {c.name}
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete collection ${c.name}`}
                      onClick={() => deleteCollection(c.id)}
                    >
                      <Trash2 className="size-3.5 text-muted-foreground" strokeWidth={1.8} />
                    </button>
                  </span>
                ))}
              </div>
              {activeCollection ? (
                <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {inCollection.length === 0 ? (
                    <li className="text-sm text-muted-foreground">
                      No worksheets in this collection yet.
                    </li>
                  ) : (
                    inCollection.map((d) => (
                      <li key={d.id} className="surface-card p-3">
                        <DraftThumb
                          directionId={d.project.visualDirection}
                          pages={d.project.pages.length}
                        />
                        <h3 className="mt-2 truncate text-sm font-medium text-foreground">
                          {d.title}
                        </h3>
                      </li>
                    ))
                  )}
                </ul>
              ) : null}
            </>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl text-foreground">Alfa starters</h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {demoIdeas.slice(0, 3).map((idea) => (
              <li key={idea.id} className="surface-card p-5">
                <h3 className="font-display text-lg text-foreground">{idea.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{idea.objective}</p>
                <Link
                  to="/"
                  search={{ idea: idea.id }}
                  className="mt-3 inline-block rounded-full bg-sage-soft px-3 py-1.5 text-xs font-medium text-secondary-foreground"
                >
                  Create this activity
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl text-foreground">Visual directions</h2>
          <div className="flex flex-wrap gap-2">
            {visualDirections.map((v) => (
              <span
                key={v.id}
                className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm text-muted-foreground"
              >
                <span className="flex gap-0.5">
                  {[v.palette.accent, v.palette.wing, v.palette.wingAlt].map((c) => (
                    <span key={c} className="size-3 rounded-full" style={{ background: c }} />
                  ))}
                </span>
                {v.name}
              </span>
            ))}
          </div>
          <Link
            to="/visual-directions"
            className="inline-block text-sm underline underline-offset-4 text-muted-foreground hover:text-foreground"
          >
            Explore the full visual direction gallery
          </Link>
        </section>
      </main>
    </div>
  );
}

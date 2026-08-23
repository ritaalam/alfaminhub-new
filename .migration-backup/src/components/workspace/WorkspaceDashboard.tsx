import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Archive,
  ArchiveRestore,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  FolderPlus,
  Grid2X2,
  Heart,
  List,
  MoreHorizontal,
  Pencil,
  PenLine,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  createFolder,
  deleteDraft,
  deleteFolder,
  duplicateDraft,
  moveDraftToFolder,
  renameFolder,
  setDraftArchived,
  setDraftStatus,
  toggleFavorite,
  updateDraft,
  useWorkspace,
} from "@/lib/workspace/store";
import type { WorksheetDraft } from "@/lib/workspace/types";
import { DraftThumb } from "./DraftThumb";
import { QuickStart } from "./QuickStart";
import { SavedIdeas } from "./SavedIdeas";
import { WeeklyPlan } from "./WeeklyPlan";
import { RelatedIdeas } from "@/components/ideas/RelatedIdeas";

/** starter collections a teacher can create in one tap */
const suggestedFolders = [
  "Math",
  "Literacy",
  "Fine Motor",
  "Classroom Activities",
  "My Favorites",
  "Preschool",
  "Kindergarten A",
  "Spring Activities",
];

function timeAgo(ts: number) {
  const diff = Math.max(0, Date.now() - ts);
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "yesterday" : `${d} days ago`;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

type SortKey = "recent" | "oldest" | "created" | "title";
type StatusKey = "all" | "draft" | "finished";

/** worksheets are drafts until the teacher marks them finished */
function statusOf(d: WorksheetDraft): "draft" | "finished" {
  return d.status === "finished" ? "finished" : "draft";
}

export function WorkspaceDashboard() {
  const ws = useWorkspace();
  const [view, setView] = useState<"grid" | "list">("grid");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");
  const [tab, setTab] = useState<"worksheets" | "ideas" | "week">("worksheets");
  const [status, setStatus] = useState<StatusKey>("all");
  const [folderId, setFolderId] = useState<string | "all" | "favorites" | "archived">("all");
  const [filters, setFilters] = useState({
    level: "",
    skill: "",
    activityType: "",
    theme: "",
    approach: "",
    date: "",
  });
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const values = useMemo(() => {
    const uniq = (fn: (d: WorksheetDraft) => string) =>
      Array.from(new Set(ws.drafts.map(fn).filter(Boolean))).sort();
    return {
      level: uniq((d) => d.spec.level),
      skill: uniq((d) => d.spec.skill),
      activityType: uniq((d) => d.spec.activityType),
      theme: uniq((d) => d.spec.theme),
      approach: uniq((d) => d.spec.approach),
    };
  }, [ws.drafts]);

  const drafts = useMemo(() => {
    const q = query.trim().toLowerCase();
    const cutoff =
      filters.date === "7"
        ? Date.now() - 7 * 864e5
        : filters.date === "30"
          ? Date.now() - 30 * 864e5
          : 0;

    let list = ws.drafts.filter((d) => {
      // archived worksheets stay saved but only appear in the Archive view
      if (folderId === "archived" ? !d.archived : d.archived) return false;
      if (folderId === "favorites" && !d.favorite) return false;
      if (
        folderId !== "all" &&
        folderId !== "favorites" &&
        folderId !== "archived" &&
        d.folderId !== folderId
      )
        return false;
      if (status !== "all" && statusOf(d) !== status) return false;
      if (filters.level && d.spec.level !== filters.level) return false;
      if (filters.skill && d.spec.skill !== filters.skill) return false;
      if (filters.activityType && d.spec.activityType !== filters.activityType) return false;
      if (filters.theme && d.spec.theme !== filters.theme) return false;
      if (filters.approach && d.spec.approach !== filters.approach) return false;
      if (cutoff && d.updatedAt < cutoff) return false;
      if (q) {
        const hay = `${d.title} ${d.spec.level} ${d.spec.skill} ${d.spec.activityType} ${d.spec.theme} ${d.spec.approach}`;
        if (!hay.toLowerCase().includes(q)) return false;
      }
      return true;
    });

    list = [...list].sort((a, b) => {
      if (sort === "title") return a.title.localeCompare(b.title);
      if (sort === "created") return b.createdAt - a.createdAt;
      if (sort === "oldest") return a.createdAt - b.createdAt;
      return b.updatedAt - a.updatedAt;
    });
    return list;
  }, [ws.drafts, query, sort, folderId, filters, status]);

  const active = ws.drafts.filter((d) => !d.archived);
  const recent = [...active].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 3);
  const latest = recent[0];
  const favorites = active.filter((d) => d.favorite);
  const className = (id?: string | null) => ws.classes.find((c) => c.id === id)?.name;

  const existingFolderNames = new Set(ws.folders.map((f) => f.name.toLowerCase()));
  const missingStarters = suggestedFolders.filter((n) => !existingFolderNames.has(n.toLowerCase()));

  /** helpful, view-specific empty states instead of one generic message */
  const emptyState = (() => {
    const filtered =
      query.trim() ||
      filters.level ||
      filters.skill ||
      filters.activityType ||
      filters.theme ||
      filters.approach ||
      filters.date;
    if (filtered)
      return {
        title: "No worksheets match these filters",
        body: "Try clearing a filter or searching for a different age group, subject or theme.",
      };
    if (folderId === "favorites")
      return {
        title: "No favourites yet",
        body: "Tap the heart on any worksheet and it will appear here for instant access.",
      };
    if (folderId === "archived")
      return {
        title: "Nothing archived",
        body: "Archived worksheets stay saved but leave your active workspace.",
      };
    if (folderId !== "all")
      return {
        title: "This collection is empty",
        body: "Use “Move to folder” on any worksheet card to file it in this collection.",
      };
    if (status === "draft")
      return {
        title: "No drafts in progress",
        body: "Worksheets you are still working on will appear here until you mark them finished.",
      };
    if (status === "finished")
      return {
        title: "Nothing marked finished yet",
        body: "Open a worksheet’s menu and choose “Mark as finished” once it is ready to print.",
      };
    return {
      title: "Your workspace is ready",
      body: "Create your first worksheet — everything you make is saved automatically on this device.",
    };
  })();

  return (
    <div className="space-y-10">
      {/* Greeting */}
      <header className="space-y-1.5">
        <p className="text-sm text-muted-foreground">{greeting()} 👋</p>
        <h1 className="font-display text-3xl text-foreground sm:text-4xl">
          What are we creating today?
        </h1>
        <div className="flex flex-wrap gap-2 pt-3">
          <Link
            to="/"
            className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Plus className="size-4" strokeWidth={2} /> Create New Worksheet
          </Link>
          <Link
            to="/idea-lab"
            className="flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm transition-colors hover:bg-cream"
          >
            <Sparkles className="size-4" strokeWidth={1.8} /> Need an idea? Inspire Me
          </Link>
        </div>
        <p className="pt-1 text-xs text-muted-foreground">
          Everything you create is saved automatically — sign in and it's kept in your teacher
          account on every device.
        </p>
      </header>

      <QuickStart />

      {/* Recently edited */}
      {recent.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-display text-xl text-foreground">Recently edited</h2>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((d) => (
              <article key={d.id} className="surface-card flex gap-4 p-4">
                <div className="w-20 shrink-0">
                  <DraftThumb
                    directionId={d.project.visualDirection}
                    pages={d.project.pages.length}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-medium text-foreground">{d.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {className(d.classId) ?? d.spec.level} · {d.spec.skill} · {d.spec.theme}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {d.project.pages.length} page{d.project.pages.length === 1 ? "" : "s"} ·{" "}
                    {d.spec.duration} · Edited {timeAgo(d.updatedAt)}
                  </p>
                  <Link
                    to="/"
                    search={{ draft: d.id }}
                    className="mt-3 inline-block rounded-full bg-sage-soft px-3 py-1.5 text-xs font-medium text-secondary-foreground transition-opacity hover:opacity-90"
                  >
                    Continue Editing
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {/* Favourites */}
      {favorites.length > 0 ? (
        <section className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="flex items-center gap-2 font-display text-xl text-foreground">
              <Heart className="size-4 fill-terracotta text-terracotta" strokeWidth={1.8} />
              Favourites
            </h2>
            <button
              type="button"
              onClick={() => {
                setTab("worksheets");
                setFolderId("favorites");
              }}
              className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              See all {favorites.length}
            </button>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {favorites.slice(0, 4).map((d) => (
              <li key={d.id} className="surface-card flex items-center gap-3 p-3">
                <div className="w-12 shrink-0">
                  <DraftThumb
                    directionId={d.project.visualDirection}
                    pages={d.project.pages.length}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{d.title}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {d.spec.level} · {d.spec.skill}
                  </p>
                  <Link
                    to="/"
                    search={{ draft: d.id }}
                    className="mt-1.5 inline-block text-[11px] font-medium text-secondary-foreground underline underline-offset-4"
                  >
                    Continue Editing
                  </Link>
                </div>
                <button
                  type="button"
                  aria-label={`Remove ${d.title} from favourites`}
                  onClick={() => toggleFavorite(d.id)}
                >
                  <Heart className="size-4 fill-terracotta text-terracotta" strokeWidth={1.8} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Ideas & inspiration — tailored to the last worksheet, or a warm start */}

      {latest ? (
        <RelatedIdeas
          source={{
            skill: latest.spec.skill,
            theme: latest.spec.theme,
            level: latest.spec.level,
          }}
          title={`Because you made “${latest.title}”, you might create next…`}
        />
      ) : (
        <RelatedIdeas
          source={{ skill: "Counting", theme: "Insects", level: "Ages 4–5" }}
          title="Ideas & inspiration for your next lesson"
        />
      )}

      {/* Tabs */}
      <div className="inline-flex rounded-full border border-border bg-cream p-1">
        {(
          [
            ["worksheets", `Worksheets (${active.length})`],
            ["ideas", `Saved ideas (${ws.ideas.length})`],
            ["week", "Weekly plan"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={tab === id}
            onClick={() => setTab(id)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm transition-colors",
              tab === id
                ? "bg-background font-medium text-foreground shadow-[var(--shadow-soft)]"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "ideas" ? <SavedIdeas /> : null}
      {tab === "week" ? <WeeklyPlan /> : null}

      {/* Library of worksheets */}
      <section className={cn("space-y-4", tab !== "worksheets" && "hidden")}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl text-foreground">Recent Worksheets</h2>
          <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto">
            <div className="relative min-w-0 flex-1 sm:flex-none">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search worksheets"
                aria-label="Search worksheets"
                className="w-full rounded-full border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-sage focus:ring-2 focus:ring-ring/25 sm:w-60"
              />
            </div>

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="rounded-full border border-border bg-background px-3 py-2 text-sm"
              aria-label="Sort worksheets"
            >
              <option value="recent">Recently edited</option>
              <option value="created">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="title">Title A–Z</option>
            </select>
            <div className="inline-flex rounded-full border border-border p-0.5">
              <button
                type="button"
                aria-label="Grid view"
                aria-pressed={view === "grid"}
                onClick={() => setView("grid")}
                className={cn(
                  "grid size-9 place-items-center rounded-full",
                  view === "grid" && "bg-cream",
                )}
              >
                <Grid2X2 className="size-4" strokeWidth={1.8} />
              </button>
              <button
                type="button"
                aria-label="List view"
                aria-pressed={view === "list"}
                onClick={() => setView("list")}
                className={cn(
                  "grid size-9 place-items-center rounded-full",
                  view === "list" && "bg-cream",
                )}
              >
                <List className="size-4" strokeWidth={1.8} />
              </button>
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["all", `All (${active.length})`],
              ["draft", `Drafts (${active.filter((d) => statusOf(d) === "draft").length})`],
              ["finished", `Finished (${active.filter((d) => statusOf(d) === "finished").length})`],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={status === id}
              onClick={() => setStatus(id)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs transition-colors",
                status === id
                  ? "border-sage bg-sage-soft text-secondary-foreground"
                  : "border-border text-muted-foreground hover:bg-cream",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["level", "Age / Grade", values.level],
              ["skill", "Subject", values.skill],
              ["activityType", "Activity", values.activityType],
              ["theme", "Theme", values.theme],
              ["approach", "Approach", values.approach],
            ] as const
          ).map(([key, label, opts]) => (
            <select
              key={key}
              aria-label={label}
              value={filters[key]}
              onChange={(e) => setFilters((f) => ({ ...f, [key]: e.target.value }))}
              className="rounded-full border border-border bg-background px-3 py-1.5 text-xs"
            >
              <option value="">{label}: All</option>
              {opts.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          ))}
          <select
            aria-label="Date"
            value={filters.date}
            onChange={(e) => setFilters((f) => ({ ...f, date: e.target.value }))}
            className="rounded-full border border-border bg-background px-3 py-1.5 text-xs"
          >
            <option value="">Date: Any</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
          </select>
        </div>

        {/* Folder rail + items */}
        <div className="grid gap-6 lg:grid-cols-[210px_minmax(0,1fr)] lg:items-start">
          <aside className="surface-card p-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Folders
            </h3>
            <ul className="mt-3 space-y-1">
              {[
                { id: "all", name: `All worksheets (${active.length})` },
                { id: "favorites", name: `Favorites (${active.filter((d) => d.favorite).length})` },
                {
                  id: "archived",
                  name: `Archive (${ws.drafts.filter((d) => d.archived).length})`,
                },
              ].map((f) => (
                <li key={f.id}>
                  <button
                    type="button"
                    onClick={() => setFolderId(f.id as "all" | "favorites" | "archived")}
                    className={cn(
                      "w-full rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors",
                      folderId === f.id
                        ? "bg-sage-soft text-secondary-foreground"
                        : "hover:bg-cream",
                    )}
                  >
                    {f.name}
                  </button>
                </li>
              ))}
              {ws.folders.map((f) => (
                <li key={f.id} className="group flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setFolderId(f.id)}
                    className={cn(
                      "min-w-0 flex-1 truncate rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors",
                      folderId === f.id
                        ? "bg-sage-soft text-secondary-foreground"
                        : "hover:bg-cream",
                    )}
                  >
                    {f.name}
                  </button>
                  <button
                    type="button"
                    aria-label={`Rename folder ${f.name}`}
                    onClick={() => {
                      const name = window.prompt("Rename folder", f.name);
                      if (name?.trim()) renameFolder(f.id, name.trim());
                    }}
                    className="opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <Pencil className="size-3.5 text-muted-foreground" strokeWidth={1.8} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete folder ${f.name}`}
                    onClick={() => {
                      if (!window.confirm(`Delete the folder “${f.name}”? Worksheets are kept.`))
                        return;
                      deleteFolder(f.id);
                      if (folderId === f.id) setFolderId("all");
                    }}
                    className="opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <Trash2 className="size-3.5 text-muted-foreground" strokeWidth={1.8} />
                  </button>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={() => {
                const name = window.prompt("Folder name");
                if (name?.trim()) createFolder(name.trim());
              }}
              className="mt-3 flex w-full items-center gap-1.5 rounded-lg border border-dashed border-border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-cream hover:text-foreground"
            >
              <FolderPlus className="size-3.5" strokeWidth={1.8} /> New folder
            </button>

            {missingStarters.length > 0 ? (
              <div className="mt-3 space-y-1.5">
                <p className="text-[11px] text-muted-foreground">Starter collections</p>
                <div className="flex flex-wrap gap-1">
                  {missingStarters.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => createFolder(n)}
                      className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-cream hover:text-foreground"
                    >
                      + {n}
                    </button>
                  ))}
                </div>
                {ws.folders.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => suggestedFolders.slice(0, 5).forEach((n) => createFolder(n))}
                    className="mt-1 text-[11px] text-secondary-foreground underline underline-offset-4"
                  >
                    Add the 5 recommended collections
                  </button>
                ) : null}
              </div>
            ) : null}
          </aside>

          <div>
            {drafts.length === 0 ? (
              <div className="surface-card p-10 text-center">
                <p className="text-sm font-medium text-foreground">{emptyState.title}</p>
                <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
                  {emptyState.body}
                </p>
                <Link
                  to="/"
                  className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                >
                  <Plus className="size-4" strokeWidth={2} /> Create New Worksheet
                </Link>
              </div>
            ) : (
              <ul
                className={cn(
                  view === "grid"
                    ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
                    : "divide-y divide-border overflow-hidden rounded-xl border border-border",
                )}
              >
                {drafts.map((d) => (
                  <li
                    key={d.id}
                    className={cn(
                      view === "grid"
                        ? "surface-card flex flex-col p-3"
                        : "flex items-center gap-4 bg-background p-3",
                    )}
                  >
                    <div className={view === "grid" ? "w-full" : "w-12 shrink-0"}>
                      <DraftThumb
                        directionId={d.project.visualDirection}
                        pages={d.project.pages.length}
                      />
                    </div>
                    <div className="min-w-0 flex-1 pt-2">
                      <div className="flex items-start gap-2">
                        <h3 className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                          {d.title}
                        </h3>
                        <button
                          type="button"
                          aria-label="Favorite"
                          aria-pressed={d.favorite}
                          onClick={() => toggleFavorite(d.id)}
                        >
                          <Heart
                            className={cn(
                              "size-4",
                              d.favorite
                                ? "fill-terracotta text-terracotta"
                                : "text-muted-foreground",
                            )}
                            strokeWidth={1.8}
                          />
                        </button>
                        <div className="relative">
                          <button
                            type="button"
                            aria-label="More actions"
                            onClick={() => setMenuFor(menuFor === d.id ? null : d.id)}
                          >
                            <MoreHorizontal
                              className="size-4 text-muted-foreground"
                              strokeWidth={1.8}
                            />
                          </button>
                          {menuFor === d.id ? (
                            <div className="absolute right-0 top-6 z-20 w-44 overflow-hidden rounded-xl border border-border bg-background py-1 shadow-[var(--shadow-lift)]">
                              <Link
                                to="/"
                                search={{ draft: d.id }}
                                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-cream"
                                onClick={() => setMenuFor(null)}
                              >
                                <ExternalLink className="size-3.5" strokeWidth={1.8} /> Open
                              </Link>
                              <button
                                type="button"
                                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-cream"
                                onClick={() => {
                                  const name = window.prompt("Rename worksheet", d.title);
                                  if (name?.trim()) updateDraft(d.id, { title: name.trim() });
                                  setMenuFor(null);
                                }}
                              >
                                <Pencil className="size-3.5" strokeWidth={1.8} /> Rename
                              </button>
                              <button
                                type="button"
                                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-cream"
                                onClick={() => {
                                  duplicateDraft(d.id);
                                  setMenuFor(null);
                                }}
                              >
                                <Copy className="size-3.5" strokeWidth={1.8} /> Duplicate
                              </button>
                              <Link
                                to="/"
                                search={{ draft: d.id, print: "1" }}
                                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-cream"
                                onClick={() => setMenuFor(null)}
                              >
                                <Download className="size-3.5" strokeWidth={1.8} /> Download PDF
                              </Link>
                              <button
                                type="button"
                                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-cream"
                                onClick={() => {
                                  setDraftStatus(
                                    d.id,
                                    statusOf(d) === "finished" ? "draft" : "finished",
                                  );
                                  setMenuFor(null);
                                }}
                              >
                                {statusOf(d) === "finished" ? (
                                  <>
                                    <PenLine className="size-3.5" strokeWidth={1.8} /> Move back to
                                    drafts
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="size-3.5" strokeWidth={1.8} /> Mark as
                                    finished
                                  </>
                                )}
                              </button>
                              <button
                                type="button"
                                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-cream"
                                onClick={() => {
                                  setDraftArchived(d.id, !d.archived);
                                  setMenuFor(null);
                                }}
                              >
                                {d.archived ? (
                                  <>
                                    <ArchiveRestore className="size-3.5" strokeWidth={1.8} />{" "}
                                    Restore
                                  </>
                                ) : (
                                  <>
                                    <Archive className="size-3.5" strokeWidth={1.8} /> Archive
                                  </>
                                )}
                              </button>
                              {confirmDelete === d.id ? (
                                <div className="px-3 py-1.5 text-[11px] text-muted-foreground">
                                  Delete “{d.title}” permanently?
                                  <div className="mt-1 flex gap-2">
                                    <button
                                      type="button"
                                      className="rounded-full bg-destructive px-2 py-0.5 text-destructive-foreground"
                                      onClick={() => {
                                        deleteDraft(d.id);
                                        setConfirmDelete(null);
                                        setMenuFor(null);
                                      }}
                                    >
                                      Delete
                                    </button>
                                    <button
                                      type="button"
                                      className="underline underline-offset-2"
                                      onClick={() => setConfirmDelete(null)}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-destructive hover:bg-cream"
                                  onClick={() => setConfirmDelete(d.id)}
                                >
                                  <Trash2 className="size-3.5" strokeWidth={1.8} /> Delete
                                </button>
                              )}
                            </div>
                          ) : null}
                        </div>
                      </div>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {className(d.classId) ?? d.spec.level} · {d.spec.skill} ·{" "}
                        {d.spec.activityType} · {d.spec.theme}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {d.project.pages.length} page{d.project.pages.length === 1 ? "" : "s"} ·{" "}
                        {d.spec.duration} · Edited {timeAgo(d.updatedAt)}
                        {d.archived ? " · Archived" : ""}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-medium",
                            statusOf(d) === "finished"
                              ? "bg-sage-soft text-secondary-foreground"
                              : "bg-cream text-muted-foreground",
                          )}
                        >
                          {statusOf(d) === "finished" ? "Finished" : "Draft"}
                        </span>
                        <Link
                          to="/"
                          search={{ draft: d.id }}
                          className="rounded-full bg-sage-soft px-3 py-1 text-xs font-medium text-secondary-foreground"
                        >
                          Continue Editing
                        </Link>
                        <Link
                          to="/"
                          search={{ draft: d.id, print: "1" }}
                          aria-label={`Download ${d.title} as PDF`}
                          className="flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-cream hover:text-foreground"
                        >
                          <Download className="size-3.5" strokeWidth={1.8} /> PDF
                        </Link>
                        <select
                          aria-label="Move to folder"
                          value={d.folderId ?? ""}
                          onChange={(e) => moveDraftToFolder(d.id, e.target.value || null)}
                          className="rounded-full border border-border bg-background px-2 py-1 text-[11px]"
                        >
                          <option value="">No folder</option>
                          {ws.folders.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
